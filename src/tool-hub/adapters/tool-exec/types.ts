// types.ts - 工具执行器类型定义

/**
 * 工具执行器接口
 */
export interface ToolExecutor {
  /** 执行器名称 */
  name: string;
  /** 框架名称 */
  framework: string;
  
  /**
   * 执行工具调用
   * @param state 状态对象
   * @returns 执行结果
   */
  invoke(state: any): Promise<any>;
  
  /**
   * 获取执行统计信息
   * @returns 统计信息
   */
  getStats(): ToolExecutionStats;
  
  /**
   * 清理资源
   */
  cleanup(): void;
}

/**
 * 工具执行统计信息
 */
export interface ToolExecutionStats {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功执行次数 */
  successfulExecutions: number;
  /** 失败执行次数 */
  failedExecutions: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime?: Date;
  /** 框架特定统计 */
  frameworkStats?: Record<string, any>;
}

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  /** 执行ID */
  executionId: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 请求ID */
  requestId?: string;
  /** 线程ID */
  threadId?: string;
  /** 额外元数据 */
  metadata?: Record<string, any>;
}


/**
 * 工具执行事件
 */
export interface ToolExecutionEvent {
  /** 事件类型 */
  type: 'started' | 'completed' | 'failed';
  /** 框架名称 */
  framework: string;
  /** 时间戳 */
  timestamp: Date;
  /** 执行上下文 */
  context?: ToolExecutionContext;
  /** 事件数据 */
  data?: any;
  /** 错误信息（失败时） */
  error?: any;
  /** 工具名称（状态管理需要） */
  toolName?: string;
  /** 是否执行成功（状态管理需要） */
  success?: boolean;
  /** 执行结果（状态管理需要） */
  result?: any;
  /** 执行时间（状态管理需要） */
  executionTime?: number;
}

/**
 * 工具执行器配置
 */
export interface ToolExecutorConfig {
  /** 是否启用统计 */
  enableStats?: boolean;
  /** 是否启用事件追踪 */
  enableEvents?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 框架特定配置 */
  frameworkConfig?: Record<string, any>;
  /** 工具状态管理配置 */
  statusManagement?: {
    /** 是否启用状态管理 */
    enabled?: boolean;
    /** 连续失败阈值（超过此次数标记为失败状态） */
    failureThreshold?: number;
    /** 失败状态持续时间（毫秒） */
    failureDuration?: number;
    /** 是否自动重新绑定工具 */
    autoRebind?: boolean;
    /** 重新绑定延迟（毫秒） */
    rebindDelay?: number;
  };
}
