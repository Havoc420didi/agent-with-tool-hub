// builtin-tools.ts - 内置工具集合

import { z } from 'zod';
import { ToolConfig, ToolPermissionLevel, ToolSecurityLevel, createToolConfig } from '../types/tool.types';
import { ToolHelpers } from '../utils/helpers';

/**
 * 内置工具集合
 */
export class BuiltinTools {
  /**
   * 获取当前时间
   */
  static getTime(): ToolConfig {
    return createToolConfig({
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
      tags: ['time', 'utility', 'datetime'],
      permissionLevel: ToolPermissionLevel.PUBLIC,
      securityLevel: ToolSecurityLevel.AUTO
    });
  }

  /**
   * HTTP 请求工具
   */
  static httpRequest(): ToolConfig {
    return createToolConfig({
      name: 'http_request',
      description: '发送 HTTP 请求',
      schema: z.object({
        url: z.string().describe('请求URL'),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().describe('请求方法，默认为GET'),
        headers: z.record(z.string()).optional().describe('请求头'),
        body: z.any().optional().describe('请求体'),
        timeout: z.number().optional().describe('超时时间（毫秒），默认为5000')
      }),
      handler: async (input: any) => {
        try {
          const { url, method = 'GET', headers = {}, body, timeout = 5000 } = input;

          // 创建 AbortController 用于超时控制
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const requestOptions: RequestInit = {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            signal: controller.signal
          };

          if (body && method !== 'GET') {
            requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
          }

          const response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);

          const responseData = await response.text();
          let parsedData;
          
          try {
            parsedData = JSON.parse(responseData);
          } catch {
            parsedData = responseData;
          }

          return ToolHelpers.createSuccessResult({
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: parsedData,
            success: response.ok
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['http', 'request', 'network', 'api'],
      permissionLevel: ToolPermissionLevel.PUBLIC,
      securityLevel: ToolSecurityLevel.AUTO
    });
  }

  /**
   * 获取所有内置工具
   */
  static getAll(): ToolConfig[] {
    return [
      this.getTime(),
      this.httpRequest(),
    ];
  }


  /**
   * 按标签获取工具
   */
  static getByTag(tag: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.tags?.includes(tag));
  }
}
