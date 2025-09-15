// types.ts - 定义框架中使用的类型

import { BaseMessage } from '@langchain/core/messages';
import { ToolConfig } from '../tool-hub/types/index';

// 重新导出 ToolHub 的类型定义
export type { ToolConfig } from '../tool-hub/types/index';
export type { ToolRegistry } from '../tool-hub/core/index';

/**
 * 工具执行模式枚举
 */
export enum ToolExecutionMode {
  /** 内部执行模式：工具在 agent 内部直接执行 */
  INTERNAL = 'internal',
  /** 外部执行模式：agent 只负责下发 tool-call，由外部执行，然后组织 history-message */
  OUTSIDE = 'outside'
}

/**
 * 工具执行模式配置
 */
export interface ToolExecutionConfig {
  /** 执行模式 */
  mode: ToolExecutionMode;
  /** 外部执行模式配置 */
  outsideConfig?: {
    /** 是否等待外部执行结果 */
    waitForResult?: boolean;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 外部回调 URL */
    callbackUrl?: string;
  };
  /** 内部执行模式配置 */
  internalConfig?: {
    /** 是否启用工具缓存 */
    enableCache?: boolean;
    /** 缓存 TTL（毫秒） */
    cacheTtl?: number;
    /** 最大重试次数 */
    maxRetries?: number;
  };
}

/**
 * Tool Call 信息（用于外部执行模式）
 */
export interface ToolCallInfo {
  /** 工具调用 ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  args: Record<string, any>;
  /** 工具描述 */
  description: string;
  /** 创建时间 */
  timestamp: string;
  /** 会话 ID */
  threadId?: string;
  /** 执行状态 */
  status: 'pending' | 'executing' | 'completed' | 'failed';
  /** 执行结果（如果已完成） */
  result?: any;
  /** 错误信息（如果失败） */
  error?: string;
}

// Agent 配置接口
export interface AgentConfig {
  model: {
    name: string;
    temperature?: number;
    baseURL?: string;
    apiKey?: string;
  };
  tools?: ToolConfig[];
  memory?: {
    enabled: boolean;
    threadId?: string;
  };
  streaming?: boolean;
  /** 工具执行模式配置 */
  toolExecution?: ToolExecutionConfig;
}

// Agent 状态接口
export interface AgentState {
  messages: BaseMessage[];
  metadata?: Record<string, any>;
}

// 工具调用结果接口
export interface ToolCallResult {
  toolName: string;
  result: any;
  success: boolean;
  error?: string;
}

// Agent 响应接口
export interface AgentResponse {
  content: string;
  toolCalls?: ToolCallResult[];
  metadata?: Record<string, any>;
}
