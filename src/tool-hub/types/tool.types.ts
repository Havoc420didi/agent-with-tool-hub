// tool.types.ts - 工具相关类型定义

import { z } from 'zod';

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 工具配置接口
 */
export interface ToolConfig {
  /** 工具唯一标识 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具参数模式 */
  schema: z.ZodSchema<any>;
  /** 工具执行函数 */
  handler: (input: any) => Promise<ToolResult> | ToolResult;
  /** 工具分类 */
  category?: string;
  /** 工具标签 */
  tags?: string[];
  /** 工具版本 */
  version?: string;
  /** 工具作者 */
  author?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 工具配置 */
  config?: Record<string, any>;
}

/**
 * 工具注册信息
 */
export interface ToolRegistration {
  config: ToolConfig;
  registeredAt: Date;
  lastUsed?: Date;
  usageCount: number;
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
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/**
 * 工具执行选项
 */
export interface ToolExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 是否异步执行 */
  async?: boolean;
  /** 执行上下文 */
  context?: ToolExecutionContext;
}

/**
 * 工具搜索选项
 */
export interface ToolSearchOptions {
  /** 按名称搜索 */
  name?: string;
  /** 按描述搜索 */
  description?: string;
  /** 按分类搜索 */
  category?: string;
  /** 按标签搜索 */
  tags?: string[];
  /** 是否只返回启用的工具 */
  enabledOnly?: boolean;
  /** 限制返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 工具统计信息
 */
export interface ToolStats {
  /** 总工具数 */
  total: number;
  /** 启用的工具数 */
  enabled: number;
  /** 按分类统计 */
  byCategory: Record<string, number>;
  /** 按标签统计 */
  byTag: Record<string, number>;
  /** 使用频率最高的工具 */
  mostUsed: Array<{
    name: string;
    usageCount: number;
  }>;
}
