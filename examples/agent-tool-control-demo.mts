// agent-tool-control-demo.mts - Agent 自主控制 Tool-Call 执行演示

import { config } from 'dotenv';
import { resolve } from 'path';
import { AgentBuilder } from '../src/core/agent-builder';
import { ToolExecutionMode } from '../src/core/types';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

/**
 * 演示 Agent 自主控制 Tool-Call 执行的不同方式
 */
async function demonstrateAgentToolControl() {
  console.log('🚀 Agent 自主控制 Tool-Call 执行演示\n');

  // 1. 基础配置 - 使用内部执行模式
  console.log('=== 1. 基础内部执行模式 ===');
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
        tags: ['calculation', 'math'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.INTERNAL,
      internalConfig: {
        enableCache: true,
        cacheTtl: 300000,
        maxRetries: 3
      }
    }
  });

  internalAgent.initialize();
  
  try {
    const internalResult = await internalAgent.invoke({
      messages: [{ role: 'user', content: '请计算 2 + 3 * 4 的结果' }],
      metadata: { threadId: 'demo-internal' }
    });
    
    console.log('内部执行结果:', internalResult);
  } catch (error) {
    console.error('内部执行错误:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 2. 外部执行模式 - 下发到请求端
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
        name: 'file_upload',
        description: '上传文件到服务器',
        schema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '文件路径'
            },
            fileType: {
              type: 'string',
              description: '文件类型'
            }
          },
          required: ['filePath']
        },
        handler: async (input: any) => {
          // 这个工具需要外部执行，这里只是占位符
          return { success: false, error: '需要外部执行' };
        },
        tags: ['file', 'upload'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.OUTSIDE,
      outsideConfig: {
        waitForResult: true,
        timeout: 60000,
        callbackUrl: 'http://localhost:3000/api/tool-callback'
      }
    }
  });

  externalAgent.initialize();
  
  try {
    const externalResult = await externalAgent.invoke({
      messages: [{ role: 'user', content: '请上传文件 /path/to/document.pdf' }],
      metadata: { threadId: 'demo-external' }
    });
    
    console.log('外部执行结果:', externalResult);
    
    // 获取待执行的工具调用
    const pendingCalls = externalAgent.getPendingToolCalls();
    console.log('待执行的工具调用:', pendingCalls);
  } catch (error) {
    console.error('外部执行错误:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 3. 动态决策控制 - Agent 自主决定执行方式
  console.log('=== 3. 动态决策控制 ===');
  const dynamicAgent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'database_query',
        description: '查询数据库',
        schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL 查询语句'
            }
          },
          required: ['query']
        },
        handler: async (input: any) => {
          // 模拟数据库查询
          return { success: true, data: `查询结果: ${input.query}` };
        },
        tags: ['database', 'query'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      },
      {
        name: 'user_interface_action',
        description: '执行用户界面操作',
        schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: '操作类型'
            },
            target: {
              type: 'string',
              description: '操作目标'
            }
          },
          required: ['action']
        },
        handler: async (input: any) => {
          // 这个工具需要外部执行
          return { success: false, error: '需要外部执行' };
        },
        tags: ['ui', 'interaction'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.INTERNAL, // 默认模式
      dynamicControl: {
        enabled: true,
        defaultMode: ToolExecutionMode.INTERNAL
      }
    }
  });

  dynamicAgent.initialize();
  
  try {
    // 测试数据库查询（应该内部执行）
    const dbResult = await dynamicAgent.invoke({
      messages: [{ role: 'user', content: '请查询用户表中的所有记录' }],
      metadata: { 
        threadId: 'demo-dynamic',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('数据库查询结果:', dbResult);
    
    // 测试UI操作（应该外部执行）
    const uiResult = await dynamicAgent.invoke({
      messages: [{ role: 'user', content: '请点击登录按钮' }],
      metadata: { 
        threadId: 'demo-dynamic',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('UI操作结果:', uiResult);
    
    // 查看决策历史
    const decisionHistory = dynamicAgent.getDecisionHistory();
    console.log('决策历史:', decisionHistory);
    
  } catch (error) {
    console.error('动态决策错误:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 4. 自定义决策函数
  console.log('=== 4. 自定义决策函数 ===');
  const customAgent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'smart_tool',
        description: '智能工具，根据参数决定执行方式',
        schema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: '操作类型'
            },
            data: {
              type: 'string',
              description: '操作数据'
            }
          },
          required: ['operation']
        },
        handler: async (input: any) => {
          return { success: true, data: `执行了 ${input.operation}` };
        },
        tags: ['smart'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.INTERNAL,
      dynamicControl: {
        enabled: true,
        decisionFunction: (toolName: string, args: any, context?: any) => {
          // 自定义决策逻辑
          if (args.operation === 'upload' || args.operation === 'download') {
            return ToolExecutionMode.OUTSIDE;
          }
          if (args.operation === 'calculate' || args.operation === 'query') {
            return ToolExecutionMode.INTERNAL;
          }
          
          // 基于用户消息决策
          const userMessage = context?.userMessage?.toLowerCase() || '';
          if (userMessage.includes('上传') || userMessage.includes('点击')) {
            return ToolExecutionMode.OUTSIDE;
          }
          
          return ToolExecutionMode.INTERNAL;
        },
        defaultMode: ToolExecutionMode.INTERNAL
      }
    }
  });

  customAgent.initialize();
  
  try {
    // 测试计算操作（应该内部执行）
    const calcResult = await customAgent.invoke({
      messages: [{ role: 'user', content: '请执行计算操作' }],
      metadata: { threadId: 'demo-custom' }
    });
    
    console.log('计算操作结果:', calcResult);
    
    // 测试上传操作（应该外部执行）
    const uploadResult = await customAgent.invoke({
      messages: [{ role: 'user', content: '请执行上传操作' }],
      metadata: { threadId: 'demo-custom' }
    });
    
    console.log('上传操作结果:', uploadResult);
    
  } catch (error) {
    console.error('自定义决策错误:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 5. 运行时切换执行模式
  console.log('=== 5. 运行时切换执行模式 ===');
  const switchableAgent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'flexible_tool',
        description: '灵活的工具，可以切换执行模式',
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
        tags: ['flexible'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ]
  });

  switchableAgent.initialize();
  
  try {
    // 先使用内部模式
    console.log('切换到内部执行模式...');
    switchableAgent.setToolExecutionMode(ToolExecutionMode.INTERNAL);
    
    const internalModeResult = await switchableAgent.invoke({
      messages: [{ role: 'user', content: '请执行任务：数据处理' }],
      metadata: { threadId: 'demo-switch' }
    });
    
    console.log('内部模式结果:', internalModeResult);
    
    // 切换到外部模式
    console.log('切换到外部执行模式...');
    switchableAgent.setToolExecutionMode(ToolExecutionMode.OUTSIDE);
    
    const externalModeResult = await switchableAgent.invoke({
      messages: [{ role: 'user', content: '请执行任务：文件上传' }],
      metadata: { threadId: 'demo-switch' }
    });
    
    console.log('外部模式结果:', externalModeResult);
    
  } catch (error) {
    console.error('模式切换错误:', error);
  }

  console.log('\n🎉 Agent 自主控制 Tool-Call 执行演示完成！');
}

// 运行演示
if (require.main === module) {
  demonstrateAgentToolControl().catch(console.error);
}

export { demonstrateAgentToolControl };
