// test-quick-chat.mts - 快速测试西城咖啡工具 Chat API

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { WestoreCafeTools } from '../examples/tool-demo/westore-cafe-tools.js';

console.log('☕ 快速测试西城咖啡工具 Chat API...\n');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function quickTest() {
  try {
    // 1. 获取工具列表
    console.log('📦 获取西城咖啡工具列表...');
    const tools = WestoreCafeTools.getAll();
    const toolNames = tools.map(tool => tool.name);
    console.log(`✅ 可用工具: ${toolNames.join(', ')}\n`);

    // 2. 测试简单对话
    console.log('💬 测试简单对话...');
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '看一下我的购物车。',
        // message: '推荐一些咖啡。',
        // message: '你有什么工具可以调用？',
        model: {
          name: 'deepseek-chat',
          temperature: 0,
          baseURL: process.env.OPENAI_BASE_URL,
          apiKey: process.env.OPENAI_API_KEY
        },
        memory: { enabled: true },
        streaming: false,
        tools: toolNames, // 只传递工具名称; // TEST 实际无用
        toolExecutionConfig: {  // INFO 这种实际并不属于 tool-hub 的职能。
          // mode: 'internal',
          mode: 'outside',  // TEST 外部执行模式
          internalConfig: {
            enableCache: true,
            cacheTtl: 300000,
            maxRetries: 3
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 对话成功', result.data);
      console.log('🤖 助手回复:', result.data.content);
      
      if (result.data.toolCalls && result.data.toolCalls.length > 0) {
        console.log('🔧 工具调用:');
        result.data.toolCalls.forEach((tc: any, index: number) => {
          console.log(`  ${index + 1}. ${tc.toolName}:`, tc.args);
        });
      }
      
      if (result.data.metadata && result.data.metadata.toolsUsed) {
        console.log('📊 使用的工具:', result.data.metadata.toolsUsed);
      }
    } else {
      console.log('❌ 对话失败:', result.error);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

quickTest();
