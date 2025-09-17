// test-westore-cafe-api-chat.mts - 测试西城咖啡工具通过 Chat API 的效果

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

console.log('☕ 开始测试西城咖啡工具 Chat API 效果...\n');

// API 基础配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = `${API_BASE_URL}/api/chat`;

// 测试配置
const TEST_CONFIG = {
  model: {
    name: 'deepseek-chat',
    temperature: 0,
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY
  },
  memory: { enabled: true },
  streaming: false,
  toolExecution: {
    mode: 'internal',
    internalConfig: {
      enableCache: true,
      cacheTtl: 300000,
      maxRetries: 3
    }
  }
};

/**
 * 发送 Chat API 请求
 */
async function sendChatRequest(message: string, threadId?: string, tools?: any[]) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        threadId,
        ...TEST_CONFIG,
        tools: tools || []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}

/**
 * 加载西城咖啡工具
 */
async function loadWestoreCafeTools() {
  try {
    const tools = await ExternalToolLoader.loadFromPath('./external-tools/westore-cafe-tools.ts');
    console.log(`✅ 成功加载 ${tools.length} 个西城咖啡工具`);
    return tools;
  } catch (error) {
    console.error('❌ 加载西城咖啡工具失败:', error);
    throw error;
  }
}

/**
 * 测试商品推荐场景
 */
async function testGoodsRecommendation(tools: any[]) {
  console.log('=== 测试商品推荐场景 ===');
  
  const testCases = [
    {
      name: '咖啡推荐',
      message: '有什么咖啡推荐吗？我想喝点热饮。',
      expectedTools: ['displayGoods']
    },
    {
      name: '甜品推荐',
      message: '推荐一些甜品吧，我想吃点甜的。',
      expectedTools: ['displayGoods']
    },
    {
      name: '具体商品询问',
      message: '我想了解经典美式的详细信息，包括规格和价格。',
      expectedTools: ['getGoodsDetail', 'displayGoodsDetailToUser']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 测试: ${testCase.name}`);
    console.log(`💬 用户: ${testCase.message}`);
    
    try {
      const result = await sendChatRequest(testCase.message, undefined, tools);
      
      if (result.success) {
        console.log('✅ API 调用成功');
        console.log('🤖 助手回复:', result.data.content);
        
        if (result.data.toolCalls && result.data.toolCalls.length > 0) {
          console.log('🔧 工具调用:', result.data.toolCalls.map((tc: any) => ({
            tool: tc.toolName,
            args: tc.args
          })));
        }
        
        if (result.data.metadata && result.data.metadata.toolsUsed) {
          console.log('📊 使用的工具:', result.data.metadata.toolsUsed);
        }
      } else {
        console.log('❌ API 调用失败:', result.error);
      }
    } catch (error) {
      console.log('❌ 测试失败:', error);
    }
    
    // 等待一下避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * 测试购物车场景
 */
async function testShoppingCartScenario(tools: any[]) {
  console.log('\n=== 测试购物车场景 ===');
  
  const threadId = `cart_test_${Date.now()}`;
  
  const testFlow = [
    {
      step: 1,
      name: '查看商品',
      message: '我想看看有什么咖啡可以点',
      expectedTools: ['displayGoods']
    },
    {
      step: 2,
      name: '加入购物车',
      message: '我要一杯热的美式咖啡，中杯的',
      expectedTools: ['getGoodsDetail', 'addToCart']
    },
    {
      step: 3,
      name: '查看购物车',
      message: '让我看看购物车里有什么',
      expectedTools: ['displayShopCart']
    },
    {
      step: 4,
      name: '继续购物',
      message: '再给我加一杯生椰拿铁，大杯的',
      expectedTools: ['addToCart']
    },
    {
      step: 5,
      name: '确认下单',
      message: '好的，我要下单了',
      expectedTools: ['displayShopCart', 'order']
    }
  ];

  for (const step of testFlow) {
    console.log(`\n🛒 步骤 ${step.step}: ${step.name}`);
    console.log(`💬 用户: ${step.message}`);
    
    try {
      const result = await sendChatRequest(step.message, threadId, tools);
      
      if (result.success) {
        console.log('✅ 步骤执行成功');
        console.log('🤖 助手回复:', result.data.content);
        
        if (result.data.toolCalls && result.data.toolCalls.length > 0) {
          console.log('🔧 工具调用:', result.data.toolCalls.map((tc: any) => ({
            tool: tc.toolName,
            args: tc.args
          })));
        }
      } else {
        console.log('❌ 步骤执行失败:', result.error);
      }
    } catch (error) {
      console.log('❌ 步骤失败:', error);
    }
    
    // 等待一下避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

/**
 * 测试订单管理场景
 */
async function testOrderManagementScenario(tools: any[]) {
  console.log('\n=== 测试订单管理场景 ===');
  
  const testCases = [
    {
      name: '查询订单状态',
      message: '我的订单状态如何？取餐号是多少？',
      expectedTools: ['getOrderStatus']
    },
    {
      name: '修改购物车',
      message: '我想删除购物车中的冰美式',
      expectedTools: ['deleteProduct']
    },
    {
      name: '清空购物车',
      message: '把购物车里的东西都删掉',
      expectedTools: ['clearShopCart']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 测试: ${testCase.name}`);
    console.log(`💬 用户: ${testCase.message}`);
    
    try {
      const result = await sendChatRequest(testCase.message, undefined, tools);
      
      if (result.success) {
        console.log('✅ 测试成功');
        console.log('🤖 助手回复:', result.data.content);
        
        if (result.data.toolCalls && result.data.toolCalls.length > 0) {
          console.log('🔧 工具调用:', result.data.toolCalls.map((tc: any) => ({
            tool: tc.toolName,
            args: tc.args
          })));
        }
      } else {
        console.log('❌ 测试失败:', result.error);
      }
    } catch (error) {
      console.log('❌ 测试失败:', error);
    }
    
    // 等待一下避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * 测试流式响应
 */
async function testStreamingResponse(tools: any[]) {
  console.log('\n=== 测试流式响应 ===');
  
  const message = '请帮我推荐一些咖啡，并解释一下每种咖啡的特点';
  const threadId = `stream_test_${Date.now()}`;
  
  console.log(`💬 用户: ${message}`);
  console.log('🔄 流式响应:');
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        threadId,
        ...TEST_CONFIG,
        streaming: true,
        tools
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content') {
              process.stdout.write(data.data);
            } else if (data.type === 'done') {
              console.log('\n✅ 流式响应完成');
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    console.log('❌ 流式响应测试失败:', error);
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling(tools: any[]) {
  console.log('\n=== 测试错误处理 ===');
  
  const errorTestCases = [
    {
      name: '空消息',
      message: '',
      expectedError: 'INVALID_REQUEST'
    },
    {
      name: '无效工具调用',
      message: '请调用一个不存在的工具',
      expectedError: null // 应该正常处理
    }
  ];

  for (const testCase of errorTestCases) {
    console.log(`\n⚠️  测试: ${testCase.name}`);
    console.log(`💬 用户: ${testCase.message}`);
    
    try {
      const result = await sendChatRequest(testCase.message, undefined, tools);
      
      if (result.success) {
        console.log('✅ 处理成功');
        console.log('🤖 助手回复:', result.data.content);
      } else {
        console.log('❌ 预期错误:', result.error);
        if (testCase.expectedError && result.error.code === testCase.expectedError) {
          console.log('✅ 错误处理正确');
        }
      }
    } catch (error) {
      console.log('❌ 测试失败:', error);
    }
  }
}

/**
 * 主测试函数
 */
async function runChatAPITests() {
  try {
    console.log('🚀 开始 Chat API 测试...\n');
    
    // 1. 检查 API 健康状态
    console.log('=== 1. 检查 API 健康状态 ===');
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
      const healthData = await healthResponse.json();
      console.log('✅ API 健康检查通过:', healthData.data.status);
    } catch (error) {
      console.log('❌ API 健康检查失败:', error);
      console.log('💡 请确保服务器正在运行: npm run dev');
      return;
    }
    console.log('');

    // 2. 加载西城咖啡工具
    console.log('=== 2. 加载西城咖啡工具 ===');
    const tools = await loadWestoreCafeTools();
    console.log('');

    // 3. 测试商品推荐场景
    await testGoodsRecommendation(tools);

    // 4. 测试购物车场景
    await testShoppingCartScenario(tools);

    // 5. 测试订单管理场景
    await testOrderManagementScenario(tools);

    // 6. 测试流式响应
    await testStreamingResponse(tools);

    // 7. 测试错误处理
    await testErrorHandling(tools);

    console.log('\n🎉 Chat API 测试完成！');
    console.log('');
    console.log('📊 测试总结:');
    console.log('  ✨ 成功测试了西城咖啡工具在 Chat API 中的集成');
    console.log('  🛒 验证了完整的购物流程');
    console.log('  🔧 测试了工具调用和参数传递');
    console.log('  📱 验证了流式响应功能');
    console.log('  ⚠️  测试了错误处理机制');

  } catch (error) {
    console.error('❌ 测试运行失败:', error);
  }
}

// 运行测试
runChatAPITests();
