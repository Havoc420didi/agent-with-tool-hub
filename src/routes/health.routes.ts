// health.routes.ts - 健康检查路由

import Router from 'koa-router';

/**
 * 创建健康检查路由
 */
export function createHealthRoutes(): Router {
  const router = new Router();

  // 健康检查
  router.get('/health', async (ctx) => {
    ctx.body = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    };
  });

  return router;
}
