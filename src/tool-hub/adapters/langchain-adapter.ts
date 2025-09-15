// langchain-adapter.ts - LangChain 适配器

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { 
  FrameworkAdapter, 
  AdapterConfig, 
  ToolConversionOptions,
  FrameworkTool 
} from '../types/adapter.types';
import { ToolConfig, ToolResult } from '../types/tool.types';

/**
 * LangChain 适配器
 */
export class LangChainAdapter implements FrameworkAdapter {
  name = 'langchain';
  version = '1.0.0';
  supportedFrameworks = ['langchain', 'langgraph'];

  private tools: any[] = [];
  private config: AdapterConfig;

  constructor(config: AdapterConfig = { type: 'langchain' }) {
    this.config = config;
  }

  /**
   * 转换工具配置为 LangChain 工具
   */
  convertTool(config: ToolConfig): any {
    try {
      const langchainTool = tool(
        async (input: any) => {
          try {
            const result = await config.handler(input);
            return result.success ? result.data : result.error || '工具执行失败';
          } catch (error) {
            return error instanceof Error ? error.message : String(error);
          }
        },
        {
          name: config.name,
          description: config.description,
          schema: this.convertSchema(config.schema),
          ...this.getToolMetadata(config)
        }
      );

      return langchainTool;
    } catch (error) {
      throw new Error(`转换 LangChain 工具失败: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      const result = await tool.invoke(input);
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

    if (!config.schema) {
      return '工具模式必须定义';
    }

    // 验证 schema 是否兼容 LangChain
    try {
      this.convertSchema(config.schema);
    } catch (error) {
      return `Schema 转换失败: ${error instanceof Error ? error.message : String(error)}`;
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
   * 绑定工具到目标对象
   */
  bindTools(target: any, tools: any[], options?: any): any {
    if (typeof target.bindTools === 'function') {
      return target.bindTools(tools);
    } else if (typeof target.bind === 'function') {
      return target.bind({ tools });
    } else {
      // 如果目标对象不支持绑定，返回包含工具的对象
      return { ...target, tools };
    }
  }

  /**
   * 转换 Zod Schema 为 LangChain 兼容格式
   */
  private convertSchema(schema: any): any {
    if (!schema) return z.object({});

    // 如果已经是 Zod schema，直接返回
    if (schema._def) {
      return schema;
    }

    // 如果是对象，尝试转换为 Zod schema
    if (typeof schema === 'object' && !schema._def) {
      const zodSchema = z.object(schema);
      return zodSchema;
    }

    // 默认返回空对象 schema
    return z.object({});
  }

  /**
   * 获取工具元数据
   */
  private getToolMetadata(config: ToolConfig): Record<string, any> {
    const metadata: Record<string, any> = {};

    if (config.category) {
      metadata.category = config.category;
    }

    if (config.tags) {
      metadata.tags = config.tags;
    }

    if (config.version) {
      metadata.version = config.version;
    }

    if (config.author) {
      metadata.author = config.author;
    }

    if (config.config) {
      metadata.config = config.config;
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
 * LangChain 适配器工厂
 */
export class LangChainAdapterFactory {
  static createAdapter(config: AdapterConfig = { type: 'langchain' }): LangChainAdapter {
    return new LangChainAdapter(config);
  }

  static supportedTypes = ['langchain', 'langgraph'];

  static validateConfig(config: AdapterConfig): boolean | string {
    if (!config.type || !this.supportedTypes.includes(config.type)) {
      return `不支持的适配器类型: ${config.type}`;
    }
    return true;
  }
}
