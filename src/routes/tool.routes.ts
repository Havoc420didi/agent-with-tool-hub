// tool.routes.ts - 工具相关路由

import Router from 'koa-router';
import { ToolExecutionMode } from '../core/types';

/**
 * 创建工具路由  // INFO 暂时没什么用
 */
export function createToolRoutes(): Router {
  const router = new Router();

  // 获取工具执行模式配置示例
  router.get('/tool-execution/examples', async (ctx) => {
    try {
      const examples = {
        internal: {
          mode: ToolExecutionMode.INTERNAL,
          internalConfig: {
            enableCache: true,
            cacheTtl: 300000,
            maxRetries: 3
          },
          description: '内部执行模式：工具在 agent 内部直接执行'
        },
        outside: {
          mode: ToolExecutionMode.OUTSIDE,
          outsideConfig: {
            waitForResult: true,
            timeout: 30000,
            callbackUrl: 'https://your-external.com/api/tool-callback'
          },
          description: '外部执行模式：agent 只负责下发 tool-call，由外部执行'
        },
        outsideNoWait: {
          mode: ToolExecutionMode.OUTSIDE,
          outsideConfig: {
            waitForResult: false,
            callbackUrl: 'https://your-external.com/api/tool-callback'
          },
          description: '外部执行模式（不等待结果）：下发 tool-call 后立即返回'
        }
      };
      
      ctx.body = {
        success: true,
        data: examples
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取工具执行模式示例失败'
        }
      };
    }
  });

  return router;
}
