// agent-builder.ts - Agent 构建器，支持配置化创建 agent

import { config } from 'dotenv';
import { resolve } from 'path';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import ToolHub, { createToolHub } from '../tool-hub/index';
import { 
  AgentConfig, 
  AgentState, 
  AgentResponse, 
  ToolCallResult, 
  ToolExecutionMode,
  ToolCallInfo,
  ChatRequest,
  ChatHistoryMessage
} from './types';
import { 
  ToolExecutionStrategyFactory, 
  ToolCallManager, 
  ToolExecutionStrategy 
} from './tool-execution-strategy';
import { MemoryManagerImpl } from './memory-manager';
import { LangChainToolExecutor } from '../tool-hub/adapters/tool-exec/langchain-executor';
import { SystemPromptBuilder, SystemPromptOptions, SystemPromptBuildConfig } from './system-prompt-builder';
import Logger from '../utils/logger';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

export class AgentBuilder {
  private toolHub!: ToolHub;
  private config: AgentConfig;
  private model!: ChatOpenAI;
  private toolNode!: LangChainToolExecutor; // 使用 tool-hub 导出的工具执行器
  private workflow!: any;
  private app: any;
  private checkpointer?: MemorySaver;
  private toolCallManager!: ToolCallManager;
  private toolExecutionStrategy!: ToolExecutionStrategy;
  private systemPromptBuilder!: SystemPromptBuilder;
  private logger: typeof Logger;

  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = Logger;
    this.initializeModel();
    this.initializeMemory();
  }

  /**
   * 异步初始化
   */
  initialize(): void {
    this.toolHub = createToolHub();
    this.initializeToolExecutionStrategy(); // TODO
    this.initializeSystemPromptBuilder();
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
   * 初始化系统提示词构建器
   */
  private initializeSystemPromptBuilder(): void {
    this.systemPromptBuilder = new SystemPromptBuilder(this.toolHub.getRegistry());
  }

  /**
   * 初始化模型
   */
  private initializeModel(): void {
    this.logger.info('🧠 初始化 LLM 模型配置', {
      model: this.config.model.name,
      temperature: this.config.model.temperature || 0,
      baseURL: this.config.model.baseURL || process.env.OPENAI_BASE_URL,
      apiKey: this.config.model.apiKey || process.env.OPENAI_API_KEY,
    });
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
   * 构建系统提示词（统一入口）
   */
  buildSystemPrompt(buildConfig: SystemPromptBuildConfig): string {
    if (!this.systemPromptBuilder) {
      return '你是一个智能助手，可以帮助用户完成任务。';
    }

    try {
      return this.systemPromptBuilder.buildSystemPromptByKind(buildConfig);
    } catch (error) {
      this.logger.warn('构建系统提示词失败，使用默认提示词', {
        error: error instanceof Error ? error.message : String(error)
      });
      return '你是一个智能助手，可以帮助用户完成任务。';
    }
  }

  /**
   * 初始化工具
   * 只使用基于依赖关系的可用工具，确保工具调用链的完整性
   */
  private initializeTools(): void {
    // 注册自定义工具
    if (this.config.tools && this.config.tools.length > 0) {
      this.toolHub.registerBatch(this.config.tools);
    }

    // 使用 ToolHub 导出可用工具为 LangChain 格式（基于依赖关系）
    const langchainTools = this.toolHub.exportAvailableTools('langchain');

    // 绑定工具到模型
    this.model = this.model.bindTools(langchainTools) as ChatOpenAI;

    // INFO 这里 tools 的处理有两个层面；1. 提供给 LLM 的上下文；2. 提供给 toolNode 的执行器。

    // 使用 ToolHub 导出工具执行器（替代手动创建 ToolNode）
    this.toolNode = this.toolHub.exportToolExecutor('langchain', {
      enableStats: true,
      enableEvents: true,
      enablePerformanceMonitoring: true,
      maxRetries: this.config.toolExecutionConfig?.internalConfig?.maxRetries || 3,
      timeout: this.config.toolExecutionConfig?.outsideConfig?.timeout || 30000
    });

    // 如果没有可用工具，创建一个空的工具节点
    if (!this.toolNode) {
      this.toolNode = {
        invoke: async (state: any) => {
          console.log('⚠️ 没有可用的工具执行器');
          return { messages: [] };
        }
      } as any;
    }
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
      const lastMessage = messages[messages.length - 1];
      
      // 如果是工具消息（工具执行结果），需要路由到工具节点处理
      if (lastMessage instanceof ToolMessage) {
        return "tools";
      }
      
      // 如果是AI消息且包含工具调用
      if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
        if (this.config.toolExecutionConfig?.mode === ToolExecutionMode.INTERNAL) {
          // 内部执行模式：路由到工具节点执行
          return "tools";
        } else {
          // 外部执行模式：直接停止，让外部处理工具调用
          return END;
        }
      }
      
      // 否则停止（回复用户）
      return END;
    };

    // 定义调用模型的函数
    const callModel = async (state: AgentState) => {
      const { messages } = state;
      
      // 检查是否启用动态系统提示词
      const systemPromptConfig = this.config.systemPrompt;

      if (systemPromptConfig?.enabled !== false) {
        // 获取当前系统提示词（使用默认通用配置）
        const systemPrompt = this.buildSystemPrompt({
          kind: 'wechat', // INFO 不同的基本 system-prompt 定义
          config: {},
          // options: {
          //   includeUnavailable: systemPromptConfig?.includeUnavailable || false,
          //   includeParameters: systemPromptConfig?.includeParameters !== false,
          //   includeStatistics: systemPromptConfig?.includeStatistics !== false,
          //   includeDependencies: systemPromptConfig?.includeDependencies || false,
          //   customPrefix: systemPromptConfig?.customPrefix
          // }
        });

        // this.logger.info('🏵️ 系统提示词', { finalSystemPrompt: systemPrompt });
        
        // 构建包含系统提示词的消息列表
        const messagesWithSystem = [
          new SystemMessage(systemPrompt),
          ...messages
        ];
        
        const response = await this.model.invoke(messagesWithSystem);
        return { messages: [response] };
      } else {
        // 如果禁用动态系统提示词，直接使用原始消息
        const response = await this.model.invoke(messages);
        return { messages: [response] };
      }
    };

    // 创建自定义工具节点，处理外部执行模式
    const customToolNode = async (state: AgentState) => {
      const { messages } = state;
      const lastMessage = messages[messages.length - 1];
      
      // 如果是工具消息（工具执行结果），直接返回，不执行工具
      if (lastMessage instanceof ToolMessage) {
        this.logger.debug('工具节点收到工具结果消息，直接返回', {
          toolCallId: lastMessage.tool_call_id,
          content: lastMessage.content
        });
        return { messages: [] };
      }
      
      // 如果是AI消息且包含工具调用，在外部执行模式下不执行工具
      if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
        this.logger.debug('工具节点收到工具调用，外部执行模式下不执行', {
          toolCalls: lastMessage.tool_calls.length
        });
        return { messages: [] };
      }
      
      // 其他情况使用原始工具节点
      return this.toolNode.invoke(state);
    };

    // 创建状态图 // INFO 非常简单的状态图，只有 agent 和 tools 两个节点。
    this.workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", customToolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue, ["tools", END])
      .addEdge("tools", "agent");

    // 编译工作流  // INFO checkpointer 是 LG 提供了的记录 agent 状态的机制。
    const compileOptions: any = {};
    if (this.checkpointer) {
      compileOptions.checkpointer = this.checkpointer;
    }
    
    this.app = this.workflow.compile(compileOptions);
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
    
    // 使用 ToolHub 导出可用工具为 LangChain 格式
    const langchainTools = this.toolHub.exportAvailableTools('langchain');
    this.model = baseModel.bindTools(langchainTools) as ChatOpenAI;

    // 使用 ToolHub 重新导出工具执行器（替代手动创建 ToolNode）  // TODO 或许 adapter 能合并一下。
    this.toolNode = this.toolHub.exportToolExecutor('langchain', {
      enableStats: true,
      enableEvents: true,
      enablePerformanceMonitoring: true,
      maxRetries: this.config.toolExecutionConfig?.internalConfig?.maxRetries || 3,
      timeout: this.config.toolExecutionConfig?.outsideConfig?.timeout || 30000
    });

    // 如果没有可用工具，创建一个空的工具节点
    if (!this.toolNode) {
      this.toolNode = {
        invoke: async (state: any) => {
          console.log('⚠️ 没有可用的工具执行器');
          return { messages: [] };
        }
      } as any;
    }

    // 重新构建工作流
    this.buildWorkflow();
  }

  /**
   * 调用 agent（支持两种记忆方式）
   */
  async invoke(request: ChatRequest): Promise<AgentResponse> {
    // 处理重载参数
    let message: string;
    let actualThreadId: string;
    let memoryMode: 'api' | 'lg' = 'lg';

    message = request.message;
    actualThreadId = request.threadId || 'default';
    memoryMode = request.memoryMode || this.config.memory?.mode || 'lg';

    // 检查工具状态变化，如果需要则重新绑定
    this.checkAndRebindIfNeeded();

    // TEST 调试日志：输出可用工具名称
    this.logAvailableTools();

    // 构建消息列表
    let messages: any[] = [];

    if (memoryMode === 'api' && request.chatHistory) {
      // API模式：使用传入的历史记录
      messages =  request.chatHistory.map(msg => MemoryManagerImpl.toLangChainMessage(msg));
    } else if (memoryMode === 'lg' && this.checkpointer) {
      // LG模式：使用LangGraph内置记忆，不传递历史记录
      // LangGraph会自动从checkpointer中恢复历史
    }

    // 根据消息类型添加相应的消息
    const messageType = request.messageType || 'user';

    if (messageType == 'tool') {
      // 工具执行结果消息
      if (memoryMode === 'lg' && this.checkpointer) {
        // LG模式：直接从LangGraph状态中获取最近的工具调用
        try {
          // 获取当前状态以找到最近的工具调用
          const currentState = await this.app.getState({ configurable: { thread_id: actualThreadId } });
          const lastMessage = currentState.values.messages[currentState.values.messages.length - 1];
          
          if (lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            // 使用最近的工具调用ID
            const latestToolCall = lastMessage.tool_calls[lastMessage.tool_calls.length - 1];
            
            // 创建工具消息
            const toolMessage = new ToolMessage({
              content: message,
              tool_call_id: latestToolCall.id
            });
            
            messages.push(toolMessage);

            // 通信 tool-hub 管理的工具调用状态
            const toolCalls = lastMessage.tool_calls || [];
            for (const toolCall of toolCalls) {
              this.toolHub.updateToolStatus(toolCall.name, true); // 标记工具调用为完成
            }
            
            this.logger.info('LG模式工具执行结果已处理', {
              toolCallId: latestToolCall.id,
              toolName: latestToolCall.name,
              threadId: actualThreadId,
              result: message
            });
          } else {
            this.logger.warn('LG模式下未找到待执行的工具调用', {
              threadId: actualThreadId,
              message
            });
            // 作为用户消息处理
            messages.push(new HumanMessage(message));
          }
        } catch (error) {
          this.logger.error('获取LG状态失败', {
            error: error instanceof Error ? error.message : String(error),
            threadId: actualThreadId
          });
          // 作为用户消息处理
          messages.push(new HumanMessage(message));
        }
      } else {
        // API模式：使用待执行工具调用列表
        const pendingToolCalls = this.getPendingToolCalls();
        this.logger.info('🔍 待执行的工具调用', {
          pendingToolCalls
        });
        if (pendingToolCalls.length > 0) {
          // 使用最近的待执行工具调用
          const latestToolCall = pendingToolCalls[pendingToolCalls.length - 1];
          
          // 创建工具消息，直接使用 message 内容作为工具结果
          const toolMessage = new ToolMessage({
            content: message,
            tool_call_id: latestToolCall.id
          });
          
          messages.push(toolMessage);
          
          // 标记工具调用为已完成
          await this.toolCallManager.handleToolCallResult(latestToolCall, message);
          
          this.logger.info('API模式工具执行结果已处理', {
            toolCallId: latestToolCall.id,
            toolName: latestToolCall.name,
            threadId: actualThreadId,
            result: message
          });
        } else {
          this.logger.warn('收到工具执行结果但没有待执行的工具调用', {
            threadId: actualThreadId,
            message
          });
          // 如果没有待执行的工具调用，仍然作为用户消息处理
          messages.push(new HumanMessage(message));
        }
      }
    } else {
      // 用户消息
      messages.push(new HumanMessage(message));
    }

    const config: any = {};
    if (this.checkpointer && memoryMode === 'lg') {
      // 如果启用了LG内存，必须提供 thread_id
      config.configurable = { thread_id: actualThreadId };
    }

    // TEST 调试输出：LG模式下的配置和消息
    if (memoryMode === 'lg') {
      console.log('🔍 LG记忆模式调试信息:');
      console.log('  - Thread ID:', actualThreadId);
      console.log('  - Checkpointer状态:', this.checkpointer ? '已启用' : '未启用');
    }

    const result = await this.app.invoke({
      messages: messages,
    }, config);

    // TEST 调试输出：LG模式下的结果
    if (memoryMode === 'lg') {
      console.log('🔍 LG记忆模式结果:');
      console.log('  - 返回消息数量:', result.messages.length);
      console.log('  - 返回消息内容:', result.messages.map((msg: any, index: number) => ({
        index,
        type: msg.constructor.name,
        content: typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : msg.content,
        tool_calls: msg.tool_calls || []
      })));
    }

    const lastMessage = result.messages[result.messages.length - 1] as AIMessage;
    
    // 提取工具调用结果，返回给调用者
    const toolCalls: ToolCallResult[] = [];
    if (lastMessage.tool_calls) {
      for (const toolCall of lastMessage.tool_calls) {
        const toolResult = result.messages.find(
          (msg: any) => msg.tool_call_id === toolCall.id
        ) as ToolMessage;
        
        toolCalls.push({
          toolName: toolCall.name,
          result: toolResult?.content || '',
          success: true,
          // 添加工具调用的参数信息
          args: toolCall.args || {},
          id: toolCall.id,
          description: (toolCall as any).description || undefined
        });
      }
    }

    return {
      content: typeof lastMessage.content === 'string' ? lastMessage.content : '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      metadata: {
        totalMessages: result.messages.length,
        toolsUsed: toolCalls.map(tc => tc.toolName),
        threadId: actualThreadId,
        memoryMode
      }
    };
  }

  /**
   * 流式调用 agent  // TODO stream 的粒度效果还是不太好。
   */
  async *stream(message: string, threadId?: string): AsyncGenerator<AgentResponse, void, unknown> {
    // 使用 LangChain 的流式调用，尝试获得更细粒度的流式响应
    const stream = await this.model.stream([new HumanMessage(message)]);
    
    let fullContent = '';
    let buffer = '';
    
    for await (const chunk of stream) {
      if (chunk.content) {
        const content = typeof chunk.content === 'string' ? chunk.content : '';
        fullContent += content;
        
        // 尝试将内容分割成更小的块来模拟字符级流式
        buffer += content;
        
        // 按句子或短语分割，而不是按字符分割（避免过于频繁的更新）
        const sentences = buffer.split(/([。！？\n])/);
        if (sentences.length > 1) {
          // 发送除了最后一个不完整句子之外的所有内容
          const toSend = sentences.slice(0, -1).join('');
          if (toSend) {
            yield {
              content: toSend,
              metadata: {
                isStreaming: true,
                fullContent: fullContent
              }
            };
            buffer = sentences[sentences.length - 1]; // 保留最后一个不完整的句子
          }
        }
      }
    }
    
    // 发送剩余的内容
    if (buffer) {
      yield {
        content: buffer,
        metadata: {
          isStreaming: true,
          fullContent: fullContent
        }
      };
    }
  }

  /**
   * 获取工具列表（基于依赖关系的可用工具）
   */
  getTools(): string[] {
    if (!this.toolHub) {
      return [];
    }
    return this.toolHub.getAvailableTools().map((tool: any) => tool.name);
  }

  /**
   * 获取工具中心
   */
  getToolHub(): ToolHub {
    return this.toolHub;
  }

  /**
   * 获取配置
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * 获取系统提示词构建器
   */
  getSystemPromptBuilder(): SystemPromptBuilder {
    return this.systemPromptBuilder;
  }

  /**
   * 获取待执行的工具调用（外部执行模式）
   */
  getPendingToolCalls(): ToolCallInfo[] {
    return this.toolCallManager.getPendingToolCalls();
  }

  /**
   * 处理外部工具执行结果
   */
  async handleOutsideToolResult(toolCallId: string, result: any): Promise<void> {
    const toolCall = this.toolCallManager.getPendingToolCalls().find(tc => tc.id === toolCallId);
    if (toolCall) {
      await this.toolCallManager.handleToolCallResult(toolCall, result);
    }
  }

  /**
   * 获取工具执行统计
   */
  getToolExecutionStats(): any {
    const baseStats = {
      executionMode: this.config.toolExecutionConfig?.mode || ToolExecutionMode.INTERNAL,
      pendingCalls: this.toolCallManager.getPendingToolCalls().length
    };

    // 如果使用 tool-hub 导出的执行器，添加额外统计信息
    if (this.toolNode && typeof this.toolNode.getStats === 'function') {
      const toolNodeStats = this.toolNode.getStats();
      return {
        ...baseStats,
        toolNodeStats,
        toolHubStats: this.toolHub.getCacheStats()
      };
    }

    return baseStats;
  }

  /**
   * 清除待执行的工具调用
   */
  clearPendingToolCalls(): void {
    // 使用 ToolCallManager 清除待执行的工具调用
    this.toolCallManager.clearPendingToolCalls();
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

  // ==================== 记忆管理方法 ====================


  /**
   * 设置记忆模式
   */
  setMemoryMode(mode: 'api' | 'lg'): void {
    if (this.config.memory) {
      this.config.memory.mode = mode;
    } else {
      this.config.memory = { enabled: true, mode };
    }
  }

  /**
   * 获取记忆统计信息
   */
  getMemoryStats(): any {
    return {
      memoryMode: this.config.memory?.mode || 'lg',
      memoryEnabled: this.config.memory?.enabled || false,
      maxHistory: this.config.memory?.maxHistory || 50
    };
  }

  /**
   * 获取记忆管理器实例
   */
  getMemoryManager(): MemoryManagerImpl | undefined {
    // 这里需要根据实际的记忆管理器实现来返回
    // 目前返回 undefined，因为 AgentBuilder 使用的是 LangGraph 的 MemorySaver
    // 如果需要导出功能，需要实现一个适配器
    return undefined;
  }

  /**
   * 调试LG记忆状态
   */
  async debugLGMemory(threadId: string): Promise<any> {
    if (!this.checkpointer) {
      return { error: 'Checkpointer未启用' };
    }

    try {
      // 尝试获取当前状态
      const state = await this.app.getState({ configurable: { thread_id: threadId } });
      
      return {
        threadId,
        checkpointerEnabled: !!this.checkpointer,
        currentState: {
          messages: state.values?.messages?.map((msg: any, index: number) => ({
            index,
            type: msg.constructor.name,
            content: typeof msg.content === 'string' ? msg.content : msg.content,
            tool_calls: msg.tool_calls?.length || 0,
            tool_calls_detail: msg.tool_calls || [],
            id: msg.id,
            additional_kwargs: msg.additional_kwargs || {},
            response_metadata: msg.response_metadata || {}
          })) || [],
          messageCount: state.values?.messages?.length || 0,
          next: state.next || [],
          config: state.config || {}
        }
      };
    } catch (error) {
      return {
        threadId,
        error: error instanceof Error ? error.message : String(error),
        checkpointerEnabled: !!this.checkpointer
      };
    }
  }

  /**
   * 清空LG记忆状态
   */
  async clearLGMemory(threadId: string): Promise<boolean> {
    if (!this.checkpointer) {
      return false;
    }

    try {
      // 尝试更新状态为空
      await this.app.updateState(
        { configurable: { thread_id: threadId } },
        { messages: [] }
      );
      return true;
    } catch (error) {
      console.error('清空LG记忆失败:', error);
      return false;
    }
  }

  // ==================== Tool-Hub 集成方法 ====================

  /**
   * 获取工具执行器健康状态
   */
  getToolExecutorHealth(): any {
    if (this.toolNode && typeof this.toolNode.healthCheck === 'function') {
      return this.toolNode.healthCheck();
    }
    return { status: 'unknown', message: '工具执行器不支持健康检查' };
  }

  /**
   * 监听工具执行事件
   */
  onToolExecutionEvent(eventType: string, listener: (event: any) => void): void {
    this.toolHub.on(eventType as any, listener);
  }

  /**
   * 移除工具执行事件监听器
   */
  offToolExecutionEvent(eventType: string, listener: (event: any) => void): void {
    this.toolHub.off(eventType as any, listener);
  }

  /**
   * 获取工具执行器性能统计
   */
  getToolExecutorPerformanceStats(): any {
    if (this.toolNode && typeof this.toolNode.getStats === 'function') {
      const stats = this.toolNode.getStats();
      return {
        totalExecutions: stats.totalExecutions,
        successfulExecutions: stats.successfulExecutions,
        failedExecutions: stats.failedExecutions,
        averageExecutionTime: stats.averageExecutionTime,
        frameworkStats: stats.frameworkStats
      };
    }
    return null;
  }

  /**
   * 清理工具执行器资源
   */
  cleanupToolExecutor(): void {
    if (this.toolNode && typeof this.toolNode.cleanup === 'function') {
      this.toolNode.cleanup();
    }
  }

  // ==================== 调试和日志方法 ====================

  /**
   * 记录可用工具名称（调试用）
   */
  private logAvailableTools(): void {
    if (!this.toolHub) {
      console.log('🔧 可用工具: 无 (ToolHub 未初始化)');
      return;
    }

    try {
      // 获取所有可用的工具
      const allTools = this.toolHub.getAvailableTools();
      const toolNames = allTools.map(tool => tool.name);
      
      // 从 ToolHub 获取状态信息
      let statusInfo = '';
      if (this.toolHub && typeof this.toolHub.getAllToolStatuses === 'function') {
        const toolStatuses = this.toolHub.getAllToolStatuses();
        const availableTools = this.toolHub.getAvailableToolsByStatus();
        const failedTools = Array.from(toolStatuses.entries())
          .filter(([_, status]) => status.status === 'failed')
          .map(([name, _]) => name);
        
        // 获取依赖关系信息
        const dependencyInfo = this.getDependencyInfo();
        
        statusInfo = ` (可用: ${availableTools.length}, 失败: ${failedTools.length}, 根节点: ${dependencyInfo.rootTools})`;
        if (failedTools.length > 0) {
          statusInfo += ` [失败工具: ${failedTools.join(', ')}]`;
        }
        if (dependencyInfo.waitingTools.length > 0) {
          statusInfo += ` [等待依赖: ${dependencyInfo.waitingTools.join(', ')}]`;
        }
      }
      
      console.log(`🔧 可用工具 (${toolNames.length}个)${statusInfo}:`, toolNames);
      
      // 如果工具数量为0，输出警告
      if (toolNames.length === 0) {
        console.warn('⚠️  警告: 没有可用的工具！');
      }
      
    } catch (error) {
      console.error('❌ 获取工具列表失败:', error);
    }
  }

  /**
   * 获取工具状态详情（调试用）
   */
  getToolStatusDetails(): any {
    if (!this.toolHub || typeof this.toolHub.getAllToolStatuses !== 'function') {
      return { error: 'ToolHub 不支持状态查询' };
    }

    const toolStatuses = this.toolHub.getAllToolStatuses();
    const statusMap: Record<string, any> = {};
    
    for (const [toolName, status] of toolStatuses.entries()) {
      statusMap[toolName] = {
        status: status.status,
        reason: status.reason,
        consecutiveFailures: status.consecutiveFailures,
        lastUpdated: status.lastUpdated,
        shouldRebind: status.shouldRebind
      };
    }
    
    return {
      totalTools: toolStatuses.size,
      availableTools: this.toolHub.getAvailableToolsByStatus(),
      toolStatuses: statusMap
    };
  }

  /**
   * 手动重置工具状态（调试用）
   */
  resetToolStatus(toolName: string): boolean {
    if (this.toolHub && typeof this.toolHub.resetToolStatus === 'function') {
      return this.toolHub.resetToolStatus(toolName);
    }
    return false;
  }

  /**
   * 手动设置工具状态（调试用）
   */
  setToolStatus(toolName: string, status: 'available' | 'unavailable' | 'failed' | 'maintenance', reason?: string): boolean {
    if (this.toolHub && typeof this.toolHub.setToolStatus === 'function') {
      return this.toolHub.setToolStatus(toolName, status as any, reason);
    }
    return false;
  }

  /**
   * 获取依赖关系信息（调试用）
   */
  private getDependencyInfo(): { rootTools: number; waitingTools: string[] } {
    if (!this.toolHub || !this.toolHub.getRegistry) {
      return { rootTools: 0, waitingTools: [] };
    }

    try {
      const registry = this.toolHub.getRegistry();
      const dependencyGraph = registry.getDependencyGraph();
      const allTools = this.toolHub.getAvailableTools();
      
      const waitingTools: string[] = [];
      for (const tool of allTools) {
        const availabilityStatus = registry.getToolAvailabilityStatus(tool.name);
        if (!availabilityStatus.available && availabilityStatus.missingDependencies.length > 0) {
          waitingTools.push(tool.name);
        }
      }
      
      return {
        rootTools: dependencyGraph.rootNodes.size,
        waitingTools
      };
    } catch (error) {
      console.error('获取依赖关系信息失败:', error);
      return { rootTools: 0, waitingTools: [] };
    }
  }

  /**
   * 序列化工具状态（用于多轮对话持久化）
   */
  serializeToolStates(): string | null {
    if (!this.toolHub || typeof this.toolHub.serializeToolStates !== 'function') {
      return null;
    }
    return this.toolHub.serializeToolStates();
  }

  /**
   * 反序列化工具状态（用于多轮对话恢复）
   */
  deserializeToolStates(serializedData: string): boolean {
    if (!this.toolHub || typeof this.toolHub.deserializeToolStates !== 'function') {
      return false;
    }
    return this.toolHub.deserializeToolStates(serializedData);
  }

  /**
   * 获取工具状态摘要（用于调试）
   */
  getToolStatesSummary(): { [toolName: string]: { status: string; reason?: string; lastUpdated: string } } {
    if (!this.toolHub || typeof this.toolHub.getToolStatesSummary !== 'function') {
      return {};
    }
    return this.toolHub.getToolStatesSummary();
  }

  // ==================== 系统提示词管理方法 ====================

  /**
   * 设置系统提示词配置
   */
  setSystemPromptConfig(config: {
    enabled?: boolean;
    includeUnavailable?: boolean;
    includeParameters?: boolean;
    includeStatistics?: boolean;
    includeDependencies?: boolean;
    customPrefix?: string;
  }): void {
    if (!this.config.systemPrompt) {
      this.config.systemPrompt = {};
    }
    
    Object.assign(this.config.systemPrompt, config);
    
    this.logger.info('系统提示词配置已更新', {
      config: this.config.systemPrompt
    });
  }

  /**
   * 获取当前系统提示词配置
   */
  getSystemPromptConfig() {
    return { ...this.config.systemPrompt };
  }

  /**
   * 预览系统提示词（不执行）
   */
  previewSystemPrompt(options?: SystemPromptOptions): string {
    return this.buildSystemPrompt({
      kind: 'generic',
      config: {},
      options
    });
  }

  // ==================== 简化的工具绑定更新机制 ====================

  /**
   * 检查工具状态变化，如果需要则重新绑定
   */
  private checkAndRebindIfNeeded(): void {
    if (!this.toolHub) {
      return;
    }

    try {
      // 获取当前可用的工具
      const currentAvailableTools = this.toolHub.getAvailableTools();
      const currentToolNames = currentAvailableTools.map(t => t.name).sort();
      
      // 获取当前绑定的工具名称
      const boundToolNames = this.getCurrentBoundToolNames();
      
      // 比较工具列表是否发生变化
      if (this.compareToolLists(currentToolNames, boundToolNames)) {
        this.logger.info('检测到工具状态变化，重新绑定工具', {
          currentTools: currentToolNames,
          boundTools: boundToolNames
        });
        
        // 重新绑定工具
        this.rebuildWorkflow();
      }
    } catch (error) {
      this.logger.warn('检查工具状态变化失败', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取当前绑定的工具名称
   */
  private getCurrentBoundToolNames(): string[] {
    try {
      // 由于LangChain的ChatOpenAI没有直接的getBoundTools方法
      // 我们通过检查模型的bound属性来获取工具信息
      if (this.model && (this.model as any).bound) {
        const boundTools = (this.model as any).bound;
        if (Array.isArray(boundTools)) {
          return boundTools.map((tool: any) => tool.name || tool.function?.name || 'unknown').sort();
        }
      }
      
      // 如果无法获取，返回空数组
      return [];
    } catch (error) {
      this.logger.warn('无法获取当前绑定的工具名称', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * 比较两个工具列表是否相同
   */
  private compareToolLists(list1: string[], list2: string[]): boolean {
    if (list1.length !== list2.length) {
      return true;
    }
    
    for (let i = 0; i < list1.length; i++) {
      if (list1[i] !== list2[i]) {
        return true;
      }
    }
    
    return false;
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
    streaming: true,
    systemPrompt: {
      enabled: true,
      includeUnavailable: false,
      includeParameters: true,
      includeStatistics: true,
      includeDependencies: false
    }
  });
}
