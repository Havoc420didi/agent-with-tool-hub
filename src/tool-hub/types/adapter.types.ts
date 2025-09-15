// adapter.types.ts - 适配器相关类型定义

import { ToolConfig, ToolResult } from './tool.types';

/**
 * 框架适配器接口
 */
export interface FrameworkAdapter {
  /** 适配器名称 */
  name: string;
  /** 适配器版本 */
  version: string;
  /** 支持的框架 */
  supportedFrameworks: string[];
  
  /**
   * 将工具配置转换为框架特定的工具
   */
  convertTool(config: ToolConfig): any;
  
  /**
   * 批量转换工具
   */
  convertTools(configs: ToolConfig[]): any[];
  
  /**
   * 执行工具
   */
  executeTool(tool: any, input: any): Promise<ToolResult>;
  
  /**
   * 验证工具配置
   */
  validateTool(config: ToolConfig): boolean | string;
  
  /**
   * 获取框架特定的工具列表
   */
  getTools(): any[];
  
  /**
   * 清理资源
   */
  cleanup?(): void;
}

/**
 * 适配器配置
 */
export interface AdapterConfig {
  /** 适配器类型 */
  type: string;
  /** 框架特定配置 */
  frameworkConfig?: Record<string, any>;
  /** 转换选项 */
  conversionOptions?: Record<string, any>;
  /** 是否启用缓存 */
  enableCache?: boolean;
}

/**
 * 适配器注册信息
 */
export interface AdapterRegistration {
  adapter: FrameworkAdapter;
  config: AdapterConfig;
  registeredAt: Date;
  active: boolean;
}

/**
 * 工具转换选项
 */
export interface ToolConversionOptions {
  /** 是否保留原始配置 */
  preserveOriginal?: boolean;
  /** 是否添加元数据 */
  addMetadata?: boolean;
  /** 自定义转换器 */
  customConverters?: Record<string, (config: ToolConfig) => any>;
  /** 转换后处理 */
  postProcess?: (converted: any, original: ToolConfig) => any;
}

/**
 * 框架特定工具接口
 */
export interface FrameworkTool {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 执行函数 */
  execute: (input: any) => Promise<any>;
  /** 工具模式 */
  schema?: any;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 适配器工厂接口
 */
export interface AdapterFactory {
  /** 创建适配器 */
  createAdapter(config: AdapterConfig): FrameworkAdapter;
  
  /** 支持的适配器类型 */
  supportedTypes: string[];
  
  /** 验证配置 */
  validateConfig(config: AdapterConfig): boolean | string;
}

/**
 * 工具绑定选项
 */
export interface ToolBindingOptions {
  /** 绑定模式 */
  mode: 'replace' | 'merge' | 'append';
  /** 是否验证工具 */
  validate?: boolean;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 自定义绑定器 */
  customBinder?: (tools: any[], target: any) => any;
}
