// common-tools.ts - 常用工具集合

import { z } from 'zod';
import { ToolConfig } from '../types/tool.types';
import { ToolHelpers } from '../utils/helpers';

/**
 * 常用工具集合
 */
export class CommonTools {
  /**
   * 获取当前时间
   */
  static getTime(): ToolConfig {
    return {
      name: 'get_time',
      description: '获取当前时间',
      schema: z.object({
        timezone: z.string().optional().describe('时区，默认为本地时区'),
        format: z.string().optional().describe('时间格式，默认为 ISO 格式')
      }),
      handler: async (input: any) => {
        try {
          const now = new Date();
          const timezone = input.timezone || 'Asia/Shanghai';
          const format = input.format || 'iso';

          let timeString: string;
          switch (format) {
            case 'iso':
              timeString = now.toISOString();
              break;
            case 'locale':
              timeString = now.toLocaleString('zh-CN', { timeZone: timezone });
              break;
            case 'timestamp':
              timeString = now.getTime().toString();
              break;
            default:
              timeString = now.toISOString();
          }

          return ToolHelpers.createSuccessResult({
            time: timeString,
            timezone,
            format,
            timestamp: now.getTime()
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'system',
      tags: ['time', 'system', 'utility']
    };
  }

  /**
   * 数学计算
   */
  static calculate(): ToolConfig {
    return {
      name: 'calculate',
      description: '执行数学计算',
      schema: z.object({
        expression: z.string().describe('要计算的数学表达式'),
        precision: z.number().optional().describe('小数精度，默认为2')
      }),
      handler: async (input: any) => {
        try {
          // 简单的数学表达式计算（仅支持基本运算）
          // 注意：在生产环境中应该使用更安全的数学表达式解析器
          const expression = input.expression.replace(/[^0-9+\-*/().\s]/g, '');
          const result = eval(expression);
          const precision = input.precision || 2;
          
          return ToolHelpers.createSuccessResult({
            expression: input.expression,
            result: typeof result === 'number' ? Number(result.toFixed(precision)) : result,
            precision
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            `计算失败: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
      category: 'math',
      tags: ['math', 'calculation', 'utility']
    };
  }

  /**
   * 字符串处理
   */
  static stringProcess(): ToolConfig {
    return {
      name: 'string_process',
      description: '处理字符串操作',
      schema: z.object({
        text: z.string().describe('要处理的文本'),
        operation: z.enum(['uppercase', 'lowercase', 'reverse', 'length', 'trim']).describe('操作类型'),
        additional: z.string().optional().describe('附加参数')
      }),
      handler: async (input: any) => {
        try {
          let result: any;
          const { text, operation, additional } = input;

          switch (operation) {
            case 'uppercase':
              result = text.toUpperCase();
              break;
            case 'lowercase':
              result = text.toLowerCase();
              break;
            case 'reverse':
              result = text.split('').reverse().join('');
              break;
            case 'length':
              result = text.length;
              break;
            case 'trim':
              result = text.trim();
              break;
            default:
              throw new Error(`不支持的操作: ${operation}`);
          }

          return ToolHelpers.createSuccessResult({
            original: text,
            operation,
            result,
            length: result.length || text.length
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'text',
      tags: ['string', 'text', 'utility']
    };
  }

  /**
   * 随机数生成
   */
  static random(): ToolConfig {
    return {
      name: 'random',
      description: '生成随机数',
      schema: z.object({
        min: z.number().optional().describe('最小值，默认为0'),
        max: z.number().optional().describe('最大值，默认为100'),
        count: z.number().optional().describe('生成数量，默认为1'),
        type: z.enum(['integer', 'float']).optional().describe('类型，默认为integer')
      }),
      handler: async (input: any) => {
        try {
          const min = input.min || 0;
          const max = input.max || 100;
          const count = input.count || 1;
          const type = input.type || 'integer';

          if (min >= max) {
            throw new Error('最小值必须小于最大值');
          }

          const results: number[] = [];
          for (let i = 0; i < count; i++) {
            if (type === 'integer') {
              results.push(Math.floor(Math.random() * (max - min + 1)) + min);
            } else {
              results.push(Math.random() * (max - min) + min);
            }
          }

          return ToolHelpers.createSuccessResult({
            min,
            max,
            count,
            type,
            results: count === 1 ? results[0] : results
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'math',
      tags: ['random', 'math', 'utility']
    };
  }

  /**
   * 数据验证
   */
  static validate(): ToolConfig {
    return {
      name: 'validate',
      description: '验证数据格式',
      schema: z.object({
        data: z.any().describe('要验证的数据'),
        type: z.enum(['email', 'url', 'phone', 'json', 'number', 'string']).describe('验证类型'),
        strict: z.boolean().optional().describe('是否严格模式，默认为false')
      }),
      handler: async (input: any) => {
        try {
          const { data, type, strict = false } = input;
          let isValid = false;
          let message = '';

          switch (type) {
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              isValid = emailRegex.test(data);
              message = isValid ? '邮箱格式正确' : '邮箱格式不正确';
              break;

            case 'url':
              try {
                new URL(data);
                isValid = true;
                message = 'URL格式正确';
              } catch {
                isValid = false;
                message = 'URL格式不正确';
              }
              break;

            case 'phone':
              const phoneRegex = /^1[3-9]\d{9}$/;
              isValid = phoneRegex.test(data);
              message = isValid ? '手机号格式正确' : '手机号格式不正确';
              break;

            case 'json':
              try {
                JSON.parse(data);
                isValid = true;
                message = 'JSON格式正确';
              } catch {
                isValid = false;
                message = 'JSON格式不正确';
              }
              break;

            case 'number':
              isValid = !isNaN(Number(data));
              message = isValid ? '数字格式正确' : '数字格式不正确';
              break;

            case 'string':
              isValid = typeof data === 'string';
              message = isValid ? '字符串格式正确' : '字符串格式不正确';
              break;

            default:
              throw new Error(`不支持的验证类型: ${type}`);
          }

          return ToolHelpers.createSuccessResult({
            data,
            type,
            isValid,
            message,
            strict
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'validation',
      tags: ['validation', 'format', 'utility']
    };
  }

  /**
   * 获取所有常用工具
   */
  static getAll(): ToolConfig[] {
    return [
      this.getTime(),
      this.calculate(),
      this.stringProcess(),
      this.random(),
      this.validate()
    ];
  }

  /**
   * 按分类获取工具
   */
  static getByCategory(category: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  /**
   * 按标签获取工具
   */
  static getByTag(tag: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.tags?.includes(tag));
  }
}
