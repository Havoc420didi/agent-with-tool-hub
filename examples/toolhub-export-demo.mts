// toolhub-export-demo.mts
// 演示 ToolHub 集成适配器后的导出功能

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { createToolHub } from '../src/tool-hub/index';
import { createAgent } from '../src/core/agent-builder';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

console.log('🚀 ToolHub 适配器集成演示\n');

// 创建 ToolHub 实例
const toolHub = createToolHub();

// 定义示例工具
const weatherTool = {
  name: 'get_weather',
  description: '获取指定地点的当前天气信息',
  schema: z.object({
    location: z.string().describe("要查询天气的地点名称"),
  }),
  handler: async (input: any) => {
    const weatherData = {
      '旧金山': '60度，有雾',
      '纽约': '90度，阳光明媚',
      '北京': '25度，多云',
      '上海': '28度，小雨'
    };
    
    const location = input.location.toLowerCase();
    const weather = weatherData[location] || `${input.location}现在是75度，天气晴朗`;
    
    return { success: true, data: weather };
  },
  enabled: true,
  category: 'weather',
  tags: ['weather', 'api']
};

const cityTool = {
  name: 'get_coolest_cities',
  description: '获取最酷炫的城市列表',
  schema: z.object({
    limit: z.number().optional().describe("返回城市数量限制"),
  }),
  handler: async (input: any) => {
    const cities = ['纽约', '旧金山', '北京', '上海', '东京', '伦敦'];
    const limit = input.limit || cities.length;
    return { 
      success: true, 
      data: cities.slice(0, limit).join(', ') 
    };
  },
  enabled: true,
  category: 'travel',
  tags: ['cities', 'travel']
};

// 注册工具到 ToolHub
console.log('📝 注册工具到 ToolHub...');
toolHub.registerBatch([weatherTool, cityTool]);

// 演示 1: 查看支持的导出格式
console.log('\n=== 支持的导出格式 ===');
const formats = toolHub.getSupportedFormats();
console.log('可用格式:', formats);

// 演示 2: 导出为不同格式
console.log('\n=== 导出为不同格式 ===');

// LangChain 格式
console.log('🌐 LangChain 格式:');
const langchainTools = toolHub.exportTools('langchain');
console.log(`- 导出 ${langchainTools.length} 个工具`);
console.log(`- 工具名称: ${langchainTools.map(t => t.name).join(', ')}`);

// 通用格式
console.log('\n🔧 通用格式:');
const genericTools = toolHub.exportTools('generic');
console.log(`- 导出 ${genericTools.length} 个工具`);
console.log(`- 工具名称: ${genericTools.map(t => t.name).join(', ')}`);

// OpenAI 格式
console.log('\n🤖 OpenAI 格式:');
const openaiTools = toolHub.exportTools('openai');
console.log(`- 导出 ${openaiTools.length} 个工具`);
console.log(`- 工具名称: ${openaiTools.map(t => t.function.name).join(', ')}`);

// 演示 3: 创建 Agent 并使用导出的工具
console.log('\n=== 创建 Agent 并使用导出的工具 ===');

const agent = createAgent({
  model: {
    name: "deepseek-chat",
    temperature: 0
  },
  tools: [weatherTool, cityTool], // 这些工具会被 ToolHub 管理
  memory: {
    enabled: false
  }
});

// 初始化 Agent
agent.initialize();

console.log('✅ Agent 创建完成，使用 ToolHub 管理的工具');

// 演示 4: 展示 ToolHub 的适配器管理功能
console.log('\n=== ToolHub 适配器管理 ===');

// 查看已注册的适配器
const adapters = toolHub.getAdapters();
console.log('已注册的适配器:');
adapters.forEach((adapter, name) => {
  console.log(`- ${name}: ${adapter.name} v${adapter.version}`);
  console.log(`  支持框架: ${adapter.supportedFrameworks.join(', ')}`);
});

// 设置默认适配器
console.log('\n设置默认适配器为 generic:');
toolHub.setDefaultAdapter('generic');
const defaultAdapter = toolHub.getDefaultAdapter();
console.log(`当前默认适配器: ${defaultAdapter?.name}`);

// 演示 5: 单个工具导出
console.log('\n=== 单个工具导出 ===');
const singleTool = toolHub.exportTool('get_weather', 'langchain');
console.log('单个工具导出结果:');
console.log(`- 工具名称: ${singleTool?.name}`);
console.log(`- 工具描述: ${singleTool?.description}`);

// 演示 6: 格式验证
console.log('\n=== 格式验证 ===');
const testFormats = ['langchain', 'generic', 'openai', 'unsupported'];
testFormats.forEach(format => {
  const isSupported = toolHub.isFormatSupported(format);
  console.log(`- ${format}: ${isSupported ? '✅ 支持' : '❌ 不支持'}`);
});

console.log('\n🎉 ToolHub 适配器集成演示完成！');
console.log('\n📋 总结:');
console.log('- ✅ 适配器已成功集成到 ToolHub 中');
console.log('- ✅ ToolHub 现在可以直接导出工具为多种格式');
console.log('- ✅ AgentBuilder 使用 ToolHub 的导出功能，不再需要独立的适配器');
console.log('- ✅ 支持动态切换导出格式和适配器管理');
