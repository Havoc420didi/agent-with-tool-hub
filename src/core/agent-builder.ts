// agent-builder.ts - Agent 构建器，支持配置化创建 agent

import { config } from 'dotenv';
import { resolve } from 'path';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { EnhancedToolNode } from './enhanced-tool-node';
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import ToolHub, { createToolHub } from '../tool-hub/index';
import { 
  AgentConfig, 
  AgentState, 
  AgentResponse, 
  ToolCallResult, 
  ToolExecutionMode,
  ToolCallInfo 
} from './types';
import { 
  ToolExecutionStrategyFactory, 
  ToolCallManager, 
  ToolExecutionStrategy 
} from './tool-execution-strategy';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

export class AgentBuilder {
  private toolHub!: ToolHub;
  private config: AgentConfig;
  private model!: ChatOpenAI;
  private toolNode!: ToolNode;
  private workflow!: any;
  private app: any;
  private checkpointer?: MemorySaver;
  private toolCallManager!: ToolCallManager;
  private toolExecutionStrategy!: ToolExecutionStrategy;

  constructor(config: AgentConfig) {
    this.config = config;
    this.initializeModel();
    this.initializeMemory(); // TODO ？
  }

  /**
   * 异步初始化
   */
  initialize(): void {
    this.toolHub = createToolHub();
    this.initializeToolExecutionStrategy(); // TODO
    this.initializeTools();
    this.buildWorkflow();
  }

  /**
   * 初始化工具执行策略
   */
  private initializeToolExecutionStrategy(): void {
    // 默认使用内部执行模式
    const toolExecutionConfig = this.config.toolExecutionConfig || {
      mode: ToolExecutionMode.INTERNAL,
      internalConfig: {
        enableCache: true,
        cacheTtl: 300000,
        maxRetries: 3
      }
    };

    // 为内部执行模式提供 ToolExecutor 实例
    const toolExecutor = this.toolHub.getExecutor();
    this.toolExecutionStrategy = ToolExecutionStrategyFactory.createStrategy(toolExecutionConfig, toolExecutor);
    this.toolCallManager = new ToolCallManager(this.toolExecutionStrategy);
  }


  /**
   * 初始化模型
   */
  private initializeModel(): void {
    this.model = new ChatOpenAI({
      model: this.config.model.name,
      temperature: this.config.model.temperature || 0,
      configuration: {
        baseURL: this.config.model.baseURL || process.env.OPENAI_BASE_URL,
        apiKey: this.config.model.apiKey || process.env.OPENAI_API_KEY,
      }
    });
  }

  /**
   * 初始化工具
   */
  private initializeTools(): void {
    // 注册自定义工具
    if (this.config.tools && this.config.tools.length > 0) {
      this.toolHub.registerBatch(this.config.tools);
    }

    // 使用 ToolHub 导出工具为 LangChain 格式
    const langchainTools = this.toolHub.exportTools('langchain');

    // 绑定工具到模型
    this.model = this.model.bindTools(langchainTools) as ChatOpenAI;

    // 创建增强的工具节点
    this.toolNode = new EnhancedToolNode(
      langchainTools,
      this.config.toolExecutionConfig?.mode || ToolExecutionMode.INTERNAL
    );
  }

  /**
   * 初始化内存 // TODO LG 的 Mem 机制？
   */
  private initializeMemory(): void {
    if (this.config.memory?.enabled) {
      this.checkpointer = new MemorySaver();
    }
  }

  /**
   * 构建工作流
   */
  private buildWorkflow(): void {
    // 定义是否继续的条件函数
    const shouldContinue = (state: AgentState) => {
      const { messages } = state;
      const lastMessage = messages[messages.length - 1] as AIMessage;
      
      // 如果 LLM 进行了工具调用，则路由到 "tools" 节点
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      // 否则停止（回复用户）
      return END;
    };

    // 定义调用模型的函数
    const callModel = async (state: AgentState) => {
      const { messages } = state;
      const response = await this.model.invoke(messages);
      return { messages: [response] };
    };

    // 定义工具执行函数
    const executeTools = async (state: AgentState) => {
      const { messages } = state;
      const lastMessage = messages[messages.length - 1] as AIMessage;
      
      if (!lastMessage.tool_calls?.length) {
        return { messages: [] };
      }

      const toolMessages: ToolMessage[] = [];
      const executionMode = this.config.toolExecutionConfig?.mode || ToolExecutionMode.INTERNAL;

      for (const toolCall of lastMessage.tool_calls) {
        try {
          // 创建工具调用信息
          const toolCallInfo = this.toolCallManager.createToolCall(
            toolCall.name,
            toolCall.args,
            `调用工具: ${toolCall.name}`,
            state.metadata?.threadId
          );

          // 获取工具配置
          const toolConfig = this.toolHub.get(toolCall.name);
          if (!toolConfig) {
            throw new Error(`工具 ${toolCall.name} 未找到`);
          }

          console.log(`🔧 工具执行模式: ${toolCall.name} -> ${executionMode}`);

          // 直接根据 mode 字段控制执行方式
          if (executionMode === ToolExecutionMode.OUTSIDE) {
            // 外部执行模式：下发工具调用到请求端
            toolCallInfo.status = 'pending';
            
            // 创建工具消息，包含工具调用信息供外部执行
            const toolMessage = new ToolMessage({
              content: JSON.stringify({
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                toolArgs: toolCall.args,
                status: 'pending',
                message: '工具调用已下发，等待外部执行',
                executionMode: 'outside',
                waitForResult: this.config.toolExecutionConfig?.outsideConfig?.waitForResult ?? true,
                timeout: this.config.toolExecutionConfig?.outsideConfig?.timeout ?? 30000
              }),
              tool_call_id: toolCall.id || 'unknown',
            });
            
            toolMessages.push(toolMessage);
          } else {
            // 内部执行模式：直接执行工具
            const result = await this.toolCallManager.executeToolCall(
              toolCallInfo,
              toolConfig,
              state.metadata
            );

            // 创建工具消息
            const toolMessage = new ToolMessage({
              content: result.success 
                ? JSON.stringify({
                    result: result.result,
                    executionMode: 'internal'
                  }) 
                : `工具执行失败: ${result.error || '未知错误'}`,
              tool_call_id: toolCall.id || 'unknown',
            });
            
            toolMessages.push(toolMessage);
          }

        } catch (error) {
          // 创建错误消息
          const toolMessage = new ToolMessage({
            content: `工具执行错误: ${error instanceof Error ? error.message : String(error)}`,
            tool_call_id: toolCall.id || 'unknown',
          });
          
          toolMessages.push(toolMessage);
        }
      }

      return { messages: toolMessages };
    };

    // 创建状态图
    this.workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", this.toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue, ["tools", END])
      .addEdge("tools", "agent");

    // 编译工作流
    // INFO 
    const compileOptions: any = {};
    if (this.checkpointer) {
      compileOptions.checkpointer = this.checkpointer;
    }
    
    this.app = this.workflow.compile(compileOptions);
  }

  /**
   * 动态添加工具
   */
  addTool(toolConfig: any): void {
    this.toolHub.register(toolConfig);
    this.rebuildWorkflow();
  }

  /**
   * 动态移除工具
   */
  removeTool(toolName: string): void {
    this.toolHub.unregister(toolName);
    this.rebuildWorkflow();
  }

  /**
   * 重新构建工作流（当工具发生变化时）
   */
  private rebuildWorkflow(): void {
    // 重新绑定工具到模型
    const baseModel = new ChatOpenAI({
      model: this.config.model.name,
      temperature: this.config.model.temperature || 0,
      configuration: {
        baseURL: this.config.model.baseURL || process.env.OPENAI_BASE_URL,
        apiKey: this.config.model.apiKey || process.env.OPENAI_API_KEY,
      }
    });
    
    // 使用 ToolHub 导出工具为 LangChain 格式
    const langchainTools = this.toolHub.exportTools('langchain');
    this.model = baseModel.bindTools(langchainTools) as ChatOpenAI;

    // 重新创建工具节点
    this.toolNode = new ToolNode(langchainTools);

    // 重新构建工作流
    this.buildWorkflow();
  }

  /**
   * 调用 agent
   */
  async invoke(message: string, threadId?: string): Promise<AgentResponse> {
    const config: any = {};
    if (this.checkpointer) {
      // 如果启用了内存，必须提供 thread_id
      config.configurable = { thread_id: threadId || 'default' };
    }

    const result = await this.app.invoke({
      messages: [new HumanMessage(message)],
    }, config);

    const lastMessage = result.messages[result.messages.length - 1] as AIMessage;
    
    // 提取工具调用结果
    const toolCalls: ToolCallResult[] = [];
    if (lastMessage.tool_calls) {
      for (const toolCall of lastMessage.tool_calls) {
        const toolResult = result.messages.find(
          (msg: any) => msg.tool_call_id === toolCall.id
        ) as ToolMessage;
        
        toolCalls.push({
          toolName: toolCall.name,
          result: toolResult?.content || '',
          success: true
        });
      }
    }

    return {
      content: typeof lastMessage.content === 'string' ? lastMessage.content : '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      metadata: {
        totalMessages: result.messages.length,
        toolsUsed: toolCalls.map(tc => tc.toolName)
      }
    };
  }

  /**
   * 流式调用 agent
   */
  async *stream(message: string, threadId?: string): AsyncGenerator<AgentResponse, void, unknown> {
    const config: any = {};
    if (this.checkpointer) {
      // 如果启用了内存，必须提供 thread_id
      config.configurable = { thread_id: threadId || 'default' };
    }

    const stream = await this.app.stream(
      {
        messages: [new HumanMessage(message)],
      },
      {
        ...config,
        streamMode: "values"
      }
    );

    for await (const chunk of stream) {
      const lastMessage = chunk.messages[chunk.messages.length - 1] as AIMessage;
      
      yield {
        content: typeof lastMessage.content === 'string' ? lastMessage.content : '',
        metadata: {
          totalMessages: chunk.messages.length,
          isStreaming: true
        }
      };
    }
  }

  /**
   * 获取工具列表
   */
  getTools(): string[] {
    return this.toolHub.getEnabled().map((tool: any) => tool.name);
  }

  /**
   * 获取工具中心
   */
  getToolHub(): any {
    return this.toolHub;
  }

  /**
   * 获取配置
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * 获取待执行的工具调用（外部执行模式）
   */
  getPendingToolCalls(): ToolCallInfo[] {
    // 优先从增强工具节点获取
    if (this.toolNode instanceof EnhancedToolNode) {
      return this.toolNode.getPendingToolCalls();
    }
    return this.toolCallManager.getPendingToolCalls();
  }

  /**
   * 处理外部工具执行结果
   */
  async handleOutsideToolResult(toolCallId: string, result: any): Promise<void> {
    // 优先使用增强工具节点
    if (this.toolNode instanceof EnhancedToolNode) {
      this.toolNode.handleExternalToolResult(toolCallId, result);
    } else {
      const toolCall = this.toolCallManager.getPendingToolCalls().find(tc => tc.id === toolCallId);
      if (toolCall) {
        await this.toolCallManager.handleToolCallResult(toolCall, result);
      }
    }
  }

  /**
   * 获取工具执行统计
   */
  getToolExecutionStats(): any {
    if (this.toolNode instanceof EnhancedToolNode) {
      return this.toolNode.getExecutionStats();
    }
    return {
      executionMode: this.config.toolExecutionConfig?.mode || ToolExecutionMode.INTERNAL,
      pendingCalls: this.toolCallManager.getPendingToolCalls().length
    };
  }

  /**
   * 清除待执行的工具调用
   */
  clearPendingToolCalls(): void {
    if (this.toolNode instanceof EnhancedToolNode) {
      this.toolNode.clearPendingToolCalls();
    }
  }


  /**
   * 手动设置工具执行模式
   */
  setToolExecutionMode(mode: ToolExecutionMode): void {
    if (this.config.toolExecutionConfig) {
      this.config.toolExecutionConfig.mode = mode;
    } else {
      this.config.toolExecutionConfig = { mode };
    }
    
    // 重新初始化工具执行策略
    this.initializeToolExecutionStrategy();
  }

  /**
   * 设置外部执行配置
   */
  setOutsideConfig(config: { waitForResult?: boolean; timeout?: number; callbackUrl?: string }): void {
    if (!this.config.toolExecutionConfig) {
      this.config.toolExecutionConfig = { mode: ToolExecutionMode.INTERNAL };
    }
    
    this.config.toolExecutionConfig.outsideConfig = config;
  }

  /**
   * 设置内部执行配置
   */
  setInternalConfig(config: { enableCache?: boolean; cacheTtl?: number; maxRetries?: number }): void {
    if (!this.config.toolExecutionConfig) {
      this.config.toolExecutionConfig = { mode: ToolExecutionMode.INTERNAL };
    }
    
    this.config.toolExecutionConfig.internalConfig = config;
  }

  /**
   * 获取工具执行策略
   */
  getToolExecutionStrategy(): string {
    return this.toolExecutionStrategy.getStrategyName();
  }

  /**
   * 切换工具执行模式
   */
  async switchToolExecutionMode(config: any): Promise<void> {
    this.config.toolExecutionConfig = config;
    this.initializeToolExecutionStrategy();
    this.buildWorkflow();
  }
}

// 便捷的工厂函数
export function createAgent(config: AgentConfig): AgentBuilder {
  return new AgentBuilder(config);
}

// 创建默认 agent
export function createDefaultAgent(): AgentBuilder {
  return new AgentBuilder({
    model: {
      name: "deepseek-chat",
      temperature: 0
    },
    memory: {
      enabled: true
    },
    streaming: true
  });
}
