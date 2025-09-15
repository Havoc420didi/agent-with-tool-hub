// conversion.ts - 工具转换函数

import { ToolConfig } from '../types/tool.types';
import { z } from 'zod';

/**
 * 将工具配置转换为不同格式
 */
export class ToolConverter {
  /**
   * 转换为 JSON Schema
   */
  static toJsonSchema(config: ToolConfig): any {
    return {
      type: 'object',
      properties: this.convertZodToJsonSchema(config.schema),
      required: this.getRequiredFields(config.schema)
    };
  }

  /**
   * 转换为 OpenAPI 格式
   */
  static toOpenAPI(config: ToolConfig): any {
    return {
      name: config.name,
      description: config.description,
      parameters: {
        type: 'object',
        properties: this.convertZodToJsonSchema(config.schema),
        required: this.getRequiredFields(config.schema)
      },
      responses: {
        '200': {
          description: '成功响应',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'object' }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * 转换为 TypeScript 接口
   */
  static toTypeScriptInterface(config: ToolConfig): string {
    const interfaceName = `${this.pascalCase(config.name)}Input`;
    const properties = this.convertZodToTypeScript(config.schema);
    
    return `interface ${interfaceName} {
${properties}
}

interface ${this.pascalCase(config.name)}Result {
  success: boolean;
  data?: any;
  error?: string;
}`;
  }

  /**
   * 转换为函数签名
   */
  static toFunctionSignature(config: ToolConfig): string {
    const inputType = this.convertZodToTypeScript(config.schema);
    return `async function ${config.name}(input: ${inputType}): Promise<{ success: boolean; data?: any; error?: string }>`;
  }

  /**
   * 将 Zod Schema 转换为 JSON Schema
   */
  private static convertZodToJsonSchema(schema: any): any {
    if (!schema || !schema._def) {
      return {};
    }

    const properties: any = {};
    const required: string[] = [];

    if (schema._def.typeName === 'ZodObject') {
      const shape = schema._def.shape();
      
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.convertZodTypeToJsonSchema(value as any);
        
        // 检查是否必需
        if (this.isRequiredField(value as any)) {
          required.push(key);
        }
      }
    }

    return properties;
  }

  /**
   * 将 Zod 类型转换为 JSON Schema 类型
   */
  private static convertZodTypeToJsonSchema(zodType: any): any {
    const typeName = zodType._def.typeName;

    switch (typeName) {
      case 'ZodString':
        return {
          type: 'string',
          description: zodType._def.description || ''
        };
      
      case 'ZodNumber':
        return {
          type: 'number',
          description: zodType._def.description || ''
        };
      
      case 'ZodBoolean':
        return {
          type: 'boolean',
          description: zodType._def.description || ''
        };
      
      case 'ZodArray':
        return {
          type: 'array',
          items: this.convertZodTypeToJsonSchema(zodType._def.type),
          description: zodType._def.description || ''
        };
      
      case 'ZodObject':
        return {
          type: 'object',
          properties: this.convertZodToJsonSchema(zodType),
          description: zodType._def.description || ''
        };
      
      case 'ZodOptional':
        return this.convertZodTypeToJsonSchema(zodType._def.innerType);
      
      case 'ZodDefault':
        return {
          ...this.convertZodTypeToJsonSchema(zodType._def.innerType),
          default: zodType._def.defaultValue()
        };
      
      default:
        return {
          type: 'any',
          description: zodType._def.description || ''
        };
    }
  }

  /**
   * 将 Zod Schema 转换为 TypeScript 类型
   */
  private static convertZodToTypeScript(schema: any): string {
    if (!schema || !schema._def) {
      return 'any';
    }

    const typeName = schema._def.typeName;

    switch (typeName) {
      case 'ZodString':
        return 'string';
      
      case 'ZodNumber':
        return 'number';
      
      case 'ZodBoolean':
        return 'boolean';
      
      case 'ZodArray':
        const itemType = this.convertZodToTypeScript(schema._def.type);
        return `${itemType}[]`;
      
      case 'ZodObject':
        const shape = schema._def.shape();
        const properties = Object.entries(shape)
          .map(([key, value]) => {
            const tsType = this.convertZodToTypeScript(value as any);
            const isOptional = this.isOptionalField(value as any);
            return `  ${key}${isOptional ? '?' : ''}: ${tsType};`;
          })
          .join('\n');
        return `{\n${properties}\n}`;
      
      case 'ZodOptional':
        return this.convertZodToTypeScript(schema._def.innerType);
      
      case 'ZodDefault':
        return this.convertZodToTypeScript(schema._def.innerType);
      
      default:
        return 'any';
    }
  }

  /**
   * 检查字段是否必需
   */
  private static isRequiredField(zodType: any): boolean {
    const typeName = zodType._def.typeName;
    return typeName !== 'ZodOptional' && typeName !== 'ZodDefault';
  }

  /**
   * 检查字段是否可选
   */
  private static isOptionalField(zodType: any): boolean {
    const typeName = zodType._def.typeName;
    return typeName === 'ZodOptional' || typeName === 'ZodDefault';
  }

  /**
   * 获取必需字段列表
   */
  private static getRequiredFields(schema: any): string[] {
    if (!schema || !schema._def || schema._def.typeName !== 'ZodObject') {
      return [];
    }

    const shape = schema._def.shape();
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      if (this.isRequiredField(value as any)) {
        required.push(key);
      }
    }

    return required;
  }

  /**
   * 转换为 PascalCase
   */
  private static pascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * 转换为 camelCase
   */
  private static camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}

/**
 * 工具配置转换器
 */
export class ToolConfigConverter {
  /**
   * 从旧格式转换
   */
  static fromLegacyFormat(legacyConfig: any): ToolConfig {
    return {
      name: legacyConfig.name,
      description: legacyConfig.description,
      schema: legacyConfig.schema || z.object({}),
      handler: legacyConfig.handler,
      category: legacyConfig.category,
      tags: legacyConfig.tags,
      version: legacyConfig.version || '1.0.0',
      author: legacyConfig.author,
      enabled: legacyConfig.enabled !== false,
      config: legacyConfig.config || {}
    };
  }

  /**
   * 转换为简化格式
   */
  static toSimpleFormat(config: ToolConfig): any {
    return {
      name: config.name,
      description: config.description,
      category: config.category,
      tags: config.tags,
      enabled: config.enabled !== false
    };
  }

  /**
   * 合并配置
   */
  static mergeConfigs(base: ToolConfig, override: Partial<ToolConfig>): ToolConfig {
    return {
      ...base,
      ...override,
      tags: override.tags || base.tags,
      config: { ...base.config, ...override.config }
    };
  }
}
