// memory.routes.ts - 记忆管理路由

import Router from 'koa-router';
import { MemoryService } from '../services/memory.service';

/**
 * 创建记忆管理路由 // INFO 暂时没什么用
 */
export function createMemoryRoutes(memoryService: MemoryService): Router {
  const router = new Router();

  // ==================== 基本记忆管理 API ====================

  // 获取聊天历史
  router.get('/:agentId/history/:threadId', async (ctx) => {
    try {
      const { agentId, threadId } = ctx.params;
      const { limit } = ctx.query;
      
      const result = await memoryService.getChatHistory(
        agentId, 
        threadId, 
        limit ? parseInt(limit as string) : undefined
      );
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取聊天历史失败'
        }
      };
    }
  });

  // 清空聊天历史
  router.delete('/:agentId/history/:threadId', async (ctx) => {
    try {
      const { agentId, threadId } = ctx.params;
      
      const result = await memoryService.clearChatHistory(agentId, threadId);
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '清空聊天历史失败'
        }
      };
    }
  });

  // 获取会话列表
  router.get('/:agentId/threads', async (ctx) => {
    try {
      const { agentId } = ctx.params;
      
      const result = await memoryService.getThreads(agentId);
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取会话列表失败'
        }
      };
    }
  });

  // 设置记忆模式
  router.post('/:agentId/mode', async (ctx) => {
    try {
      const { agentId } = ctx.params;
      const { mode } = ctx.request.body as any;
      
      if (!mode || !['api', 'lg'].includes(mode)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'mode 必须是 "api" 或 "lg"'
          }
        };
        return;
      }
      
      const result = await memoryService.setMemoryMode(agentId, mode);
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '设置记忆模式失败'
        }
      };
    }
  });

  // 获取记忆统计信息
  router.get('/:agentId/stats', async (ctx) => {
    try {
      const { agentId } = ctx.params;
      
      const result = await memoryService.getMemoryStats(agentId);
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取记忆统计失败'
        }
      };
    }
  });

  // ==================== 扩展记忆管理 API ====================

  // 删除特定消息
  router.delete('/:agentId/history/:threadId/message/:messageId', async (ctx) => {
    try {
      const { agentId, threadId, messageId } = ctx.params;
      
      const result = await memoryService.deleteMessage(agentId, threadId, messageId);
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '删除消息失败'
        }
      };
    }
  });

  // 获取所有Agent的记忆统计
  router.get('/stats/all', async (ctx) => {
    try {
      const result = await memoryService.getAllMemoryStats();
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取所有记忆统计失败'
        }
      };
    }
  });

  // 清空所有记忆
  router.delete('/clear-all', async (ctx) => {
    try {
      const result = await memoryService.clearAllMemory();
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '清空所有记忆失败'
        }
      };
    }
  });

  // 导出聊天历史
  router.get('/:agentId/history/:threadId/export', async (ctx) => {
    try {
      const { agentId, threadId } = ctx.params;
      const { format = 'json' } = ctx.query;
      
      const result = await memoryService.exportChatHistory(
        agentId, 
        threadId, 
        format as 'json' | 'txt'
      );
      
      if (result.success && result.data) {
        ctx.set('Content-Type', format === 'json' ? 'application/json' : 'text/plain');
        ctx.set('Content-Disposition', `attachment; filename="chat-history-${threadId}.${format}"`);
        ctx.body = result.data.content;
      } else {
        ctx.body = result;
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '导出聊天历史失败'
        }
      };
    }
  });

  // 导入聊天历史
  router.post('/:agentId/history/:threadId/import', async (ctx) => {
    try {
      const { agentId, threadId } = ctx.params;
      const { historyData } = ctx.request.body as any;
      
      if (!Array.isArray(historyData)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'historyData 必须是数组格式'
          }
        };
        return;
      }
      
      const result = await memoryService.importChatHistory(agentId, threadId, historyData);
      
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '导入聊天历史失败'
        }
      };
    }
  });

  // 记忆模式示例
  router.get('/examples', async (ctx) => {
    try {
      const examples = {
        api: {
          mode: 'api',
          description: 'API模式：通过API传递历史记录，客户端控制历史状态',
          request: {
            message: '你好',
            threadId: 'session_123',
            chatHistory: [
              {
                type: 'human',
                content: '之前的消息',
                timestamp: '2024-01-01T00:00:00.000Z'
              },
              {
                type: 'ai',
                content: 'AI的回复',
                timestamp: '2024-01-01T00:00:01.000Z'
              }
            ],
            memoryMode: 'api',
            maxHistory: 50
          }
        },
        lg: {
          mode: 'lg',
          description: 'LG模式：使用LangGraph内置记忆，服务端自动管理历史',
          request: {
            message: '你好',
            threadId: 'session_123',
            memoryMode: 'lg',
            maxHistory: 50
          }
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
          message: error instanceof Error ? error.message : '获取记忆模式示例失败'
        }
      };
    }
  });

  return router;
}
