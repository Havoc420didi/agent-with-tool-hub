// main.ts - Koa.js 应用入口

import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import json from 'koa-json';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

// 导入工具和中间件
import Logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { createAllRoutes } from './routes/index';

const app = new Koa();
const router = new Router();

// 应用级错误处理
app.on('error', (err: Error, ctx: Koa.Context) => {
  Logger.error(`应用级错误: ${err.message}`);
});

// 中间件配置
app.use(errorHandler);
app.use(cors());
app.use(json());
app.use(bodyParser({
  enableTypes: ['json', 'form'],
  jsonLimit: '10mb',
  formLimit: '10mb',
}));

// 请求日志中间件
app.use(async (ctx, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  const isDev = process.env.NODE_ENV === 'development';
  const verboseLogs = process.env.VERBOSE_LOGS === 'true';
  
  if (isDev) {
    Logger.debug(`🔵 [${requestId}] 请求开始: ${ctx.method} ${ctx.url}`);
    
    if (verboseLogs) {
      Logger.debug(`📋 [${requestId}] Headers: ${JSON.stringify(ctx.headers, null, 2)}`);
      
      if (ctx.request.body && Object.keys(ctx.request.body).length > 0) {
        Logger.debug(`📦 [${requestId}] Body: ${JSON.stringify(ctx.request.body, null, 2)}`);
      }
      
      if (ctx.query && Object.keys(ctx.query).length > 0) {
        Logger.debug(`🔍 [${requestId}] Query: ${JSON.stringify(ctx.query, null, 2)}`);
      }
    }
  }
  
  await next();
  
  const duration = Date.now() - start;
  Logger.http(`${ctx.method} ${ctx.url} - ${ctx.status} - ${duration}ms`);
  
  if (isDev && verboseLogs && ctx.body) {
    Logger.debug(`📤 [${requestId}] Response: ${JSON.stringify(ctx.body, null, 2)}`);
  }
});

// 根路径
router.get('/', (ctx) => {
  ctx.body = {
    success: true,
    data: {
      name: 'LangGraph Agent API',
      version: '0.0.1',
      description: '基于 Koa.js + TypeScript + Rspack 的简洁框架',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        agents: '/api/agents'
      }
    }
  };
});

// 创建所有路由
const allRoutes = createAllRoutes();

// 注册路由
app.use(router.routes());
app.use(router.allowedMethods());
app.use(allRoutes.routes());
app.use(allRoutes.allowedMethods());

// 404 处理
app.use(notFoundHandler);

// 启动服务器
const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '127.0.0.1';

const server = app.listen(port, host, () => {
  Logger.info('🚀 LangGraph Agent API 服务器启动成功!');
  Logger.info(`📍 服务地址: http://${host}:${port}`);
  Logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`⏰ 启动时间: ${new Date().toISOString()}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  Logger.info('收到 SIGTERM 信号，开始优雅关闭服务器...');
  server.close(() => {
    Logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  Logger.info('收到 SIGINT 信号，开始优雅关闭服务器...');
  server.close(() => {
    Logger.info('服务器已关闭');
    process.exit(0);
  });
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  Logger.error(`未捕获异常: ${error.message}`);
  Logger.error(`错误堆栈: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error(`未处理的 Promise 拒绝: ${reason}`);
  Logger.error(`Promise: ${promise}`);
});

export default server;
