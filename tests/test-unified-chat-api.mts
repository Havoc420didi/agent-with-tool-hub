// test-unified-chat-api.mts - 测试统一的 Chat API

import { AgentService } from '../src/services/agent.service';
import { ToolExecutionMode } from '../src/core/types';

async function testUnifiedChatAPI() {
  console.log('🧪 开始测试统一的 Chat API...\n');

  const service = new AgentService();
  const threadId = `unified_test_${Date.now()}`;

  try {
    // 0. 先创建 Agent
    console.log('0️⃣ 创建 Agent...');
    const createResult = await service.createAgent(threadId, {
      model: {
        name: 'deepseek-chat',
        temperature: 0,
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY
      },
      memory: { enabled: true, mode: 'lg' },
      toolExecutionConfig: {
        mode: 'internal',
        internalConfig: {
          enableCache: true,
          cacheTtl: 300000,
          maxRetries: 3
        }
      }
    });

    if (!createResult.success) {
      throw new Error(`创建 Agent 失败: ${createResult.error?.message}`);
    }
    console.log('✅ Agent 创建成功');

    // 1. 测试用户消息（内部执行模式）
    console.log('\n1️⃣ 测试用户消息（内部执行模式）...');
    const userMessageResult = await service.chat(threadId, {
      message: '你好，请介绍一下你自己',
      threadId,
      config: {
        messageType: 'user'
      }
    });

    if (userMessageResult.success) {
      console.log('✅ 用户消息处理成功:', {
        content: userMessageResult.data?.content?.substring(0, 100) + '...',
        metadata: userMessageResult.data?.metadata
      });
    } else {
      console.error('❌ 用户消息处理失败:', userMessageResult.error);
    }

    // 2. 测试用户消息（外部执行模式）
    console.log('\n2️⃣ 测试用户消息（外部执行模式）...');
    const externalUserResult = await service.chat(threadId, {
      message: '帮我查询咖啡菜单',
      threadId,
      config: {
        messageType: 'user',
        toolExecutionConfig: {
          mode: 'outside',
          outsideConfig: {
            waitForResult: false,
            timeout: 30000
          }
        }
      }
    });

    if (externalUserResult.success) {
      console.log('✅ 外部执行模式用户消息处理成功:', {
        content: externalUserResult.data?.content,
        toolCalls: externalUserResult.data?.toolCalls,
        pendingToolCalls: externalUserResult.data?.metadata?.pendingToolCalls,
        executionMode: externalUserResult.data?.metadata?.executionMode
      });

        // 3. 测试工具执行结果
        if (externalUserResult.data?.metadata?.pendingToolCalls?.length > 0) {
          console.log('\n3️⃣ 测试工具执行结果...');
          
          const mockToolResult = JSON.stringify({
            success: true,
            data: {
              menu: [
                { name: '美式咖啡', price: 25, description: '经典美式咖啡' },
                { name: '拿铁', price: 30, description: '香浓拿铁咖啡' },
                { name: '卡布奇诺', price: 28, description: '经典卡布奇诺' }
              ]
            }
          });

          const toolResultResponse = await service.chat(threadId, {
            message: mockToolResult, // 直接使用 message 字段传递工具结果
            threadId,
            config: {
              messageType: 'tool',
              toolExecutionConfig: {
                mode: 'outside',
                outsideConfig: {
                  waitForResult: false,
                  timeout: 30000
                }
              }
            }
          });

        if (toolResultResponse.success) {
          console.log('✅ 工具执行结果处理成功:', {
            content: toolResultResponse.data?.content,
            metadata: toolResultResponse.data?.metadata
          });
        } else {
          console.error('❌ 工具执行结果处理失败:', toolResultResponse.error);
        }
      }
    } else {
      console.error('❌ 外部执行模式用户消息处理失败:', externalUserResult.error);
    }

    // 4. 测试自动消息类型检测
    console.log('\n4️⃣ 测试自动消息类型检测...');
    
    // 测试自动检测用户消息
    const autoUserResult = await service.chat(threadId, {
      message: '请告诉我今天的天气',
      threadId,
      config: {
        messageType: 'auto', // 自动检测
        externalToolExecution: false
      }
    });

    if (autoUserResult.success) {
      console.log('✅ 自动检测用户消息成功:', {
        content: autoUserResult.data?.content?.substring(0, 100) + '...'
      });
    }

    // 测试工具消息
    const toolMessageResult = await service.chat(threadId, {
      message: JSON.stringify({ success: true, data: '测试结果' }),
      threadId,
      config: {
        mode: 'outside',
        outsideConfig: {
          waitForResult: false,
          timeout: 30000
        }
      },
    });

    if (toolMessageResult.success) {
      console.log('✅ 工具消息处理成功:', {
        content: toolMessageResult.data?.content?.substring(0, 100) + '...'
      });
    }

    // 5. 清理
    console.log('\n5️⃣ 清理测试数据...');
    await service.deleteAgent(threadId);
    console.log('✅ 测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    
    // 清理
    try {
      await service.deleteAgent(threadId);
    } catch (cleanupError) {
      console.error('清理失败:', cleanupError);
    }
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnifiedChatAPI().catch(console.error);
}

export { testUnifiedChatAPI };
