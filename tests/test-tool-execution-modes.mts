// test-tool-execution-modes.mts - 工具执行模式测试

import { AgentBuilder } from '../src/core/agent-builder';
import { ToolExecutionMode } from '../src/core/types';

/**
 * 测试内部执行模式
 */
async function testInternalExecutionMode() {
  console.log('🧪 测试内部执行模式...');
  
  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    memory: { enabled: false },
    streaming: false,
    toolExecution: {
      mode: ToolExecutionMode.INTERNAL,
      internalConfig: {
        enableCache: true,
        cacheTtl: 300000,
        maxRetries: 1
      }
    },
    tools: [
      {
        name: 'test_calculator',
        description: '测试计算器',
        schema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: '数学表达式' }
          },
          required: ['expression']
        },
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

  // 测试工具执行
  const response = await agent.invoke('请计算 5 + 3 的结果');
  
  console.log('✅ 内部执行模式测试结果:');
  console.log('  - 执行策略:', agent.getToolExecutionStrategy());
  console.log('  - 响应内容:', response.content);
  console.log('  - 工具调用:', response.toolCalls);
  
  return response.toolCalls && response.toolCalls.length > 0;
}

/**
 * 测试外部执行模式
 */
async function testOutsideExecutionMode() {
  console.log('\n🧪 测试外部执行模式...');
  
  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    memory: { enabled: false },
    streaming: false,
    toolExecution: {
      mode: ToolExecutionMode.OUTSIDE,
      outsideConfig: {
        waitForResult: false,
        callbackUrl: 'https://test-external.com/callback'
      }
    },
    tools: [
      {
        name: 'test_upload',
        description: '测试文件上传',
        schema: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: '文件名' }
          },
          required: ['filename']
        },
        handler: async () => {
          return { success: false, error: '此工具应由前端执行' };
        }
      }
    ]
  });

  await agent.initialize();

  // 测试工具调用下发
  const response = await agent.invoke('请上传一个名为 test.txt 的文件');
  
  console.log('✅ 外部执行模式测试结果:');
  console.log('  - 执行策略:', agent.getToolExecutionStrategy());
  console.log('  - 响应内容:', response.content);
  console.log('  - 待执行工具调用:', agent.getPendingToolCalls());
  
  return agent.getPendingToolCalls().length > 0;
}

/**
 * 测试动态模式切换
 */
async function testDynamicModeSwitch() {
  console.log('\n🧪 测试动态模式切换...');
  
  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    memory: { enabled: false },
    streaming: false,
    toolExecution: {
      mode: ToolExecutionMode.INTERNAL,
      internalConfig: {
        enableCache: true,
        cacheTtl: 300000,
        maxRetries: 1
      }
    }
  });

  await agent.initialize();
  
  console.log('  - 初始模式:', agent.getToolExecutionStrategy());
  
  // 切换到外部模式
  await agent.switchToolExecutionMode({
    mode: ToolExecutionMode.OUTSIDE,
    outsideConfig: {
      waitForResult: true,
      timeout: 10000
    }
  });
  
  console.log('  - 切换后模式:', agent.getToolExecutionStrategy());
  
  return agent.getToolExecutionStrategy() === 'outside';
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始工具执行模式测试...\n');
  
  try {
    // 加载环境变量
    require('dotenv').config({ path: './config.env' });
    
    const results = {
      internalMode: false,
      outsideMode: false,
      dynamicSwitch: false
    };
    
    // 运行测试
    results.internalMode = await testInternalExecutionMode();
    results.outsideMode = await testOutsideExecutionMode();
    results.dynamicSwitch = await testDynamicModeSwitch();
    
    // 输出测试结果
    console.log('\n📊 测试结果汇总:');
    console.log('  - 内部执行模式:', results.internalMode ? '✅ 通过' : '❌ 失败');
    console.log('  - 外部执行模式:', results.outsideMode ? '✅ 通过' : '❌ 失败');
    console.log('  - 动态模式切换:', results.dynamicSwitch ? '✅ 通过' : '❌ 失败');
    
    const allPassed = Object.values(results).every(result => result);
    console.log('\n🎯 总体结果:', allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    return false;
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runTests };
