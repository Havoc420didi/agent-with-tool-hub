// chat.routes.ts - 聊天相关路由

import Router from 'koa-router';
import { AgentBuilder } from '../core/agent-builder';
import { ToolExecutionMode, ChatRequest } from '../core/types';
import { WestoreCafeTools } from '../../examples/tool-demo/westore-cafe-tools';
import { AgentService } from '../services/agent.service';

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
 * 获取或创建Agent实例
 */
async function getOrCreateAgent(threadId: string, config: any): Promise<AgentBuilder> {
  const service = initializeAgentService();
  
  // 尝试获取现有Agent
  let agent = service.getAgent(threadId);
  if (agent) {
    return agent;
  }

  // 创建新的Agent实例
  agent = new AgentBuilder(config);
  agent.initialize();
  
  // 注册到AgentService
  service.setAgent(threadId, agent);
  
  return agent;
}

/**
 * 创建聊天路由
 */
export function createChatRoutes(): Router {
  const router = new Router();

  // 基本对话 API（支持记忆功能）
  router.post('/chat', async (ctx) => {
    try {
      const {
        message,
        threadId,
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
        // 工具配置
        tools = [],
        toolHubConfig = {},
        // 工具关系配置
        toolRelations = {},
        // 工具执行模式配置
        toolExecutionConfig = {
          mode: ToolExecutionMode.INTERNAL,
          internalConfig: {
            enableCache: true,
            cacheTtl: 300000,
            maxRetries: 3
          }
        },
        // 其他配置
        config = {}
      } = ctx.request.body as any;

      if (!message) {
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

      // TEST 预定义 westore-cafe 工具
      const westoreTools = WestoreCafeTools.getAll();
      
      // 构建Agent配置
      const agentConfig = {
        model,
        memory,
        streaming,
        tools: westoreTools,
        toolExecutionConfig,
        // toolRelations,
      };
      
      // 获取或创建Agent实例（保持记忆状态）
      const agent = await getOrCreateAgent(threadId || 'default', agentConfig);

      // 构建聊天请求
      const chatRequest: ChatRequest = {
        message,
        threadId: threadId || '',
        chatHistory,
        memoryMode,
        maxHistory,
        config
      };

      // 执行聊天
      let result;
      if (streaming) { // TODO 效果不是很好
        console.log('开始流式响应处理...');
        
        // 设置状态码为 200
        ctx.status = 200;
        
        // 流式响应
        ctx.set({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        });

        try {
          console.log('创建流式流...');
          const stream = agent.stream(message, threadId || 'default');
          console.log('流式流创建成功，开始处理数据块...');
          
          for await (const chunk of stream) {
            if (ctx.res.writableEnded) {
              console.log('响应已结束，停止写入');
              break; // 如果响应已经结束，停止写入
            }
            
            console.log('处理数据块:', JSON.stringify(chunk, null, 2));
            
            const data = {
              type: 'content',
              data: chunk,
              timestamp: new Date().toISOString(),
              threadId: threadId || 'default'
            };
            
            ctx.res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
          
          // 发送结束信号
          if (!ctx.res.writableEnded) {
            console.log('发送结束信号...');
            const endData = {
              type: 'done',
              data: { success: true },
              timestamp: new Date().toISOString(),
              threadId: threadId || 'default'
            };
            ctx.res.write(`data: ${JSON.stringify(endData)}\n\n`);
            ctx.res.end();
          }
          
          console.log('流式响应处理完成');
          return;
        } catch (streamError) {
          console.error('流式响应错误:', streamError);
          console.error('错误堆栈:', streamError instanceof Error ? streamError.stack : '无堆栈信息');
          
          // 发送错误信号
          if (!ctx.res.writableEnded) {
            const errorData = {
              type: 'error',
              data: { 
                success: false, 
                error: streamError instanceof Error ? streamError.message : '流式响应失败' 
              },
              timestamp: new Date().toISOString(),
              threadId: threadId || 'default'
            };
            ctx.res.write(`data: ${JSON.stringify(errorData)}\n\n`);
            ctx.res.end();
          }
          return;
        }
      } else {
        // 普通响应
        result = await agent.invoke(chatRequest);
      }

      ctx.body = {
        success: true,
        data: {
          content: result.content,
          toolCalls: result.toolCalls,
          metadata: {
            ...result.metadata,
            threadId: threadId || '',
            timestamp: new Date().toISOString(),
            toolsUsed: result.toolCalls?.map(tc => tc.toolName) || [],
            // toolHubStats: toolHub.getStats()
          }
        }
      };

    } catch (error) {
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

  // 获取Agent缓存状态
  router.get('/agents/cache', async (ctx) => {
    try {
      const service = initializeAgentService();
      const memoryService = service.getMemoryService();
      
      // 获取所有Agent的统计信息
      const allStats = await memoryService.getAllMemoryStats();
      
      if (!allStats.success) {
        ctx.status = 500;
        ctx.body = allStats;
        return;
      }

      ctx.body = {
        success: true,
        data: {
          totalAgents: allStats.data?.totalAgents || 0,
          agents: allStats.data?.agents || []
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
      const memoryService = service.getMemoryService();
      
      // 获取当前Agent数量
      const allStats = await memoryService.getAllMemoryStats();
      const count = allStats.success ? (allStats.data?.totalAgents || 0) : 0;
      
      // 清空所有记忆
      const result = await memoryService.clearAllMemory();
      
      if (result.success) {
        ctx.body = {
          success: true,
          data: {
            message: `已清理 ${count} 个Agent缓存`,
            clearedAgents: result.data?.totalAgents || 0
          }
        };
      } else {
        ctx.status = 500;
        ctx.body = result;
      }
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
      const memoryService = service.getMemoryService();
      
      // 清空特定thread的记忆
      const result = await memoryService.clearChatHistory(threadId, threadId);
      
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
