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
 * 工具权限级别  // INFO 这个适合需求「多 role」的场景。
 */
export enum ToolPermissionLevel {
  /** 公开 - 所有用户可用 */
  PUBLIC = 'public',
  /** 管理员 - 仅管理员可用 */
  ADMIN = 'admin'
  // TODO 这里需要补充其他权限级别。
}

/**
 * 工具安全级别 // INFO 适合定义 tool 的交互安全设计。
 */
export enum ToolSecurityLevel {
  /** 自动 - 自动执行 */
  AUTO = 'auto',
  /** 人类 - 需要人类交互 */
  HUMAN = 'human',
  /** 系统 - 系统级操作; // TODO 保留这个，但是暂时不使用 */
  SYSTEM = 'system'
}

/**
 * 工具配置接口
 */
export interface ToolConfig {
  /** 工具唯一标识 */
  name: string;
  /** 工具显示名称 */
  displayName?: string;
  /** 工具描述 */
  description: string;
  /** 详细说明 */
  longDescription?: string;
  /** 工具参数模式 */
  schema: z.ZodSchema<any>;
  /** 工具执行函数 */
  handler: (input: any) => Promise<ToolResult> | ToolResult;
  
  // === 分类和标签 ===
  /** 工具标签 */
  tags: string[];
  
  // === 权限和安全 ===
  /** 权限级别，默认为 PUBLIC */
  permissionLevel?: ToolPermissionLevel;
  /** 安全级别，默认为 AUTO */
  securityLevel?: ToolSecurityLevel;

  // === 配置和依赖 ===
  /** 工具配置 */
  config?: Record<string, any>;
  /** 是否启用，默认为 true */
  enabled?: boolean;
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
  /** 按显示名称搜索 */
  displayName?: string;
  /** 按描述搜索 */
  description?: string;
  /** 按标签搜索 */
  tags?: string[];
  /** 按权限级别搜索 */
  permissionLevel?: ToolPermissionLevel;
  /** 按安全级别搜索 */
  securityLevel?: ToolSecurityLevel;
  /** 限制返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序字段 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}


/**
 * 创建工具配置的辅助函数，自动填充默认值
 */
export function createToolConfig(config: Omit<ToolConfig, 'permissionLevel' | 'securityLevel' | 'enabled'> & Partial<Pick<ToolConfig, 'permissionLevel' | 'securityLevel' | 'enabled'>>): ToolConfig {
  return {
    permissionLevel: ToolPermissionLevel.PUBLIC,
    securityLevel: ToolSecurityLevel.AUTO,
    enabled: true,
    ...config
  };
}

/**
 * 工具配置验证器
 */
export function validateToolConfig(config: ToolConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || typeof config.name !== 'string') {
    errors.push('工具名称必须是非空字符串');
  }

  if (!config.description || typeof config.description !== 'string') {
    errors.push('工具描述必须是非空字符串');
  }

  if (!config.handler || typeof config.handler !== 'function') {
    errors.push('工具处理器必须是函数');
  }

  if (!config.schema) {
    errors.push('工具模式必须定义');
  }

  if (!config.tags || !Array.isArray(config.tags)) {
    errors.push('工具标签必须是数组');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
