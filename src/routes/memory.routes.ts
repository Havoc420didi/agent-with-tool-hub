// memory.routes.ts - 记忆和历史记录相关路由

import Router from 'koa-router';
import { AgentService } from '../services/agent.service';
import Logger from '../utils/logger';

// 全局Agent服务实例，统一管理所有Agent
let agentService: AgentService;

/**
 * 初始化Agent服务
 */
function initializeAgentService(): AgentService {
  if (!agentService) {
    agentService = new AgentService();
  }
  return agentService;
}

/**
 * 设置Agent服务实例（用于与其他路由共享同一个实例）
 */
export function setAgentService(service: AgentService): void {
  agentService = service;
}

/**
 * 创建记忆路由
 */
export function createMemoryRoutes(): Router {
  const router = new Router();

  // 根据 threadId 获取完整的上下文历史记录
  router.get('/memory/thread/:threadId', async (ctx) => {
    try {
      const { threadId } = ctx.params;
      const { format = 'json', limit } = ctx.query;

      if (!threadId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'threadId 是必需的'
          }
        };
        return;
      }

      const service = initializeAgentService();
      
      // 检查Agent是否存在
      const agent = service.getAgent(threadId);
      if (!agent) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Thread ${threadId} 的Agent不存在`
          }
        };
        return;
      }

      // 获取记忆统计信息
      const memoryStats = agent.getMemoryStats();
      
      // 尝试获取历史记录
      let historyData = null;
      try {
        // 使用AgentBuilder的debugLGMemory方法获取详细历史记录
        const debugResult = await agent.debugLGMemory(threadId);
        
        if (debugResult.error) {
          historyData = {
            threadId,
            memoryStats,
            error: debugResult.error,
            message: '获取历史记录时出错'
          };
        } else {
          historyData = {
            threadId,
            memoryStats,
            checkpointerEnabled: debugResult.checkpointerEnabled,
            currentState: debugResult.currentState,
            message: '成功获取LangGraph历史记录'
          };
        }
      } catch (historyError) {
        Logger.warn(`获取历史记录失败: ${threadId}`, {
          error: historyError instanceof Error ? historyError.message : String(historyError)
        });
        historyData = {
          threadId,
          memoryStats,
          error: historyError instanceof Error ? historyError.message : String(historyError),
          message: '获取历史记录时发生异常'
        };
      }

      // 根据请求的格式返回数据
      const responseData = {
        threadId,
        memoryStats,
        history: historyData,
        timestamp: new Date().toISOString()
      };

      if (format === 'json') {
        ctx.body = {
          success: true,
          data: responseData
        };
      } else {
        // 其他格式可以在这里处理
        ctx.body = {
          success: true,
          data: responseData
        };
      }

    } catch (error) {
      Logger.error('获取记忆数据失败', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        threadId: ctx.params.threadId
      });
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: error instanceof Error ? error.message : '获取记忆数据失败'
        }
      };
    }
  });

  // 获取所有活跃的thread列表
  router.get('/memory/threads', async (ctx) => {
    try {
      const service = initializeAgentService();
      const agentsResult = await service.listAgents();
      
      if (!agentsResult.success) {
        ctx.status = 500;
        ctx.body = agentsResult;
        return;
      }
      
      const threads = (agentsResult.data || []).map(threadId => ({
        threadId,
        status: 'active',
        memoryStats: service.getAgent(threadId)?.getMemoryStats() || null
      }));
      
      ctx.body = {
        success: true,
        data: {
          totalThreads: threads.length,
          threads
        }
      };
    } catch (error) {
      Logger.error('获取thread列表失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: error instanceof Error ? error.message : '获取thread列表失败'
        }
      };
    }
  });

  // 清空特定thread的记忆
  router.delete('/memory/thread/:threadId', async (ctx) => {
    try {
      const { threadId } = ctx.params;
      const service = initializeAgentService();
      
      const result = await service.deleteAgent(threadId);
      
      if (result.success) {
        ctx.body = {
          success: true,
          data: {
            message: `Thread ${threadId} 的记忆已清空`
          }
        };
      } else {
        ctx.status = 404;
        ctx.body = result;
      }
    } catch (error) {
      Logger.error('清空记忆失败', {
        error: error instanceof Error ? error.message : String(error),
        threadId: ctx.params.threadId
      });
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: error instanceof Error ? error.message : '清空记忆失败'
        }
      };
    }
  });

  // 获取记忆统计信息
  router.get('/memory/stats', async (ctx) => {
    try {
      const service = initializeAgentService();
      const agentsResult = await service.listAgents();
      
      if (!agentsResult.success) {
        ctx.status = 500;
        ctx.body = agentsResult;
        return;
      }
      
      const threads = agentsResult.data || [];
      const stats = {
        totalThreads: threads.length,
        memoryStats: threads.map(threadId => {
          const agent = service.getAgent(threadId);
          return {
            threadId,
            ...(agent?.getMemoryStats() || {})
          };
        })
      };
      
      ctx.body = {
        success: true,
        data: stats
      };
    } catch (error) {
      Logger.error('获取记忆统计失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: error instanceof Error ? error.message : '获取记忆统计失败'
        }
      };
    }
  });

  return router;
}
