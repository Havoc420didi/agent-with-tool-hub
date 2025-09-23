// chat.routes.ts - 聊天相关路由

import Router from 'koa-router';
import { ToolExecutionMode, ChatRequest } from '../core/types';
import { WestoreCafeTools } from '../../examples/tool-demo/westore-cafe-tools';
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
 * 创建聊天路由
 */
export function createChatRoutes(): Router {
  const router = new Router();

  // 基本对话 API
  router.post('/chat', async (ctx) => {
    try {
      const {
        // 消息类型配置
        messageType = 'user', // 'user' | 'tool'
        message,
        threadId = `thread_${Date.now()}`,
        // 记忆配置
        chatHistory,
        memoryMode = 'lg', // 默认使用LG模式
        maxHistory = 50,
        // Agent 配置
        model = {
          name: 'deepseek-chat',
          temperature: 0,
          baseURL: process.env.OPENAI_BASE_URL,
          apiKey: process.env.OPENAI_API_KEY
        },
        memory = { 
          enabled: true, 
          mode: memoryMode,
          maxHistory 
        },
        streaming = false,
        // TODO 工具配置
        tools = [], // 工具配置
        toolHubConfig = {}, // 工具Hub配置
        toolRelations = {}, // 工具关系配置
        // 工具执行模式配置
        toolExecutionConfig = {
          mode: ToolExecutionMode.INTERNAL,
          internalConfig: {
            enableCache: true,
            cacheTtl: 300000,
            maxRetries: 3
          }
        },
        systemPrompt = {
          enabled: true,
          includeUnavailable: true,
          includeParameters: true,
          includeStatistics: true,
          includeDependencies: true,
        },
        // 其他配置
        config = {}
      } = ctx.request.body as any;

      // 验证消息内容
      if (!message || !message.trim()) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'message 是必需的'
          }
        };
        return;
      }

      const service = initializeAgentService();
      
      // 检查Agent是否存在，如果不存在则创建
      let agent = service.getAgent(threadId);
      if (!agent) {
        Logger.info(`Agent ${threadId} 不存在，开始创建新Agent`);
        
        // TEST 使用 westore 咖啡工具创建Agent
        const westoreTools = WestoreCafeTools.getAll();
        
        const agentConfig = {
          model,
          memory,
          streaming,
          tools: westoreTools,
          toolExecutionConfig,
          systemPrompt
        };
        
        try {
          const createResult = await service.createAgent(threadId, agentConfig);
          if (!createResult.success) {
            Logger.error(`创建Agent失败: ${threadId}`, {
              error: createResult.error,
              agentConfig
            });
            ctx.status = 500;
            ctx.body = createResult;
            return;
          }
          Logger.info(`Agent ${threadId} 创建成功`);
        } catch (createError) {
          Logger.error(`创建Agent异常: ${threadId}`, {
            error: createError instanceof Error ? createError.message : String(createError),
            stack: createError instanceof Error ? createError.stack : undefined,
            agentConfig
          });
          throw createError;
        }
      } else {
        Logger.debug(`使用现有Agent: ${threadId}`);
      }

      // 构建聊天请求
      const chatRequest: ChatRequest = {
        messageType,
        message,
        threadId,
        chatHistory,
        memoryMode,
        maxHistory,
        config: {
          ...config,
        }
      };

      Logger.debug('1️⃣ 聊天请求', { 
        threadId, 
        messageType,
        messageLength: message.length,
        memoryMode,
        hasChatHistory: !!chatHistory,
      });

      // 执行聊天
      let result;
      if (streaming) {
        // 流式响应暂不支持 // TODO 后面可以扩展一下
        Logger.warn('流式响应请求被拒绝', { threadId });
        ctx.status = 501;
        ctx.body = {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: '流式响应暂不支持'
          }
        };
        return;
      } else {
        // 普通响应 - 使用 AgentService.chat 以确保工具状态被保存
        try {
          Logger.debug(`开始执行聊天: ${threadId}`);
          const chatResult = await service.chat(threadId, chatRequest);
          
          if (!chatResult.success) {
            Logger.error(`聊天执行失败: ${threadId}`, {
              error: chatResult.error,
              chatRequest
            });
            ctx.status = 500;
            ctx.body = chatResult;
            return;
          }
          
          Logger.info(`聊天执行成功: ${threadId}`, {
            contentLength: chatResult.data?.content?.length || 0,
            toolCallsCount: chatResult.data?.toolCalls?.length || 0
          });
          
          // 获取待执行的工具调用（外部执行模式）
          let pendingToolCalls: any[] = [];
          if (toolExecutionConfig.mode === ToolExecutionMode.OUTSIDE && agent) {
            pendingToolCalls = agent.getPendingToolCalls();
          }
          
          result = {
            content: chatResult.data?.content || '',
            toolCalls: chatResult.data?.toolCalls || [],
            metadata: {
              ...chatResult.data?.metadata || {},
              pendingToolCalls: toolExecutionConfig.mode === ToolExecutionMode.OUTSIDE ? pendingToolCalls : undefined,
              executionMode: toolExecutionConfig.mode
            }
          };
        } catch (chatError) {
          Logger.error(`聊天执行异常: ${threadId}`, {
            error: chatError instanceof Error ? chatError.message : String(chatError),
            stack: chatError instanceof Error ? chatError.stack : undefined,
            chatRequest
          });
          throw chatError;
        }
      }

      ctx.body = {
        success: true,
        data: {
          content: result.content,
          toolCalls: result.toolCalls,
          metadata: {
            ...result.metadata,
            threadId,
            timestamp: new Date().toISOString(),
            toolsUsed: result.toolCalls?.map(tc => tc.toolName) || []
          }
        }
      };

    } catch (error) {
      const requestBody = ctx.request.body as any;
      Logger.error('聊天处理失败', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        threadId: requestBody?.threadId || 'unknown',
        message: requestBody?.message || 'unknown'
      });
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '聊天处理失败'
        }
      };
    }
  });

  // 获取Agent状态
  router.get('/agents/status', async (ctx) => {
    try {
      const service = initializeAgentService();
      const agentsResult = await service.listAgents();
      
      if (!agentsResult.success) {
        ctx.status = 500;
        ctx.body = agentsResult;
        return;
      }
      
      const agentList = (agentsResult.data || []).map(id => ({
        id,
        status: 'active'
      }));
      
      ctx.body = {
        success: true,
        data: {
          totalAgents: agentList.length,
          agents: agentList
        }
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'CACHE_ERROR',
          message: error instanceof Error ? error.message : '获取缓存状态失败'
        }
      };
    }
  });

  // 清理特定Thread的Agent缓存
  router.delete('/agents/cache/:threadId', async (ctx) => {
    try {
      const { threadId } = ctx.params;
      const service = initializeAgentService();
      
      const result = await service.deleteAgent(threadId);
      
      if (result.success) {
        ctx.body = {
          success: true,
          data: {
            message: `Thread ${threadId} 的Agent缓存已清理`
          }
        };
      } else {
        ctx.status = 404;
        ctx.body = result;
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'CACHE_ERROR',
          message: error instanceof Error ? error.message : '清理缓存失败'
        }
      };
    }
  });

  // 清理所有Agent缓存
  router.delete('/agents/cache', async (ctx) => {
    try {
      const service = initializeAgentService();
      const agentsResult = await service.listAgents();
      const count = agentsResult.success ? (agentsResult.data?.length || 0) : 0;
      
      // 清空所有Agent
      if (agentsResult.success && agentsResult.data) {
        for (const agentId of agentsResult.data) {
          await service.deleteAgent(agentId);
        }
      }
      
      ctx.body = {
        success: true,
        data: {
          message: `已清理 ${count} 个Agent缓存`,
          clearedAgents: count
        }
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'CACHE_ERROR',
          message: error instanceof Error ? error.message : '清理所有缓存失败'
        }
      };
    }
  });

  // 清空LG记忆状态
  router.delete('/agents/:threadId/memory', async (ctx) => {
    try {
      const { threadId } = ctx.params;
      const service = initializeAgentService();
      // 清空特定thread的Agent
      const result = await service.deleteAgent(threadId);
      const success = result.success;
      
      if (success) {
        ctx.body = {
          success: true,
          data: {
            message: `Thread ${threadId} 的Agent已清空`
          }
        };
      } else {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Thread ${threadId} 的Agent不存在`
          }
        };
      }
    } catch (error) {
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

  return router;
}
