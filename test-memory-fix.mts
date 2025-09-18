// test-memory-fix.mts - 测试LangGraph记忆修复效果

import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:3000/api';

async function testMemoryFix() {
  console.log('🧪 开始测试LangGraph记忆修复效果...\n');

  const threadId = `test_thread_${Date.now()}`;
  
  try {
    // 第一次对话
    console.log('📝 第一次对话...');
    const response1 = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '你好，我是张三，我想买一杯咖啡',
        threadId: threadId,
        memoryMode: 'lg'
      })
    });

    const result1 = await response1.json();
    console.log('✅ 第一次对话结果:');
    console.log(`   内容: ${result1.data.content.substring(0, 100)}...`);
    console.log(`   Thread ID: ${result1.data.metadata.threadId}`);
    console.log(`   记忆模式: ${result1.data.metadata.memoryMode}`);
    console.log(`   总消息数: ${result1.data.metadata.totalMessages}\n`);

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 第二次对话 - 测试记忆恢复
    console.log('📝 第二次对话（测试记忆恢复）...');
    const response2 = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '我刚才说了什么？',
        threadId: threadId,
        memoryMode: 'lg'
      })
    });

    const result2 = await response2.json();
    console.log('✅ 第二次对话结果:');
    console.log(`   内容: ${result2.data.content.substring(0, 200)}...`);
    console.log(`   Thread ID: ${result2.data.metadata.threadId}`);
    console.log(`   记忆模式: ${result2.data.metadata.memoryMode}`);
    console.log(`   总消息数: ${result2.data.metadata.totalMessages}\n`);

    // 检查Agent缓存状态
    console.log('🔍 检查Agent缓存状态...');
    const cacheResponse = await fetch(`${API_BASE}/agents/cache`);
    const cacheResult = await cacheResponse.json();
    console.log('✅ Agent缓存状态:');
    console.log(`   总Agent数: ${cacheResult.data.totalAgents}`);
    console.log(`   Thread列表: ${cacheResult.data.agents.map((a: any) => a.threadId).join(', ')}\n`);

    // 调试LG记忆状态
    console.log('🔍 调试LG记忆状态...');
    const debugResponse = await fetch(`${API_BASE}/agents/${threadId}/memory/debug`);
    const debugResult = await debugResponse.json();
    console.log('✅ LG记忆调试信息:');
    console.log(`   Thread ID: ${debugResult.data.threadId}`);
    console.log(`   Checkpointer启用: ${debugResult.data.checkpointerEnabled}`);
    console.log(`   当前消息数: ${debugResult.data.currentState?.messageCount || 0}`);
    console.log(`   消息列表: ${JSON.stringify(debugResult.data.currentState?.messages?.map((m: any) => ({
      type: m.type,
      content: m.content.substring(0, 50) + '...'
    })), null, 2)}\n`);

    // 第三次对话 - 进一步测试
    console.log('📝 第三次对话（进一步测试记忆）...');
    const response3 = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '请推荐一款适合我的咖啡',
        threadId: threadId,
        memoryMode: 'lg'
      })
    });

    const result3 = await response3.json();
    console.log('✅ 第三次对话结果:');
    console.log(`   内容: ${result3.data.content.substring(0, 200)}...`);
    console.log(`   总消息数: ${result3.data.metadata.totalMessages}\n`);

    // 最终检查
    console.log('🔍 最终记忆状态检查...');
    const finalDebugResponse = await fetch(`${API_BASE}/agents/${threadId}/memory/debug`);
    const finalDebugResult = await finalDebugResponse.json();
    console.log('✅ 最终LG记忆状态:');
    console.log(`   消息总数: ${finalDebugResult.data.currentState?.messageCount || 0}`);
    
    if (finalDebugResult.data.currentState?.messageCount > 1) {
      console.log('🎉 记忆功能正常工作！消息历史已正确保存和恢复。');
    } else {
      console.log('❌ 记忆功能可能仍有问题，消息历史没有正确保存。');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testMemoryFix().catch(console.error);
