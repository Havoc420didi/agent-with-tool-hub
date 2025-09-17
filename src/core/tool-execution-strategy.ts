// tool-execution-strategy.ts - 工具执行策略管理器

import { 
  ToolExecutionMode, 
  ToolExecutionConfig, 
  ToolCallInfo, 
  ToolCallResult,
  AgentResponse 
} from './types';
import { ToolConfig } from '../tool-hub/types/index';
import { ToolExecutor } from '../tool-hub/core/tool-executor';

/**
 * 工具执行策略接口
 */
export interface ToolExecutionStrategy {
  /** 执行工具调用 */
  executeToolCall(
    toolCall: ToolCallInfo, 
    toolConfig: ToolConfig, 
    context?: any
  ): Promise<ToolCallResult>;
  
  /** 处理工具调用结果 */
  handleToolCallResult(
    toolCall: ToolCallInfo, 
    result: any
  ): Promise<void>;
  
  /** 获取策略名称 */
  getStrategyName(): string;
}

/**
 * 内部执行策略 - 工具在 agent 内部直接执行
 */
export class InternalExecutionStrategy implements ToolExecutionStrategy {
  private toolExecutor: ToolExecutor;
  private config: ToolExecutionConfig['internalConfig'];

  constructor(toolExecutor: ToolExecutor, config?: ToolExecutionConfig['internalConfig']) {
    this.toolExecutor = toolExecutor;
    this.config = config || {};
  }

  async executeToolCall(
    toolCall: ToolCallInfo, 
    toolConfig: ToolConfig, 
    context?: any
  ): Promise<ToolCallResult> {
    try {
      // 更新工具调用状态
      toolCall.status = 'executing';
      
      // 使用工具执行器执行工具，传递配置参数
      const result = await this.toolExecutor.execute(
        toolConfig,
        toolCall.args,
        {
          retries: this.config?.maxRetries || 0,
          context: {
            executionId: toolCall.id,
            userId: context?.userId,
            sessionId: context?.sessionId,
            requestId: context?.requestId
          }
        }
      );

      // 更新工具调用状态
      toolCall.status = result.success ? 'completed' : 'failed';
      toolCall.result = result.data;
      toolCall.error = result.error;

      return {
        toolName: toolCall.name,
        result: result.data,
        success: result.success,
        error: result.error
      };

    } catch (error) {
      toolCall.status = 'failed';
      toolCall.error = error instanceof Error ? error.message : String(error);
      
      return {
        toolName: toolCall.name,
        result: null,
        success: false,
        error: toolCall.error
      };
    }
  }

  async handleToolCallResult(
    toolCall: ToolCallInfo, 
    result: any
  ): Promise<void> {
    // 内部执行模式下，结果已经在 executeToolCall 中处理
    // 这里可以添加额外的后处理逻辑
    console.log(`工具 ${toolCall.name} 执行完成:`, result);
  }

  getStrategyName(): string {
    return 'internal';
  }
}

/**
 * 外部执行策略 - agent 只负责下发 tool-call
 */
export class OutsideExecutionStrategy implements ToolExecutionStrategy {
  private config: ToolExecutionConfig['outsideConfig'];
  private pendingToolCalls: Map<string, ToolCallInfo> = new Map();

  constructor(config?: ToolExecutionConfig['outsideConfig']) {
    this.config = config || {};
  }

  async executeToolCall(
    toolCall: ToolCallInfo, 
    toolConfig: ToolConfig, 
    context?: any
  ): Promise<ToolCallResult> {
    try {
      // 更新工具调用状态
      toolCall.status = 'pending';
      
      // 存储待执行的工具调用
      this.pendingToolCalls.set(toolCall.id, toolCall);
      
      // 如果是等待结果的模式，则等待外部执行完成
      if (this.config?.waitForResult) {
        return await this.waitForOutsideExecution(toolCall);
      } else {
        // 不等待结果，直接返回工具调用信息
        return {
          toolName: toolCall.name,
          result: null,
          success: true,
          error: undefined
        };
      }

    } catch (error) {
      toolCall.status = 'failed';
      toolCall.error = error instanceof Error ? error.message : String(error);
      
      return {
        toolName: toolCall.name,
        result: null,
        success: false,
        error: toolCall.error
      };
    }
  }

  async handleToolCallResult(
    toolCall: ToolCallInfo, 
    result: any
  ): Promise<void> {
    // 更新工具调用状态和结果
    toolCall.status = 'completed';
    toolCall.result = result;
    
    // 从待执行列表中移除
    this.pendingToolCalls.delete(toolCall.id);
  }

  /**
   * 等待外部执行完成
   */
  private async waitForOutsideExecution(toolCall: ToolCallInfo): Promise<ToolCallResult> {
    const timeout = this.config?.timeout || 30000; // 默认30秒超时
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (toolCall.status === 'completed') {
          clearInterval(checkInterval);
          resolve({
            toolName: toolCall.name,
            result: toolCall.result,
            success: true,
            error: undefined
          });
        } else if (toolCall.status === 'failed') {
          clearInterval(checkInterval);
          resolve({
            toolName: toolCall.name,
            result: null,
            success: false,
            error: toolCall.error
          });
        } else if (elapsed >= timeout) {
          clearInterval(checkInterval);
          toolCall.status = 'failed';
          toolCall.error = '外部执行超时';
          resolve({
            toolName: toolCall.name,
            result: null,
            success: false,
            error: '外部执行超时'
          });
        }
      }, 100); // 每100ms检查一次
    });
  }

  /**
   * 获取待执行的工具调用
   */
  getPendingToolCalls(): ToolCallInfo[] {
    return Array.from(this.pendingToolCalls.values());
  }

  /**
   * 获取特定工具调用
   */
  getToolCall(id: string): ToolCallInfo | undefined {
    return this.pendingToolCalls.get(id);
  }

  /**
   * 标记工具调用为执行中
   */
  markToolCallAsExecuting(id: string): void {
    const toolCall = this.pendingToolCalls.get(id);
    if (toolCall) {
      toolCall.status = 'executing';
    }
  }

  getStrategyName(): string {
    return 'outside';
  }
}

/**
 * 工具执行策略工厂
 */
export class ToolExecutionStrategyFactory {
  static createStrategy(
    config: ToolExecutionConfig, 
    toolExecutor?: ToolExecutor
  ): ToolExecutionStrategy {
    switch (config.mode) {
      case ToolExecutionMode.INTERNAL:
        if (!toolExecutor) {
          throw new Error('内部执行模式需要提供 ToolExecutor 实例');
        }
        return new InternalExecutionStrategy(toolExecutor, config.internalConfig);
      case ToolExecutionMode.OUTSIDE:
        return new OutsideExecutionStrategy(config.outsideConfig);
      default:
        throw new Error(`不支持的工具执行模式: ${config.mode}`);
    }
  }
}

/**
 * 工具调用管理器 - 统一管理工具调用的创建和执行
 */
export class ToolCallManager {
  private strategy: ToolExecutionStrategy;
  private toolCallCounter: number = 0;

  constructor(strategy: ToolExecutionStrategy) {
    this.strategy = strategy;
  }

  /**
   * 创建工具调用管理器
   */
  static create(
    config: ToolExecutionConfig, 
    toolExecutor?: ToolExecutor
  ): ToolCallManager {
    const strategy = ToolExecutionStrategyFactory.createStrategy(config, toolExecutor);
    return new ToolCallManager(strategy);
  }

  /**
   * 创建工具调用信息
   */
  createToolCall(
    toolName: string,
    args: Record<string, any>,
    description: string,
    threadId?: string
  ): ToolCallInfo {
    const id = `tool_call_${Date.now()}_${++this.toolCallCounter}`;
    
    return {
      id,
      name: toolName,
      args,
      description,
      timestamp: new Date().toISOString(),
      threadId,
      status: 'pending'
    };
  }

  /**
   * 执行工具调用
   */
  async executeToolCall(
    toolCall: ToolCallInfo,
    toolConfig: ToolConfig,
    context?: any
  ): Promise<ToolCallResult> {
    return await this.strategy.executeToolCall(toolCall, toolConfig, context);
  }

  /**
   * 处理工具调用结果
   */
  async handleToolCallResult(
    toolCall: ToolCallInfo,
    result: any
  ): Promise<void> {
    return await this.strategy.handleToolCallResult(toolCall, result);
  }

  /**
   * 获取策略
   */
  getStrategy(): ToolExecutionStrategy {
    return this.strategy;
  }

  /**
   * 如果是外部执行策略，获取待执行的工具调用
   */
  getPendingToolCalls(): ToolCallInfo[] {
    if (this.strategy instanceof OutsideExecutionStrategy) {
      return this.strategy.getPendingToolCalls();
    }
    return [];
  }
}
