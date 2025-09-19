// helpers.ts - 辅助函数

import { ToolConfig, ToolResult } from '../types/tool.types';

/**
 * 工具辅助函数
 */
export class ToolHelpers {
  /**
   * 生成唯一工具名称
   */
  static generateUniqueName(baseName: string, existingNames: string[]): string {
    let name = baseName;
    let counter = 1;

    while (existingNames.includes(name)) {
      name = `${baseName}_${counter}`;
      counter++;
    }

    return name;
  }

  /**
   * 验证工具名称格式
   */
  static isValidToolName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * 格式化工具名称
   */
  static formatToolName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * 创建工具结果
   */
  static createResult(success: boolean, data?: any, error?: string): ToolResult {
    return {
      success,
      data,
      error
    };
  }

  /**
   * 创建成功结果
   */
  static createSuccessResult(data: any): ToolResult {
    return this.createResult(true, data);
  }

  /**
   * 创建错误结果
   */
  static createErrorResult(error: string): ToolResult {
    return this.createResult(false, undefined, error);
  }

  /**
   * 深度克隆工具配置
   */
  static cloneToolConfig(config: ToolConfig): ToolConfig {
    return {
      ...config,
      config: config.config ? { ...config.config } : undefined
    };
  }

  /**
   * 比较工具配置是否相同
   */
  static isSameToolConfig(config1: ToolConfig, config2: ToolConfig): boolean {
    return (
      config1.name === config2.name &&
      config1.description === config2.description &&
      JSON.stringify(config1.tags) === JSON.stringify(config2.tags) &&
      JSON.stringify(config1.config) === JSON.stringify(config2.config)
    );
  }

  /**
   * 提取工具元数据
   */
  static extractMetadata(config: ToolConfig): Record<string, any> {
    return {
      name: config.name,
      description: config.description,
      tags: config.tags,
      enabled: config.enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 生成工具文档
   */
  static generateDocumentation(config: ToolConfig): string {
    const lines: string[] = [];
    
    lines.push(`# ${config.name}`);
    lines.push('');
    lines.push(config.description);
    lines.push('');

    if (config.tags && config.tags.length > 0) {
      lines.push(`**标签:** ${config.tags.join(', ')}`);
      lines.push('');
    }

    lines.push('## 参数');
    lines.push('');
    lines.push('```typescript');
    lines.push('interface Input {');
    lines.push('  // 参数定义');
    lines.push('}');
    lines.push('```');
    lines.push('');

    lines.push('## 返回值');
    lines.push('');
    lines.push('```typescript');
    lines.push('interface Result {');
    lines.push('  success: boolean;');
    lines.push('  data?: any;');
    lines.push('  error?: string;');
    lines.push('}');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * 创建工具包装器
   */
  static createWrapper(
    config: ToolConfig,
    options: {
      timeout?: number;
      retries?: number;
      onSuccess?: (result: ToolResult) => void;
      onError?: (error: Error) => void;
    } = {}
  ): ToolConfig {
    const originalHandler = config.handler;

    const wrappedHandler = async (input: any): Promise<ToolResult> => {
      try {
        const result = await originalHandler(input);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const errorResult = ToolHelpers.createErrorResult(
          error instanceof Error ? error.message : String(error)
        );
        
        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error(String(error)));
        }
        
        return errorResult;
      }
    };

    return {
      ...config,
      handler: wrappedHandler
    };
  }

  /**
   * 创建工具组合器
   */
  static createComposer(tools: ToolConfig[]): ToolConfig {
    return {
      name: 'composed_tool',
      description: '组合工具，包含多个子工具',
      schema: tools[0]?.schema || require('zod').z.object({}),
      handler: async (input: any) => {
        const results: ToolResult[] = [];
        
        for (const tool of tools) {
          try {
            const result = await tool.handler(input);
            results.push(result);
          } catch (error) {
            results.push(ToolHelpers.createErrorResult(
              error instanceof Error ? error.message : String(error)
            ));
          }
        }
        
        return ToolHelpers.createSuccessResult(results);
      },
      tags: ['composed', 'multi-tool']
    };
  }

  /**
   * 创建条件工具
   */
  static createConditionalTool(
    condition: (input: any) => boolean,
    trueTool: ToolConfig,
    falseTool: ToolConfig
  ): ToolConfig {
    return {
      name: 'conditional_tool',
      description: '条件工具，根据输入选择执行不同的子工具',
      schema: trueTool.schema,
      handler: async (input: any) => {
        const selectedTool = condition(input) ? trueTool : falseTool;
        return await selectedTool.handler(input);
      },
      tags: ['conditional', 'branching']
    };
  }

  /**
   * 创建重试工具
   */
  static createRetryTool(
    config: ToolConfig,
    maxRetries: number = 3,
    delay: number = 1000
  ): ToolConfig {
    const originalHandler = config.handler;

    const retryHandler = async (input: any): Promise<ToolResult> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalHandler(input);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
          }
        }
      }

      return ToolHelpers.createErrorResult(
        lastError?.message || '重试次数已达上限'
      );
    };

    return {
      ...config,
      name: `${config.name}_retry`,
      description: `${config.description} (支持重试)`,
      handler: retryHandler,
      tags: [...(config.tags || []), 'retry']
    };
  }
}
