// tool-execution-modes.mts - 工具执行模式示例

import { AgentBuilder } from '../src/core/agent-builder';
import { ToolExecutionMode } from '../src/core/types';
import { z } from 'zod';

/**
 * 示例1：内部执行模式
 * 工具在 agent 内部直接执行，类似 LangGraph 的 Tool 同时定义 define 和 invoke
 */
async function internalExecutionExample() {
  console.log('=== 内部执行模式示例 ===');
  
  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    memory: { enabled: true },
    streaming: false,
    toolExecution: {
      mode: ToolExecutionMode.INTERNAL,
      internalConfig: {
        enableCache: true,
        cacheTtl: 300000, // 5分钟缓存
        maxRetries: 3
      }
    },
    tools: [
      {
        name: 'calculator',
        description: '执行数学计算',
        schema: z.object({
          expression: z.string().describe('数学表达式')
        }),
        handler: async (input: any) => {
          try {
            const result = eval(input.expression);
            return {
              success: true,
              data: { result, expression: input.expression }
            };
          } catch (error) {
            return {
              success: false,
              error: `计算错误: ${error}`
            };
          }
        }
      }
    ]
  });

  await agent.initialize();

  // 执行聊天，工具会在内部直接执行
  const response = await agent.invoke('请计算 2 + 3 * 4 的结果');
  
  console.log('Agent 响应:', response.content);
  console.log('工具调用结果:', response.toolCalls);
  console.log('执行策略:', agent.getToolExecutionStrategy());
}

/**
 * 示例2：外部执行模式（等待结果）
 * agent 只负责下发 tool-call，等待外部执行完成
 */
async function outsideExecutionWithWaitExample() {
  console.log('\n=== 外部执行模式（等待结果）示例 ===');
  
  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    memory: { enabled: true },
    streaming: false,
    toolExecution: {
      mode: ToolExecutionMode.OUTSIDE,
      outsideConfig: {
        waitForResult: true,
        timeout: 30000, // 30秒超时
        callbackUrl: 'https://your-external.com/api/tool-callback'
      }
    },
    tools: [
      {
        name: 'file_upload',
        description: '上传文件到服务器',
        schema: z.object({
          filename: z.string().describe('文件名'),
          content: z.string().describe('文件内容')
        }),
        handler: async () => {
          // 这个 handler 在外部执行模式下不会被调用
          return { success: false, error: '此工具应由外部执行' };
        }
      }
    ]
  });

  await agent.initialize();

  // 执行聊天，会下发 tool-call 到外部
  const response = await agent.invoke('请帮我上传一个名为 test.txt 的文件，内容为 "Hello World"');
  
  console.log('Agent 响应:', response.content);
  console.log('待执行的工具调用:', agent.getPendingToolCalls());
  console.log('执行策略:', agent.getToolExecutionStrategy());
  
  // 在外部执行模式下，工具调用信息会在响应中返回
  // 外部系统需要解析 toolCalls 并执行相应工具
  // 然后将结果作为新消息发送给 agent
  console.log('\n注意：在外部执行模式下，需要外部系统：');
  console.log('1. 解析响应中的 toolCalls 信息');
  console.log('2. 执行相应的工具');
  console.log('3. 将结果作为新消息发送给 agent');
}

/**
 * 示例3：外部执行模式（不等待结果）
 * agent 下发 tool-call 后立即返回，不等待外部执行结果
 */
async function outsideExecutionNoWaitExample() {
  console.log('\n=== 外部执行模式（不等待结果）示例 ===');
  
  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    memory: { enabled: true },
    streaming: false,
    toolExecution: {
      mode: ToolExecutionMode.OUTSIDE,
      outsideConfig: {
        waitForResult: false,
        callbackUrl: 'https://your-external.com/api/tool-callback'
      }
    },
    tools: [
      {
        name: 'send_notification',
        description: '发送通知给用户',
        schema: z.object({
          message: z.string().describe('通知消息'),
          userId: z.string().describe('用户ID')
        }),
        handler: async () => {
          // 这个 handler 在外部执行模式下不会被调用
          return { success: false, error: '此工具应由外部执行' };
        }
      }
    ]
  });

  await agent.initialize();

  // 执行聊天，会下发 tool-call 到外部但不等待结果
  const response = await agent.invoke('请给用户 123 发送一条通知："您的订单已发货"');
  
  console.log('Agent 响应:', response.content);
  console.log('待执行的工具调用:', agent.getPendingToolCalls());
  console.log('执行策略:', agent.getToolExecutionStrategy());
}

/**
 * 示例4：动态切换执行模式
 */
async function dynamicModeSwitchExample() {
  console.log('\n=== 动态切换执行模式示例 ===');
  
  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    memory: { enabled: true },
    streaming: false,
    toolExecution: {
      mode: ToolExecutionMode.INTERNAL,
      internalConfig: {
        enableCache: true,
        cacheTtl: 300000,
        maxRetries: 3
      }
    }
  });

  await agent.initialize();
  
  console.log('初始执行策略:', agent.getToolExecutionStrategy());
  
  // 切换到外部执行模式
  await agent.switchToolExecutionMode({
    mode: ToolExecutionMode.OUTSIDE,
    outsideConfig: {
      waitForResult: true,
      timeout: 30000
    }
  });
  
  console.log('切换后执行策略:', agent.getToolExecutionStrategy());
}

/**
 * 主函数
 */
async function main() {
  try {
    // 加载环境变量
    require('dotenv').config({ path: './config.env' });
    
    // 运行示例
    await internalExecutionExample();
    await outsideExecutionWithWaitExample();
    await outsideExecutionNoWaitExample();
    await dynamicModeSwitchExample();
    
    console.log('\n=== 所有示例执行完成 ===');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  internalExecutionExample,
  outsideExecutionWithWaitExample,
  outsideExecutionNoWaitExample,
  dynamicModeSwitchExample
};
