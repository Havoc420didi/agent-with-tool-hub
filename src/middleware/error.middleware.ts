import { Context, Next } from 'koa';
import Logger from '../utils/logger';

// 错误处理中间件
export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err: any) {
    Logger.error(`请求错误: ${ctx.method} ${ctx.url} - ${err.message}`);
    Logger.error(`错误堆栈: ${err.stack}`);
    
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || '内部服务器错误',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    };
  }
};

// 404 处理中间件
export const notFoundHandler = async (ctx: Context) => {
  Logger.warn(`404 - 未找到路由: ${ctx.method} ${ctx.url}`);
  
  ctx.status = 404;
  ctx.body = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `未找到路由: ${ctx.method} ${ctx.url}`
    }
  };
};
