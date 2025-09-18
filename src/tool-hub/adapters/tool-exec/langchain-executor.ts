// langchain-executor.ts - LangChain 工具执行器

import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ToolHub } from "../../core/tool-hub";
import { 
  ToolExecutor, 
  ToolExecutionStats, 
  ToolExecutionContext, 
  ToolExecutionEvent,
  ToolExecutorConfig 
} from "./types";

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
    
    // 记录执行开始事件
    if (this.executorConfig.enableEvents) {
      this.emitEvent('started', context, { state });
    }
    
    try {
      // 调用父类的 invoke 方法
      const result = await this.executeWithTimeout(state);

      // 更新统计信息
      if (this.executorConfig.enableStats) {
        this.updateStats(true, Date.now() - startTime);
      }
      
      // 记录执行成功事件
      if (this.executorConfig.enableEvents) {
        this.emitEvent('completed', context, { result });
      }
      
      return result;
      
    } catch (error) {
      // 更新统计信息
      if (this.executorConfig.enableStats) {
        this.updateStats(false, Date.now() - startTime);
      }
      
      // 记录执行失败事件
      if (this.executorConfig.enableEvents) {
        this.emitEvent('failed', context, { error });
      }
      
      throw error;
    }
  }
  
  /**
   * 带超时的执行
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
  
  /**
   * 发送事件
   */
  private emitEvent(
    type: 'started' | 'completed' | 'failed', 
    context: ToolExecutionContext, 
    data?: any
  ): void {
    const event: ToolExecutionEvent = {
      type,
      framework: this.framework,
      timestamp: new Date(),
      context,
      data,
      error: type === 'failed' ? data?.error : undefined
    };
    
    // 发送到 tool-hub 的事件系统
    this.toolHub.publish(`tool.execution.${type}` as any, event);
  }
  
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
}
