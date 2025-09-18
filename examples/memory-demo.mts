// memory-demo.mts - 记忆功能演示

import { AgentBuilder } from '../src/core/agent-builder';
import { ChatRequest } from '../src/core/types';

/**
 * 演示API模式的记忆功能
 */
async function demonstrateAPIMode() {
  console.log('🔵 API模式演示 - 客户端控制历史记录');
  console.log('=' .repeat(60));

  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0
    },
    memory: {
      enabled: true,
      mode: 'api',
      maxHistory: 10
    }
  });

  agent.initialize();

  const threadId = 'api_demo_session';
  let chatHistory: any[] = [];

  // 第一轮对话
  console.log('👤 用户: 你好，我叫小明');
  const request1: ChatRequest = {
    message: '你好，我叫小明',
    threadId,
    memoryMode: 'api',
    chatHistory
  };

  const response1 = await agent.invoke(request1);
  console.log('🤖 AI:', response1.content);
  
  // 更新历史记录
  chatHistory.push(
    { type: 'human', content: '你好，我叫小明', timestamp: new Date().toISOString() },
    { type: 'ai', content: response1.content, timestamp: new Date().toISOString() }
  );

  console.log();

  // 第二轮对话 - 带历史记录
  console.log('👤 用户: 你还记得我的名字吗？');
  const request2: ChatRequest = {
    message: '你还记得我的名字吗？',
    threadId,
    memoryMode: 'api',
    chatHistory
  };

  const response2 = await agent.invoke(request2);
  console.log('🤖 AI:', response2.content);
  
  // 更新历史记录
  chatHistory.push(
    { type: 'human', content: '你还记得我的名字吗？', timestamp: new Date().toISOString() },
    { type: 'ai', content: response2.content, timestamp: new Date().toISOString() }
  );

  console.log();

  // 第三轮对话 - 继续带历史记录
  console.log('👤 用户: 我想点一杯咖啡');
  const request3: ChatRequest = {
    message: '我想点一杯咖啡',
    threadId,
    memoryMode: 'api',
    chatHistory
  };

  const response3 = await agent.invoke(request3);
  console.log('🤖 AI:', response3.content);

  console.log('\n📊 API模式统计:');
  const stats = agent.getMemoryStats();
  console.log(JSON.stringify(stats, null, 2));
  console.log();
}

/**
 * 演示LG模式的记忆功能
 */
async function demonstrateLGMode() {
  console.log('🟢 LG模式演示 - 服务端自动管理历史记录');
  console.log('=' .repeat(60));

  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0
    },
    memory: {
      enabled: true,
      mode: 'lg',
      maxHistory: 10
    }
  });

  agent.initialize();

  const threadId = 'lg_demo_session';

  // 第一轮对话
  console.log('👤 用户: 你好，我叫小红');
  const response1 = await agent.invoke('你好，我叫小红', threadId);
  console.log('🤖 AI:', response1.content);
  console.log();

  // 第二轮对话 - LG会自动记住之前的对话
  console.log('👤 用户: 你还记得我的名字吗？');
  const response2 = await agent.invoke('你还记得我的名字吗？', threadId);
  console.log('🤖 AI:', response2.content);
  console.log();

  // 第三轮对话
  console.log('👤 用户: 我想点一杯茶');
  const response3 = await agent.invoke('我想点一杯茶', threadId);
  console.log('🤖 AI:', response3.content);

  console.log('\n📊 LG模式统计:');
  const stats = agent.getMemoryStats();
  console.log(JSON.stringify(stats, null, 2));
  console.log();
}

/**
 * 演示记忆管理功能
 */
async function demonstrateMemoryManagement() {
  console.log('🛠️ 记忆管理功能演示');
  console.log('=' .repeat(60));

  const agent = new AgentBuilder({
    model: {
      name: 'deepseek-chat',
      temperature: 0
    },
    memory: {
      enabled: true,
      mode: 'api',
      maxHistory: 5
    }
  });

  agent.initialize();

  const threadId = 'management_demo';

  // 创建一些对话历史
  for (let i = 1; i <= 3; i++) {
    await agent.invoke(`这是第${i}条消息`, threadId);
  }

  // 获取历史记录
  console.log('📚 获取历史记录:');
  const history = await agent.getChatHistory(threadId);
  console.log(`历史记录数量: ${history.length}`);
  history.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.type}] ${msg.content}`);
  });
  console.log();

  // 获取会话列表
  console.log('🗂️ 获取会话列表:');
  const threads = await agent.getThreads();
  console.log('所有会话:', threads);
  console.log();

  // 清空历史记录
  console.log('🗑️ 清空历史记录:');
  await agent.clearChatHistory(threadId);
  const clearedHistory = await agent.getChatHistory(threadId);
  console.log(`清空后历史记录数量: ${clearedHistory.length}`);
  console.log();
}

/**
 * 主演示函数
 */
async function main() {
  console.log('🧠 记忆功能演示程序');
  console.log('本程序将演示两种记忆对话上下文的方式\n');

  try {
    await demonstrateAPIMode();
    await demonstrateLGMode();
    await demonstrateMemoryManagement();

    console.log('✅ 演示完成！');
    console.log('\n📖 更多信息请查看: docs/MEMORY_USAGE.md');
    console.log('🧪 运行测试: npx tsx tests/test-memory.mts');
  } catch (error) {
    console.error('❌ 演示失败:', error);
  }
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { demonstrateAPIMode, demonstrateLGMode, demonstrateMemoryManagement };
