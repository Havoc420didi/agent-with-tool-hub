// status.types.ts - 工具状态管理相关类型定义

/**
 * 工具状态枚举
 */
export enum ToolStatus {
  /** 可用状态 */
  AVAILABLE = 'available',
  /** 不可用状态 */
  UNAVAILABLE = 'unavailable',
  /** 失败状态 */
  FAILED = 'failed',
  /** 维护状态 */
  MAINTENANCE = 'maintenance'
}

/**
 * 工具状态信息
 */
export interface ToolStatusInfo {
  /** 工具名称 */
  toolName: string;
  /** 当前状态 */
  status: ToolStatus;
  /** 状态原因 */
  reason?: string;
  /** 最后更新时间 */
  lastUpdated: Date;
  /** 连续失败次数 */
  consecutiveFailures: number;
  /** 最后成功时间 */
  lastSuccessTime?: Date;
  /** 最后失败时间 */
  lastFailureTime?: Date;
  /** 是否应该重新绑定 */
  shouldRebind: boolean;
}

/**
 * 工具状态管理配置
 */
export interface ToolStatusManagementConfig {
  /** 是否启用状态管理 */
  enabled: boolean;
  /** 连续失败阈值（超过此次数标记为失败状态） */
  failureThreshold: number;
  /** 失败状态持续时间（毫秒） */
  failureDuration: number;
  /** 是否自动重新绑定工具 */
  autoRebind: boolean;
  /** 重新绑定延迟（毫秒） */
  rebindDelay: number;
}

/**
 * 工具状态变化事件数据
 */
export interface ToolStatusChangedEventData {
  /** 工具名称 */
  toolName: string;
  /** 旧状态 */
  oldStatus?: ToolStatus;
  /** 新状态 */
  newStatus: ToolStatus;
  /** 变化原因 */
  reason: string;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 工具可用性变化事件数据
 */
export interface ToolAvailabilityChangedEventData {
  /** 工具名称 */
  toolName: string;
  /** 是否可用 */
  available: boolean;
  /** 变化原因 */
  reason: string;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 工具重新绑定事件数据
 */
export interface ToolRebindRequiredEventData {
  /** 时间戳 */
  timestamp: Date;
  /** 重新绑定原因 */
  reason: string;
}
