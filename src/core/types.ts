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
  /** 执行模式 - 直接控制内部还是外部执行 */
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
    /** 记忆模式：'api' 通过API传递历史，'lg' 使用LangGraph内置记忆 */
    mode?: 'api' | 'lg';
    /** 最大历史消息数量 */
    maxHistory?: number;
  };
  streaming?: boolean;
  /** 工具执行模式配置 */
  toolExecutionConfig?: ToolExecutionConfig;
  /** 系统提示词配置 */
  systemPrompt?: {
    /** 是否启用动态系统提示词 */
    enabled?: boolean;
    /** 是否包含不可用工具 */
    includeUnavailable?: boolean;
    /** 是否包含参数详情 */
    includeParameters?: boolean;
    /** 是否包含统计信息 */
    includeStatistics?: boolean;
    /** 是否包含依赖关系 */
    includeDependencies?: boolean;
    /** 自定义系统提示词前缀 */
    customPrefix?: string;
  };
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

/**
 * 工具执行决策上下文
 */
export interface ToolExecutionDecisionContext {
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  args: Record<string, any>;
  /** 用户消息 */
  userMessage?: string;
  /** 会话上下文 */
  sessionContext?: Record<string, any>;
  /** 请求元数据 */
  requestMetadata?: Record<string, any>;
  /** 当前执行模式 */
  currentMode?: ToolExecutionMode;
}

/**
 * 工具执行决策结果
 */
export interface ToolExecutionDecision {
  /** 决定的执行模式 */
  mode: ToolExecutionMode;
  /** 决策原因 */
  reason?: string;
  /** 是否需要等待结果 */
  waitForResult?: boolean;
  /** 超时时间 */
  timeout?: number;
}

/**
 * 聊天历史消息接口
 */
export interface ChatHistoryMessage {
  /** 消息类型 */
  type: 'human' | 'ai' | 'system' | 'tool';
  /** 消息内容 */
  content: string;
  /** 时间戳 */
  timestamp: string;
  /** 工具调用信息（如果是AI消息且包含工具调用） */
  toolCalls?: {
    id: string;
    name: string;
    args: Record<string, any>;
  }[];
  /** 工具结果（如果是工具消息） */
  toolResult?: any;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 聊天历史接口
 */
export interface ChatHistory {
  /** 会话ID */
  threadId: string;
  /** 消息列表 */
  messages: ChatHistoryMessage[];
  /** 创建时间 */
  createdAt: string;
  /** 最后更新时间 */
  updatedAt: string;
  /** 消息数量 */
  messageCount: number;
}

/**
 * 记忆管理接口
 */
export interface MemoryManager {
  /** 保存消息到历史记录 */
  saveMessage(threadId: string, message: ChatHistoryMessage): Promise<void>;
  /** 获取历史记录 */
  getHistory(threadId: string, limit?: number): Promise<ChatHistoryMessage[]>;
  /** 清空历史记录 */
  clearHistory(threadId: string): Promise<void>;
  /** 删除特定消息 */
  deleteMessage(threadId: string, messageId: string): Promise<boolean>;
  /** 获取会话列表 */
  getThreads(): Promise<string[]>;
  /** 导出聊天历史为指定格式 */
  exportHistory(threadId: string, format?: 'json' | 'txt' | 'md' | 'csv'): Promise<string>;
  /** 导出所有会话的历史记录 */
  exportAllHistory(format?: 'json' | 'txt' | 'md' | 'csv'): Promise<Record<string, string>>;
}

/**
 * 聊天请求接口（支持历史记录）
 */
export interface ChatRequest {
  /** 用户消息 */
  message: string;
  /** 会话ID */
  threadId?: string;
  /** 聊天历史（API模式） */
  chatHistory?: ChatHistoryMessage[];
  /** 记忆模式 */
  memoryMode?: 'api' | 'lg';
  /** 最大历史消息数量 */
  maxHistory?: number;
  /** 其他配置 */
  config?: Record<string, any>;
}
