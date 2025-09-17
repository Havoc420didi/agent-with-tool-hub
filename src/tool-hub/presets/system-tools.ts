// system-tools.ts - 系统工具集合

import { z } from 'zod';
import { ToolConfig, ToolPermissionLevel, ToolSecurityLevel, createToolConfig } from '../types/tool.types';
import { ToolHelpers } from '../utils/helpers';

/**
 * 系统工具集合
 */
export class SystemTools {
  /**
   * 获取系统信息
   */
  static getSystemInfo(): ToolConfig {
    return createToolConfig({
      name: 'get_system_info',
      description: '获取系统信息',
      schema: z.object({
        include: z.array(z.enum(['os', 'node', 'memory', 'cpu', 'uptime'])).optional().describe('要包含的信息类型')
      }),
      handler: async (input: any) => {
        try {
          const { include = ['os', 'node', 'memory'] } = input;
          const info: Record<string, any> = {};

          if (include.includes('os')) {
            info.os = {
              platform: process.platform,
              arch: process.arch,
              version: process.version
            };
          }

          if (include.includes('node')) {
            info.node = {
              version: process.version,
              versions: process.versions
            };
          }

          if (include.includes('memory')) {
            const memUsage = process.memoryUsage();
            info.memory = {
              rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
              heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
              heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
              external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
            };
          }

          if (include.includes('cpu')) {
            info.cpu = {
              cpus: require('os').cpus().length,
              loadavg: require('os').loadavg()
            };
          }

          if (include.includes('uptime')) {
            info.uptime = {
              process: `${Math.round(process.uptime())} seconds`,
              system: `${Math.round(require('os').uptime())} seconds`
            };
          }

          return ToolHelpers.createSuccessResult({
            ...info,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['system', 'info', 'monitoring'],
      permissionLevel: ToolPermissionLevel.PUBLIC,
      securityLevel: ToolSecurityLevel.AUTO
    });
  }

  /**
   * 文件操作工具
   */
  static fileOperation(): ToolConfig {
    return createToolConfig({
      name: 'file_operation',
      description: '执行文件操作',
      schema: z.object({
        operation: z.enum(['read', 'write', 'exists', 'list', 'delete']).describe('操作类型'),
        path: z.string().describe('文件路径'),
        content: z.string().optional().describe('文件内容（写入时使用）'),
        encoding: z.string().optional().describe('编码格式，默认为utf8')
      }),
      handler: async (input: any) => {
        try {
          const { operation, path, content, encoding = 'utf8' } = input;
          const fs = require('fs').promises;
          const pathModule = require('path');

          let result: any;

          switch (operation) {
            case 'read':
              const fileContent = await fs.readFile(path, encoding);
              result = { content: fileContent, size: fileContent.length };
              break;

            case 'write':
              await fs.writeFile(path, content || '', encoding);
              result = { message: '文件写入成功', path };
              break;

            case 'exists':
              try {
                await fs.access(path);
                result = { exists: true, path };
              } catch {
                result = { exists: false, path };
              }
              break;

            case 'list':
              const files = await fs.readdir(path);
              result = { files, path };
              break;

            case 'delete':
              await fs.unlink(path);
              result = { message: '文件删除成功', path };
              break;

            default:
              throw new Error(`不支持的操作: ${operation}`);
          }

          return ToolHelpers.createSuccessResult(result);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['file', 'io', 'filesystem'],
      permissionLevel: ToolPermissionLevel.PUBLIC,
      securityLevel: ToolSecurityLevel.HUMAN
    });
  }

  /**
   * 环境变量工具
   */
  static environment(): ToolConfig {
    return createToolConfig({
      name: 'environment',
      description: '获取或设置环境变量',
      schema: z.object({
        action: z.enum(['get', 'set', 'list']).describe('操作类型'),
        key: z.string().optional().describe('环境变量键名'),
        value: z.string().optional().describe('环境变量值（设置时使用）')
      }),
      handler: async (input: any) => {
        try {
          const { action, key, value } = input;
          let result: any;

          switch (action) {
            case 'get':
              if (!key) {
                throw new Error('获取环境变量需要提供键名');
              }
              result = { key, value: process.env[key] || null };
              break;

            case 'set':
              if (!key || value === undefined) {
                throw new Error('设置环境变量需要提供键名和值');
              }
              process.env[key] = value;
              result = { key, value, message: '环境变量设置成功' };
              break;

            case 'list':
              const envVars: Record<string, string> = {};
              for (const [k, v] of Object.entries(process.env)) {
                if (k.startsWith('TOOL_') || k.startsWith('NODE_')) {
                  envVars[k] = v || '';
                }
              }
              result = { variables: envVars, count: Object.keys(envVars).length };
              break;

            default:
              throw new Error(`不支持的操作: ${action}`);
          }

          return ToolHelpers.createSuccessResult(result);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['environment', 'config', 'system'],
      permissionLevel: ToolPermissionLevel.ADMIN,
      securityLevel: ToolSecurityLevel.HUMAN
    });
  }

  /**
   * 日志工具
   */
  static logging(): ToolConfig {
    return createToolConfig({
      name: 'logging',
      description: '记录日志信息',
      schema: z.object({
        level: z.enum(['debug', 'info', 'warn', 'error']).describe('日志级别'),
        message: z.string().describe('日志消息'),
        data: z.any().optional().describe('附加数据'),
        timestamp: z.boolean().optional().describe('是否包含时间戳，默认为true')
      }),
      handler: async (input: any) => {
        try {
          const { level, message, data, timestamp = true } = input;
          
          const logEntry = {
            level,
            message,
            data,
            timestamp: timestamp ? new Date().toISOString() : undefined
          };

          // 输出到控制台
          (console as any)[level](`[${level.toUpperCase()}] ${message}`, data || '');

          return ToolHelpers.createSuccessResult({
            ...logEntry,
            logged: true
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['logging', 'debug', 'monitoring'],
      permissionLevel: ToolPermissionLevel.PUBLIC,
      securityLevel: ToolSecurityLevel.AUTO
    });
  }

  /**
   * 进程管理工具
   */
  static processManagement(): ToolConfig {
    return createToolConfig({
      name: 'process_management',
      description: '管理进程',
      schema: z.object({
        action: z.enum(['status', 'kill', 'restart']).describe('操作类型'),
        pid: z.number().optional().describe('进程ID（kill/restart时使用）'),
        signal: z.string().optional().describe('信号类型，默认为SIGTERM')
      }),
      handler: async (input: any) => {
        try {
          const { action, pid, signal = 'SIGTERM' } = input;
          let result: any;

          switch (action) {
            case 'status':
              result = {
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                platform: process.platform,
                version: process.version
              };
              break;

            case 'kill':
              if (!pid) {
                throw new Error('终止进程需要提供进程ID');
              }
              process.kill(pid, signal as any);
              result = { message: `进程 ${pid} 已终止`, signal };
              break;

            case 'restart':
              if (!pid) {
                throw new Error('重启进程需要提供进程ID');
              }
              process.kill(pid, 'SIGTERM');
              // 注意：实际重启需要外部进程管理器
              result = { message: `进程 ${pid} 重启信号已发送` };
              break;

            default:
              throw new Error(`不支持的操作: ${action}`);
          }

          return ToolHelpers.createSuccessResult(result);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['process', 'management', 'system'],
      permissionLevel: ToolPermissionLevel.ADMIN,
      securityLevel: ToolSecurityLevel.HUMAN
    });
  }

  /**
   * 获取所有系统工具
   */
  static getAll(): ToolConfig[] {
    return [
      this.getSystemInfo(),
      this.fileOperation(),
      this.environment(),
      this.logging(),
      this.processManagement()
    ];
  }


  /**
   * 按标签获取工具  // 暂时好像没什么用
   */
  static getByTag(tag: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.tags?.includes(tag));
  }
}
