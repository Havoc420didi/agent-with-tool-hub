// simple-mode-control-demo.mts - 简单的模式控制演示

import { config } from 'dotenv';
import { resolve } from 'path';
import { AgentBuilder } from '../src/core/agent-builder';
import { ToolExecutionMode } from '../src/core/types';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

/**
 * 简单的模式控制演示
 * 直接通过 mode 字段控制工具是内部执行还是外部执行
 */
async function simpleModeControlDemo() {
  console.log('🚀 简单的模式控制演示\n');

  // 1. 内部执行模式 - 所有工具都在 Agent 内部执行
  console.log('=== 1. 内部执行模式 ===');
  const internalAgent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'calculator',
        description: '执行数学计算',
        schema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: '数学表达式'
            }
          },
          required: ['expression']
        },
        handler: async (input: any) => {
          try {
            const result = eval(input.expression);
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        tags: ['math', 'calculation'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      },
      {
        name: 'file_upload',
        description: '上传文件到服务器',
        schema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '文件路径'
            }
          },
          required: ['filePath']
        },
        handler: async (input: any) => {
          // 在内部执行模式下，这个工具也会在内部执行
          return { success: true, data: `文件 ${input.filePath} 已上传` };
        },
        tags: ['file', 'upload'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.INTERNAL, // 直接设置为内部执行
      internalConfig: {
        enableCache: true,
        cacheTtl: 300000,
        maxRetries: 3
      }
    }
  });

  internalAgent.initialize();
  
  try {
    console.log('📊 内部执行模式 - 计算工具');
    const calcResult = await internalAgent.invoke({
      messages: [{ role: 'user', content: '请计算 2 + 3 * 4 的结果' }],
      metadata: { threadId: 'internal-demo' }
    });
    console.log('计算结果:', calcResult);

    console.log('\n📁 内部执行模式 - 文件上传工具');
    const uploadResult = await internalAgent.invoke({
      messages: [{ role: 'user', content: '请上传文件 /path/to/document.pdf' }],
      metadata: { threadId: 'internal-demo' }
    });
    console.log('上传结果:', uploadResult);
  } catch (error) {
    console.error('内部执行错误:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 2. 外部执行模式 - 所有工具都下发到外部执行
  console.log('=== 2. 外部执行模式 ===');
  const externalAgent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'calculator',
        description: '执行数学计算',
        schema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: '数学表达式'
            }
          },
          required: ['expression']
        },
        handler: async (input: any) => {
          // 这个工具在外部执行模式下不会在内部执行
          return { success: false, error: '需要外部执行' };
        },
        tags: ['math', 'calculation'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      },
      {
        name: 'file_upload',
        description: '上传文件到服务器',
        schema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '文件路径'
            }
          },
          required: ['filePath']
        },
        handler: async (input: any) => {
          // 这个工具在外部执行模式下不会在内部执行
          return { success: false, error: '需要外部执行' };
        },
        tags: ['file', 'upload'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.OUTSIDE, // 直接设置为外部执行
      outsideConfig: {
        waitForResult: true,
        timeout: 60000,
        callbackUrl: 'http://localhost:3000/api/tool-callback'
      }
    }
  });

  externalAgent.initialize();
  
  try {
    console.log('📊 外部执行模式 - 计算工具');
    const calcResult = await externalAgent.invoke({
      messages: [{ role: 'user', content: '请计算 5 + 6 * 7 的结果' }],
      metadata: { threadId: 'external-demo' }
    });
    console.log('计算结果:', calcResult);

    console.log('\n📁 外部执行模式 - 文件上传工具');
    const uploadResult = await externalAgent.invoke({
      messages: [{ role: 'user', content: '请上传文件 /path/to/image.jpg' }],
      metadata: { threadId: 'external-demo' }
    });
    console.log('上传结果:', uploadResult);

    // 获取待执行的工具调用
    const pendingCalls = externalAgent.getPendingToolCalls();
    console.log('\n⏳ 待执行的工具调用:', pendingCalls);

    // 模拟外部执行完成
    if (pendingCalls.length > 0) {
      console.log('\n🔄 模拟外部执行...');
      for (const pendingCall of pendingCalls) {
        const toolCall = pendingCall.toolCall;
        let mockResult;
        
        if (toolCall.name === 'calculator') {
          mockResult = { success: true, data: eval(toolCall.args.expression) };
        } else if (toolCall.name === 'file_upload') {
          mockResult = { 
            success: true, 
            data: { 
              fileId: 'file_12345', 
              fileName: toolCall.args.filePath,
              uploadTime: new Date().toISOString()
            } 
          };
        }
        
        if (mockResult) {
          await externalAgent.handleOutsideToolResult(toolCall.id, mockResult);
          console.log(`✅ 外部执行完成: ${toolCall.name} -> ${JSON.stringify(mockResult)}`);
        }
      }
    }
  } catch (error) {
    console.error('外部执行错误:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 3. 运行时切换模式
  console.log('=== 3. 运行时切换模式 ===');
  const switchableAgent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'simple_tool',
        description: '简单工具，可以切换执行模式',
        schema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: '任务描述'
            }
          },
          required: ['task']
        },
        handler: async (input: any) => {
          return { success: true, data: `完成了任务: ${input.task}` };
        },
        tags: ['simple'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.INTERNAL // 初始为内部执行
    }
  });

  switchableAgent.initialize();
  
  try {
    // 内部执行
    console.log('🔄 当前模式: 内部执行');
    const internalResult = await switchableAgent.invoke({
      messages: [{ role: 'user', content: '请执行任务：数据处理' }],
      metadata: { threadId: 'switch-demo' }
    });
    console.log('内部执行结果:', internalResult);

    // 切换到外部执行
    console.log('\n🔄 切换到外部执行模式...');
    switchableAgent.setToolExecutionMode(ToolExecutionMode.OUTSIDE);
    
    const externalResult = await switchableAgent.invoke({
      messages: [{ role: 'user', content: '请执行任务：文件上传' }],
      metadata: { threadId: 'switch-demo' }
    });
    console.log('外部执行结果:', externalResult);

    // 获取待执行的工具调用
    const pendingCalls = switchableAgent.getPendingToolCalls();
    console.log('待执行的工具调用:', pendingCalls);

    // 模拟外部执行完成
    if (pendingCalls.length > 0) {
      const toolCall = pendingCalls[0].toolCall;
      const mockResult = { success: true, data: `外部执行完成: ${toolCall.args.task}` };
      await switchableAgent.handleOutsideToolResult(toolCall.id, mockResult);
      console.log('✅ 外部执行完成');
    }

    // 切换回内部执行
    console.log('\n🔄 切换回内部执行模式...');
    switchableAgent.setToolExecutionMode(ToolExecutionMode.INTERNAL);
    
    const backToInternalResult = await switchableAgent.invoke({
      messages: [{ role: 'user', content: '请执行任务：数据分析' }],
      metadata: { threadId: 'switch-demo' }
    });
    console.log('内部执行结果:', backToInternalResult);

  } catch (error) {
    console.error('模式切换错误:', error);
  }

  console.log('\n🎉 简单的模式控制演示完成！');
  console.log('\n📋 总结:');
  console.log('- 通过 toolExecutionConfig.mode 字段直接控制执行方式');
  console.log('- INTERNAL: 所有工具在 Agent 内部执行');
  console.log('- OUTSIDE: 所有工具下发到外部执行');
  console.log('- 支持运行时动态切换模式');
}

// 运行演示
if (require.main === module) {
  simpleModeControlDemo().catch(console.error);
}

export { simpleModeControlDemo };
