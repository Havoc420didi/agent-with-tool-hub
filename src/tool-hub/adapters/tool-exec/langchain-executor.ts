// langchain-executor.ts - LangChain 工具执行器

import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ToolHub } from "../../core/tool-hub";
import { 
  ToolExecutor, 
  ToolExecutionStats, 
  ToolExecutionContext, 
  ToolExecutorConfig
} from "./types";
import { createToolExecutorLogger, Logger } from "../../utils/logger";

/**
 * LangChain 工具执行器
 * 继承 LangChain 的 ToolNode 功能，集成 tool-hub 的追踪能力
 */
export class LangChainToolExecutor extends ToolNode implements ToolExecutor {
  name = 'langchain-executor';
  framework = 'langchain';
  
  private toolHub: ToolHub;
  private executorConfig: ToolExecutorConfig;
  private stats: ToolExecutionStats;
  private executionCounter: number = 0;
  private logger: Logger;
  
  // 工具状态管理（只负责报告，不直接管理）
  
  constructor(
    toolHub: ToolHub, 
    langchainTools: any[], 
    config: ToolExecutorConfig = {}
  ) {
    // 调用父类构造函数
    super(langchainTools);
    
    this.toolHub = toolHub;
    this.executorConfig = {
      enableStats: true,
      enableEvents: true,
      enablePerformanceMonitoring: true,
      maxRetries: 0,
      timeout: 30000,
      statusManagement: {
        enabled: true,
        failureThreshold: 3,
        failureDuration: 300000, // 5分钟
        autoRebind: true,
        rebindDelay: 10000 // 10秒
      },
      ...config
    };
    
    // 初始化统计信息
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      frameworkStats: {
        langchainVersion: 'latest',
        toolCount: langchainTools.length,
        toolNames: langchainTools.map((tool: any) => tool.name || 'unknown')
      }
    };
    
    // 初始化 logger
    this.logger = createToolExecutorLogger({
      enabled: true,
      level: 'info',
      prefix: 'LangChainToolExecutor',
      timestamp: true,
      colorize: true
    });
    
    // 工具状态由 ToolHub 管理，不需要在这里初始化
  }
  
  /**
   * 执行工具调用 - 重写父类方法，添加追踪功能  // 这里就可以拦截 tool 的执行了。
   */
  async invoke(state: any): Promise<any> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    // 创建执行上下文
    const context: ToolExecutionContext = {
      executionId,
      threadId: state.threadId,
      sessionId: state.sessionId,
      metadata: {
        framework: this.framework,
        toolCount: this.stats.frameworkStats?.toolCount || 0
      }
    };
    
    try {
      // 调用父类的 invoke 方法
      const result = await this.executeWithTimeout(state);

      // 更新统计信息
      if (this.executorConfig.enableStats) {
        this.updateStats(true, Date.now() - startTime);
      }
      
      // 直接更新工具状态（简化通信）
      if (this.executorConfig.statusManagement?.enabled) {
        const toolCalls = this.extractToolCallsFromState(state);
        for (const toolCall of toolCalls) {
          this.toolHub.updateToolStatus(toolCall.name, true, result, context);
        }
      }
      
      return result;
      
    } catch (error) {
      // 更新统计信息
      if (this.executorConfig.enableStats) {
        this.updateStats(false, Date.now() - startTime);
      }
      
      // 直接更新工具状态（简化通信）
      if (this.executorConfig.statusManagement?.enabled) {
        const toolCalls = this.extractToolCallsFromState(state);
        for (const toolCall of toolCalls) {
          this.toolHub.updateToolStatus(toolCall.name, false, error, context);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * 带超时的执行
   * @description 带超时的执行，如果执行超时，则抛出错误; 如果没有超时，则 await 常规调用。
   */
  private async executeWithTimeout(state: any): Promise<any> {
    if (!this.executorConfig.timeout || this.executorConfig.timeout <= 0) {
      return await super.invoke(state);
    }
    
    return Promise.race([
      super.invoke(state),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`工具执行超时: ${this.executorConfig.timeout}ms`)), this.executorConfig.timeout)
      )
    ]);
  }
  
  /**
   * 更新统计信息
   */
  private updateStats(success: boolean, executionTime: number): void {
    this.stats.totalExecutions++;
    
    if (success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }
    
    // 更新平均执行时间
    this.stats.averageExecutionTime = 
      (this.stats.averageExecutionTime * (this.stats.totalExecutions - 1) + executionTime) / 
      this.stats.totalExecutions;
    
    this.stats.lastExecutionTime = new Date();
    
    // 更新框架特定统计
    if (this.stats.frameworkStats) {
      this.stats.frameworkStats.lastExecutionTime = this.stats.lastExecutionTime;
      this.stats.frameworkStats.totalExecutionTime = 
        (this.stats.frameworkStats.totalExecutionTime || 0) + executionTime;
    }
  }
  
  // 移除了复杂的事件系统，直接调用状态更新方法
  
  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `langchain_exec_${Date.now()}_${++this.executionCounter}`;
  }
  
  /**
   * 获取执行统计信息
   */
  getStats(): ToolExecutionStats {
    return { ...this.stats };
  }
  
  /**
   * 获取详细统计信息
   */
  getDetailedStats(): ToolExecutionStats & {
    successRate: number;
    failureRate: number;
    uptime: number;
  } {
    const successRate = this.stats.totalExecutions > 0 
      ? (this.stats.successfulExecutions / this.stats.totalExecutions) * 100 
      : 0;
    
    const failureRate = this.stats.totalExecutions > 0 
      ? (this.stats.failedExecutions / this.stats.totalExecutions) * 100 
      : 0;
    
    return {
      ...this.stats,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      uptime: this.stats.lastExecutionTime 
        ? Date.now() - this.stats.lastExecutionTime.getTime() 
        : 0
    };
  }
  
  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      frameworkStats: {
        ...this.stats.frameworkStats,
        totalExecutionTime: 0
      }
    };
  }
  
  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ToolExecutorConfig>): void {
    this.executorConfig = { ...this.executorConfig, ...newConfig };
  }
  
  /**
   * 获取配置
   */
  getConfig(): ToolExecutorConfig {
    return { ...this.executorConfig };
  }
  
  /**
   * 获取工具信息
   */
  getToolInfo(): { toolCount: number; toolNames: string[] } {
    return {
      toolCount: this.stats.frameworkStats?.toolCount || 0,
      toolNames: this.stats.frameworkStats?.toolNames || []
    };
  }
  
  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理统计信息
    this.resetStats();
    
    // 清理执行计数器
    this.executionCounter = 0;
    
    // 发送清理事件
    if (this.executorConfig.enableEvents) {
      this.toolHub.publish('tool.executor.cleaned' as any, {
        framework: this.framework,
        timestamp: new Date()
      });
    }
  }
  
  /**
   * 健康检查
   */
  healthCheck(): { healthy: boolean; details: any } {
    const stats = this.getDetailedStats();
    
    return {
      healthy: stats.failureRate < 50, // 失败率低于50%认为健康
      details: {
        framework: this.framework,
        totalExecutions: stats.totalExecutions,
        successRate: stats.successRate,
        failureRate: stats.failureRate,
        averageExecutionTime: stats.averageExecutionTime,
        lastExecutionTime: stats.lastExecutionTime,
        toolCount: this.getToolInfo().toolCount
      }
    };
  }

  // ==================== 工具状态报告方法 ====================
  // 注意：工具状态管理现在通过事件驱动，不再需要直接报告方法

  /**
   * 从状态中提取工具调用信息
   */
  private extractToolCallsFromState(state: any): any[] {
    const messages = state.messages || [];
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.tool_calls) {
      return lastMessage.tool_calls;
    }
    
    return [];
  }
}
