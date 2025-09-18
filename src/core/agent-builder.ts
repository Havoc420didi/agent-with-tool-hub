// agent-builder.ts - Agent 构建器，支持配置化创建 agent

import { config } from 'dotenv';
import { resolve } from 'path';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
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
import { MemoryManagerImpl, createMemoryManager } from './memory-manager';
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
  private memoryManager!: MemoryManagerImpl;

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
    this.initializeMemoryManager();
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

    // 创建工具节点
    this.toolNode = new ToolNode(langchainTools);
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
   * 初始化记忆管理器
   */
  private initializeMemoryManager(): void {
    const maxHistory = this.config.memory?.maxHistory || 50;
    this.memoryManager = createMemoryManager(maxHistory);
  }

  /**
   * 构建工作流
   */
  private buildWorkflow(): void {
    // 定义是否继续的条件函数
    const shouldContinue = (state: AgentState) => {
      const { messages } = state;
      const lastMessage = messages[messages.length - 1] as AIMessage;
      
      // 如果 LLM 进行了工具调用 & 内部执行模式，则路由到 "tools" 节点
      if (lastMessage.tool_calls?.length && this.config.toolExecutionConfig?.mode === ToolExecutionMode.INTERNAL) {
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

    // 创建状态图 // INFO 非常简单的状态图，只有 agent 和 tools 两个节点。
    this.workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", this.toolNode)
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
   * 调用 agent（支持两种记忆方式）
   */
  async invoke(message: string, threadId?: string): Promise<AgentResponse>;
  async invoke(request: ChatRequest): Promise<AgentResponse>;
  async invoke(messageOrRequest: string | ChatRequest, threadId?: string): Promise<AgentResponse> {
    // 处理重载参数
    let message: string;
    let actualThreadId: string;
    let chatHistory: ChatHistoryMessage[] | undefined;
    let memoryMode: 'api' | 'lg' = 'lg';

    if (typeof messageOrRequest === 'string') {
      message = messageOrRequest;
      actualThreadId = threadId || 'default';
    } else {
      message = messageOrRequest.message;
      actualThreadId = messageOrRequest.threadId || 'default';
      chatHistory = messageOrRequest.chatHistory;
      memoryMode = messageOrRequest.memoryMode || this.config.memory?.mode || 'lg';
    }

    // 构建消息列表
    let messages: any[] = [];

    if (memoryMode === 'api' && chatHistory) {
      // API模式：使用传入的历史记录
      messages = chatHistory.map(msg => MemoryManagerImpl.toLangChainMessage(msg));
    } else if (memoryMode === 'lg' && this.checkpointer) {
      // LG模式：使用LangGraph内置记忆，不传递历史记录
      // LangGraph会自动从checkpointer中恢复历史
    }

    // 添加当前用户消息
    messages.push(new HumanMessage(message));

    const config: any = {};
    if (this.checkpointer && memoryMode === 'lg') {
      // 如果启用了LG内存，必须提供 thread_id
      config.configurable = { thread_id: actualThreadId };
    }

    // 调试输出：LG模式下的配置和消息
    if (memoryMode === 'lg') {
      console.log('🔍 LG记忆模式调试信息:');
      console.log('  - Thread ID:', actualThreadId);
      console.log('  - 配置:', JSON.stringify(config, null, 2));
      console.log('  - 当前消息数量:', messages.length);
      console.log('  - 消息内容:', messages.map(msg => ({
        type: msg.constructor.name,
        content: typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : msg.content
      })));
      console.log('  - Checkpointer状态:', this.checkpointer ? '已启用' : '未启用');
    }

    const result = await this.app.invoke({
      messages: messages,
    }, config);

    // 调试输出：LG模式下的结果
    if (memoryMode === 'lg') {
      console.log('🔍 LG记忆模式结果:');
      console.log('  - 返回消息数量:', result.messages.length);
      console.log('  - 返回消息内容:', result.messages.map((msg: any, index: number) => ({
        index,
        type: msg.constructor.name,
        content: typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : msg.content,
        tool_calls: msg.tool_calls?.length || 0
      })));
    }

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

    // 保存消息到记忆管理器（用于API模式的历史记录管理）
    if (memoryMode === 'api') {
      // 保存用户消息
      await this.memoryManager.saveMessage(actualThreadId, {
        type: 'human',
        content: message,
        timestamp: new Date().toISOString(),
        metadata: { messageId: `human_${Date.now()}` }
      });

      // 保存AI回复
      await this.memoryManager.saveMessage(actualThreadId, {
        type: 'ai',
        content: typeof lastMessage.content === 'string' ? lastMessage.content : '',
        timestamp: new Date().toISOString(),
        toolCalls: lastMessage.tool_calls?.map(tc => ({
          id: tc.id || `tool_${Date.now()}`,
          name: tc.name,
          args: tc.args
        })),
        metadata: { messageId: `ai_${Date.now()}` }
      });

      // 保存工具调用结果
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          await this.memoryManager.saveMessage(actualThreadId, {
            type: 'tool',
            content: toolCall.result,
            timestamp: new Date().toISOString(),
            toolResult: toolCall.result,
            metadata: { 
              messageId: `tool_${Date.now()}`,
              toolName: toolCall.toolName
            }
          });
        }
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
    return {
      executionMode: this.config.toolExecutionConfig?.mode || ToolExecutionMode.INTERNAL,
      pendingCalls: this.toolCallManager.getPendingToolCalls().length
    };
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
   * 获取聊天历史
   */
  async getChatHistory(threadId: string, limit?: number): Promise<ChatHistoryMessage[]> {
    return await this.memoryManager.getHistory(threadId, limit);
  }

  /**
   * 清空聊天历史
   */
  async clearChatHistory(threadId: string): Promise<void> {
    await this.memoryManager.clearHistory(threadId);
  }

  /**
   * 获取所有会话列表
   */
  async getThreads(): Promise<string[]> {
    return await this.memoryManager.getThreads();
  }

  /**
   * 获取记忆管理器
   */
  getMemoryManager(): MemoryManagerImpl {
    return this.memoryManager;
  }

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
      maxHistory: this.config.memory?.maxHistory || 50,
      stats: this.memoryManager.getStats()
    };
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
            content: typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : msg.content,
            tool_calls: msg.tool_calls?.length || 0
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
