// routes/index.ts - 简化的聊天 API

import Router from 'koa-router';
import { AgentBuilder } from '../core/agent-builder';
import { createToolHub, createToolHubWithPresets } from '../tool-hub/index';
import { ToolExecutionMode } from '../core/types';
import { WestoreCafeTools } from '../../examples/tool-demo/westore-cafe-tools';

const router = new Router({ prefix: '/api' });

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

// 基本对话 API
router.post('/chat', async (ctx) => {
  try {
    const {
      message,
      threadId,
      // Agent 配置
      model = {
        name: 'deepseek-chat',
        temperature: 0,
        baseURL: process.env.OPENAI_BASE_URL,
        apiKey: process.env.OPENAI_API_KEY
      },
      memory = { enabled: true },
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

    if (!message) {  // TODO 主要就是暴露一个 API 测试 tool-hub，req 返回体简单处理了；
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
    
    // 创建 Agent
    const agent = new AgentBuilder({
      model,
      memory,
      streaming,
      tools: westoreTools,
      toolExecutionConfig,
      // toolRelations,
    });
    
    // 初始化 Agent
    agent.initialize();

    // 执行聊天
    let result;
    if (streaming) {
      // 流式响应
      ctx.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const stream = agent.stream(message, threadId);
      
      for await (const chunk of stream) {
        ctx.res.write(`data: ${JSON.stringify({
          type: 'content',
          data: chunk,
          timestamp: new Date().toISOString(),
          threadId: threadId || 'default'
        })}\n\n`);
      }
      
      ctx.res.write(`data: ${JSON.stringify({
        type: 'done',
        data: { success: true },
        timestamp: new Date().toISOString(),
        threadId: threadId || 'default'
      })}\n\n`);
      
      ctx.res.end();
      return;
    } else {
      // 普通响应
      result = await agent.invoke(message, threadId);
    }

    ctx.body = {
      success: true,
      data: {
        content: result.content,
        toolCalls: result.toolCalls,
        metadata: {
          ...result.metadata,
          threadId: threadId || 'default',
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

export { router as agentRoutes };
