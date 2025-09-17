// generic-adapter.ts - 通用适配器

import { 
  FrameworkAdapter, 
  AdapterConfig, 
  FrameworkTool 
} from '../types/adapter.types';
import { ToolConfig, ToolResult } from '../types/tool.types';

/**
 * 通用适配器 - 适用于任何框架
 */
export class GenericAdapter implements FrameworkAdapter {
  name = 'generic';
  version = '1.0.0';
  supportedFrameworks = ['*']; // 支持所有框架

  private tools: FrameworkTool[] = [];
  private config: AdapterConfig;

  constructor(config: AdapterConfig = { type: 'generic' }) {
    this.config = config;
  }

  /**
   * 转换工具配置为通用工具
   */
  convertTool(config: ToolConfig): FrameworkTool {
    return {
      name: config.name,
      description: config.description,
      execute: async (input: any) => {
        try {
          const result = await config.handler(input);
          return result.success ? result.data : result.error || '工具执行失败';
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : String(error));
        }
      },
      schema: config.schema,
      metadata: {
        tags: config.tags,
        enabled: config.enabled !== false,
        ...config.config
      }
    };
  }

  /**
   * 批量转换工具
   */
  convertTools(configs: ToolConfig[]): FrameworkTool[] {
    return configs.map(config => this.convertTool(config));
  }

  /**
   * 执行工具
   */
  async executeTool(tool: FrameworkTool, input: any): Promise<ToolResult> {
    try {
      const result = await tool.execute(input);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 验证工具配置
   */
  validateTool(config: ToolConfig): boolean | string {
    if (!config.name || typeof config.name !== 'string') {
      return '工具名称必须是非空字符串';
    }

    if (!config.description || typeof config.description !== 'string') {
      return '工具描述必须是非空字符串';
    }

    if (!config.handler || typeof config.handler !== 'function') {
      return '工具处理器必须是函数';
    }

    return true;
  }

  /**
   * 获取工具列表
   */
  getTools(): FrameworkTool[] {
    return [...this.tools];
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.tools = [];
  }
}

/**
 * OpenAI 适配器
 */
export class OpenAIAdapter implements FrameworkAdapter {
  name = 'openai';
  version = '1.0.0';
  supportedFrameworks = ['openai', 'openai-functions'];

  private tools: any[] = [];
  private config: AdapterConfig;

  constructor(config: AdapterConfig = { type: 'openai' }) {
    this.config = config;
  }

  /**
   * 转换工具配置为 OpenAI 函数格式
   */
  convertTool(config: ToolConfig): any {
    return {
      type: 'function',
      function: {
        name: config.name,
        description: config.description,
        parameters: this.convertSchemaToOpenAI(config.schema),
        ...this.getToolMetadata(config)
      }
    };
  }

  /**
   * 批量转换工具
   */
  convertTools(configs: ToolConfig[]): any[] {
    return configs.map(config => this.convertTool(config));
  }

  /**
   * 执行工具
   */
  async executeTool(tool: any, input: any): Promise<ToolResult> {
    try {
      // OpenAI 工具通常通过外部调用执行
      // 这里返回工具定义，实际执行由调用方处理
      return {
        success: true,
        data: {
          tool,
          input,
          message: '工具已准备就绪，等待外部执行'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 验证工具配置
   */
  validateTool(config: ToolConfig): boolean | string {
    if (!config.name || typeof config.name !== 'string') {
      return '工具名称必须是非空字符串';
    }

    if (!config.description || typeof config.description !== 'string') {
      return '工具描述必须是非空字符串';
    }

    if (!config.handler || typeof config.handler !== 'function') {
      return '工具处理器必须是函数';
    }

    return true;
  }

  /**
   * 获取工具列表
   */
  getTools(): any[] {
    return [...this.tools];
  }

  /**
   * 转换 Schema 为 OpenAI 格式
   */
  private convertSchemaToOpenAI(schema: any): any {
    if (!schema) {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    // 如果是 Zod schema，转换为 JSON Schema
    if (schema._def) {
      return this.zodToJsonSchema(schema);
    }

    // 如果已经是 JSON Schema 格式，直接返回
    if (schema.type && schema.properties) {
      return schema;
    }

    // 默认返回空对象
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  /**
   * 将 Zod Schema 转换为 JSON Schema
   */
  private zodToJsonSchema(schema: any): any {
    // 简化的 Zod 到 JSON Schema 转换
    // 实际项目中可以使用 zod-to-json-schema 库
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  /**
   * 获取工具元数据
   */
  private getToolMetadata(config: ToolConfig): Record<string, any> {
    const metadata: Record<string, any> = {};

    if (config.tags) {
      metadata.tags = config.tags;
    }

    return metadata;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.tools = [];
  }
}

/**
 * 通用适配器工厂
 */
export class GenericAdapterFactory {
  static createAdapter(config: AdapterConfig): FrameworkAdapter {
    switch (config.type) {
      case 'generic':
        return new GenericAdapter(config);
      case 'openai':
        return new OpenAIAdapter(config);
      default:
        throw new Error(`不支持的适配器类型: ${config.type}`);
    }
  }

  static supportedTypes = ['generic', 'openai'];

  static validateConfig(config: AdapterConfig): boolean | string {
    if (!config.type || !this.supportedTypes.includes(config.type)) {
      return `不支持的适配器类型: ${config.type}`;
    }
    return true;
  }
}
