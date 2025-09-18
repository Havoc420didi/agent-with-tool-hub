// routes/index.ts - 统一路由入口

import Router from 'koa-router';
import { AgentService } from '../services/agent.service';
import { createHealthRoutes } from './health.routes';
import { createChatRoutes } from './chat.routes';
import { createToolRoutes } from './tool.routes';

// 统一API前缀配置
const API_PREFIX = '/api';

/**
 * 创建所有路由
 */
export function createAllRoutes(): Router {
  const router = new Router({ prefix: API_PREFIX });

  // 创建AgentService实例
  const agentService = new AgentService();

  // 注册各个模块的路由
  router.use(createHealthRoutes().routes());
  router.use(createChatRoutes().routes());
  router.use(createToolRoutes().routes());

  return router;
}

// 导出各个路由创建函数，方便单独使用
export { createHealthRoutes } from './health.routes';
export { createChatRoutes } from './chat.routes';
export { createToolRoutes } from './tool.routes';
