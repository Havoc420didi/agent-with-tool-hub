// complete-tool-control-demo.mts - 完整的 Agent 工具控制演示

import { config } from 'dotenv';
import { resolve } from 'path';
import { AgentBuilder } from '../src/core/agent-builder';
import { ToolExecutionMode } from '../src/core/types';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

/**
 * 完整的 Agent 工具控制演示
 * 展示如何让 agent 自主控制 tool-call 的执行方式
 */
async function completeToolControlDemo() {
  console.log('🚀 完整的 Agent 工具控制演示\n');

  // 创建支持自主控制工具执行的 Agent
  const agent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      // 内部执行工具 - 数据库查询
      {
        name: 'database_query',
        description: '查询数据库获取信息',
        schema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: '表名'
            },
            conditions: {
              type: 'string',
              description: '查询条件'
            }
          },
          required: ['table']
        },
        handler: async (input: any) => {
          // 模拟数据库查询
          await new Promise(resolve => setTimeout(resolve, 100));
          return { 
            success: true, 
            data: `查询表 ${input.table} 的结果: 找到 5 条记录` 
          };
        },
        tags: ['database', 'query'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      },
      
      // 内部执行工具 - 数学计算
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
      
      // 外部执行工具 - 文件上传
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
          // 这个工具需要外部执行
          return { success: false, error: '需要外部执行' };
        },
        tags: ['file', 'upload'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      },
      
      // 外部执行工具 - 用户界面操作
      {
        name: 'ui_action',
        description: '执行用户界面操作',
        schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: '操作类型（click, input, select等）'
            },
            target: {
              type: 'string',
              description: '操作目标元素'
            },
            value: {
              type: 'string',
              description: '操作值（可选）'
            }
          },
          required: ['action', 'target']
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
        decisionFunction: (toolName: string, args: any, context?: any) => {
          console.log(`🤔 决策函数被调用: ${toolName}`, { args, context });
          
          // 基于工具名称的决策
          if (toolName.includes('database') || toolName.includes('calculator')) {
            return ToolExecutionMode.INTERNAL;
          }
          
          if (toolName.includes('file') || toolName.includes('ui')) {
            return ToolExecutionMode.OUTSIDE;
          }
          
          // 基于用户消息的决策
          const userMessage = context?.userMessage?.toLowerCase() || '';
          if (userMessage.includes('上传') || userMessage.includes('点击') || userMessage.includes('选择')) {
            return ToolExecutionMode.OUTSIDE;
          }
          
          if (userMessage.includes('查询') || userMessage.includes('计算') || userMessage.includes('分析')) {
            return ToolExecutionMode.INTERNAL;
          }
          
          // 基于会话上下文的决策
          const sessionContext = context?.sessionContext;
          if (sessionContext?.requireExternalExecution) {
            return ToolExecutionMode.OUTSIDE;
          }
          
          if (sessionContext?.requireInternalExecution) {
            return ToolExecutionMode.INTERNAL;
          }
          
          // 默认内部执行
          return ToolExecutionMode.INTERNAL;
        },
        defaultMode: ToolExecutionMode.INTERNAL
      }
    }
  });

  // 初始化 Agent
  agent.initialize();

  console.log('✅ Agent 初始化完成，支持自主控制工具执行\n');

  // 演示 1: 内部执行 - 数据库查询
  console.log('=== 演示 1: 内部执行 - 数据库查询 ===');
  try {
    const result1 = await agent.invoke({
      messages: [{ role: 'user', content: '请查询用户表中的所有记录' }],
      metadata: { 
        threadId: 'demo-1',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('查询结果:', result1);
    console.log('执行统计:', agent.getToolExecutionStats());
  } catch (error) {
    console.error('查询错误:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 演示 2: 内部执行 - 数学计算
  console.log('=== 演示 2: 内部执行 - 数学计算 ===');
  try {
    const result2 = await agent.invoke({
      messages: [{ role: 'user', content: '请计算 15 * 8 + 42 的结果' }],
      metadata: { 
        threadId: 'demo-2',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('计算结果:', result2);
    console.log('执行统计:', agent.getToolExecutionStats());
  } catch (error) {
    console.error('计算错误:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 演示 3: 外部执行 - 文件上传
  console.log('=== 演示 3: 外部执行 - 文件上传 ===');
  try {
    const result3 = await agent.invoke({
      messages: [{ role: 'user', content: '请上传文件 /path/to/document.pdf' }],
      metadata: { 
        threadId: 'demo-3',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('上传结果:', result3);
    
    // 获取待执行的工具调用
    const pendingCalls = agent.getPendingToolCalls();
    console.log('待执行的工具调用:', pendingCalls);
    
    // 模拟外部执行完成
    if (pendingCalls.length > 0) {
      const toolCall = pendingCalls[0];
      console.log(`\n🔄 模拟外部执行工具: ${toolCall.toolCall.name}`);
      
      // 模拟执行结果
      const mockResult = {
        success: true,
        data: {
          fileId: 'file_12345',
          fileName: 'document.pdf',
          fileSize: '2.5MB',
          uploadTime: new Date().toISOString()
        }
      };
      
      // 处理外部执行结果
      await agent.handleOutsideToolResult(toolCall.toolCall.id, mockResult);
      console.log('✅ 外部执行完成');
    }
    
    console.log('执行统计:', agent.getToolExecutionStats());
  } catch (error) {
    console.error('上传错误:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 演示 4: 外部执行 - UI 操作
  console.log('=== 演示 4: 外部执行 - UI 操作 ===');
  try {
    const result4 = await agent.invoke({
      messages: [{ role: 'user', content: '请点击登录按钮' }],
      metadata: { 
        threadId: 'demo-4',
        sessionContext: { 
          userId: 'user123',
          requireExternalExecution: true // 强制外部执行
        }
      }
    });
    
    console.log('UI操作结果:', result4);
    
    // 获取待执行的工具调用
    const pendingCalls = agent.getPendingToolCalls();
    console.log('待执行的工具调用:', pendingCalls);
    
    // 模拟外部执行完成
    if (pendingCalls.length > 0) {
      const toolCall = pendingCalls[0];
      console.log(`\n🔄 模拟外部执行工具: ${toolCall.toolCall.name}`);
      
      // 模拟执行结果
      const mockResult = {
        success: true,
        data: {
          action: 'click',
          target: 'login-button',
          result: '登录页面已跳转',
          timestamp: new Date().toISOString()
        }
      };
      
      // 处理外部执行结果
      await agent.handleOutsideToolResult(toolCall.toolCall.id, mockResult);
      console.log('✅ 外部执行完成');
    }
    
    console.log('执行统计:', agent.getToolExecutionStats());
  } catch (error) {
    console.error('UI操作错误:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 演示 5: 运行时切换执行模式
  console.log('=== 演示 5: 运行时切换执行模式 ===');
  
  // 切换到外部执行模式
  console.log('🔄 切换到外部执行模式...');
  agent.setToolExecutionMode(ToolExecutionMode.OUTSIDE);
  
  try {
    const result5 = await agent.invoke({
      messages: [{ role: 'user', content: '请计算 100 / 4 的结果' }],
      metadata: { 
        threadId: 'demo-5',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('外部模式计算结果:', result5);
    console.log('执行统计:', agent.getToolExecutionStats());
  } catch (error) {
    console.error('外部模式计算错误:', error);
  }

  // 切换回内部执行模式
  console.log('\n🔄 切换回内部执行模式...');
  agent.setToolExecutionMode(ToolExecutionMode.INTERNAL);
  
  try {
    const result6 = await agent.invoke({
      messages: [{ role: 'user', content: '请计算 200 / 8 的结果' }],
      metadata: { 
        threadId: 'demo-6',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('内部模式计算结果:', result6);
    console.log('执行统计:', agent.getToolExecutionStats());
  } catch (error) {
    console.error('内部模式计算错误:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 演示 6: 查看决策历史
  console.log('=== 演示 6: 查看决策历史 ===');
  const decisionHistory = agent.getDecisionHistory();
  console.log('决策历史:', decisionHistory);
  
  // 查看特定工具的决策历史
  const calculatorHistory = agent.getDecisionHistory('calculator');
  console.log('计算器工具的决策历史:', calculatorHistory);

  console.log('\n' + '='.repeat(60) + '\n');

  // 演示 7: 自定义决策函数
  console.log('=== 演示 7: 自定义决策函数 ===');
  
  // 设置自定义决策函数
  agent.setDynamicControl(true, (toolName: string, args: any, context?: any) => {
    console.log(`🎯 自定义决策函数: ${toolName}`, { args, context });
    
    // 基于参数内容的决策
    if (args.expression && args.expression.includes('complex')) {
      return ToolExecutionMode.OUTSIDE; // 复杂计算外部执行
    }
    
    if (args.table && args.table.includes('sensitive')) {
      return ToolExecutionMode.OUTSIDE; // 敏感数据外部执行
    }
    
    // 基于时间的决策（模拟）
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      return ToolExecutionMode.OUTSIDE; // 夜间外部执行
    }
    
    return ToolExecutionMode.INTERNAL; // 默认内部执行
  });
  
  try {
    const result7 = await agent.invoke({
      messages: [{ role: 'user', content: '请计算复杂的数学表达式: 2^10 + sqrt(144)' }],
      metadata: { 
        threadId: 'demo-7',
        sessionContext: { userId: 'user123' }
      }
    });
    
    console.log('自定义决策结果:', result7);
    console.log('执行统计:', agent.getToolExecutionStats());
  } catch (error) {
    console.error('自定义决策错误:', error);
  }

  console.log('\n🎉 完整的 Agent 工具控制演示完成！');
  console.log('\n📊 最终统计:');
  console.log(agent.getToolExecutionStats());
}

// 运行演示
if (require.main === module) {
  completeToolControlDemo().catch(console.error);
}

export { completeToolControlDemo };
