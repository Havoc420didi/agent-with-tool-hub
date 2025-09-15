// hub.types.ts - ToolHub 相关类型定义

import { ToolConfig, ToolResult, ToolExecutionContext, ToolExecutionOptions } from './tool.types';

/**
 * ToolHub 配置
 */
export interface ToolHubConfig {
  /** 是否启用日志 */
  logging?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** 是否启用统计 */
  statistics?: boolean;
  /** 是否启用缓存 */
  caching?: boolean;
  /** 缓存配置 */
  cacheConfig?: {
    ttl: number; // 缓存生存时间（毫秒）
    maxSize: number; // 最大缓存条目数
  };
  /** 默认执行选项 */
  defaultExecutionOptions?: ToolExecutionOptions;
  /** 工具验证器 */
  validators?: Array<(config: ToolConfig) => boolean | string>;
}

/**
 * ToolHub 事件类型
 */
export type ToolHubEventType = 
  | 'tool.registered'
  | 'tool.unregistered'
  | 'tool.executed'
  | 'tool.failed'
  | 'hub.initialized'
  | 'hub.cleared';

/**
 * ToolHub 事件数据
 */
export interface ToolHubEvent {
  type: ToolHubEventType;
  timestamp: Date;
  data: any;
  context?: ToolExecutionContext;
}

/**
 * ToolHub 事件监听器
 */
export type ToolHubEventListener = (event: ToolHubEvent) => void;

/**
 * 工具执行结果（带统计信息）
 */
export interface ToolExecutionResult extends ToolResult {
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 工具名称 */
  toolName: string;
  /** 执行上下文 */
  context?: ToolExecutionContext;
  /** 是否来自缓存 */
  fromCache?: boolean;
}

/**
 * 工具注册结果
 */
export interface ToolRegistrationResult {
  success: boolean;
  toolName: string;
  error?: string;
  warnings?: string[];
}

/**
 * 批量工具注册结果
 */
export interface BatchToolRegistrationResult {
  success: number;
  failed: number;
  results: ToolRegistrationResult[];
  total: number;
}

/**
 * 工具搜索结果
 */
export interface ToolSearchResult {
  tools: ToolConfig[];
  total: number;
  hasMore: boolean;
}

/**
 * ToolHub 状态
 */
export interface ToolHubStatus {
  /** 是否已初始化 */
  initialized: boolean;
  /** 工具总数 */
  totalTools: number;
  /** 启用的工具数 */
  enabledTools: number;
  /** 最后更新时间 */
  lastUpdated: Date;
  /** 配置信息 */
  config: ToolHubConfig;
}

/**
 * 工具依赖关系
 */
export interface ToolDependency {
  /** 依赖的工具名称 */
  toolName: string;
  /** 依赖类型 */
  type: 'required' | 'optional';
  /** 版本要求 */
  version?: string;
}

/**
 * 工具元数据
 */
export interface ToolMetadata {
  /** 工具名称 */
  name: string;
  /** 工具版本 */
  version: string;
  /** 依赖关系 */
  dependencies?: ToolDependency[];
  /** 兼容性信息 */
  compatibility?: {
    frameworks: string[];
    versions: string[];
  };
  /** 许可证信息 */
  license?: string;
  /** 文档链接 */
  documentation?: string;
  /** 示例代码 */
  examples?: Array<{
    title: string;
    code: string;
    description: string;
  }>;
}
