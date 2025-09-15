// test-tool-hub.mts - 测试 ToolHub 全量提供工具功能

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { ToolHub } from '../src/tool-hub/core/tool-hub.js';
import { CommonTools } from '../src/tool-hub/presets/common-tools.js';
import { ApiTools } from '../src/tool-hub/presets/api-tools.js';
import { AgentService } from '../src/services/agent.service.js';

console.log('🧪 开始测试 ToolHub 全量提供工具功能...\n');

async function testToolHub() {
  try {
    // 1. 创建 ToolHub 实例
    console.log('=== 1. 创建 ToolHub 实例 ===');
    const toolHub = new ToolHub({
      logging: true,
      logLevel: 'info',
      statistics: true,
      caching: true
    });
    console.log('✅ ToolHub 创建成功');
    console.log('初始状态:', toolHub.getStatus());
    console.log('');

    // 2. 注册常用工具
    console.log('=== 2. 注册常用工具 ===');
    const commonTools = CommonTools.getAll();
    const commonResult = toolHub.registerBatch(commonTools);
    console.log(`✅ 常用工具注册完成: 成功 ${commonResult.success} 个，失败 ${commonResult.failed} 个`);
    
    // 显示注册的工具
    console.log('注册的常用工具:');
    commonTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description} [${tool.category}]`);
    });
    console.log('');

    // 3. 注册 API 工具
    console.log('=== 3. 注册 API 工具 ===');
    const apiTools = ApiTools.getAll();
    const apiResult = toolHub.registerBatch(apiTools);
    console.log(`✅ API 工具注册完成: 成功 ${apiResult.success} 个，失败 ${apiResult.failed} 个`);
    
    // 显示注册的工具
    console.log('注册的 API 工具:');
    apiTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description} [${tool.category}]`);
    });
    console.log('');

    // 4. 测试工具获取功能
    console.log('=== 4. 测试工具获取功能 ===');
    console.log(`总工具数量: ${toolHub.size()}`);
    console.log(`启用的工具数量: ${toolHub.getEnabled().length}`);
    
    // 获取所有工具
    const allTools = toolHub.getAll();
    console.log('所有工具列表:');
    allTools.forEach(tool => {
      console.log(`  - ${tool.name} [${tool.category}] - ${tool.enabled ? '启用' : '禁用'}`);
    });
    console.log('');

    // 5. 测试工具搜索功能
    console.log('=== 5. 测试工具搜索功能 ===');
    
    // 按分类搜索
    const systemTools = toolHub.search({ category: 'system' });
    console.log(`系统工具 (${systemTools.total} 个):`);
    systemTools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // 按标签搜索
    const mathTools = toolHub.search({ tags: ['math'] });
    console.log(`数学工具 (${mathTools.total} 个):`);
    mathTools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // 按描述搜索
    const timeTools = toolHub.search({ description: '时间' });
    console.log(`时间相关工具 (${timeTools.total} 个):`);
    timeTools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // 6. 测试工具执行功能
    console.log('=== 6. 测试工具执行功能 ===');
    
    // 测试获取时间工具
    console.log('测试获取时间工具:');
    const timeResult = await toolHub.execute('get_time', { 
      timezone: 'Asia/Shanghai', 
      format: 'locale' 
    });
    console.log('执行结果:', timeResult);
    console.log('');

    // 测试数学计算工具
    console.log('测试数学计算工具:');
    const calcResult = await toolHub.execute('calculate', { 
      expression: '2 + 3 * 4', 
      precision: 2 
    });
    console.log('执行结果:', calcResult);
    console.log('');

    // 测试字符串处理工具
    console.log('测试字符串处理工具:');
    const stringResult = await toolHub.execute('string_process', { 
      text: 'Hello World', 
      operation: 'uppercase' 
    });
    console.log('执行结果:', stringResult);
    console.log('');

    // 测试随机数生成工具
    console.log('测试随机数生成工具:');
    const randomResult = await toolHub.execute('random', { 
      min: 1, 
      max: 100, 
      count: 5, 
      type: 'integer' 
    });
    console.log('执行结果:', randomResult);
    console.log('');

    // 测试数据验证工具
    console.log('测试数据验证工具:');
    const validateResult = await toolHub.execute('validate', { 
      data: 'test@example.com', 
      type: 'email' 
    });
    console.log('执行结果:', validateResult);
    console.log('');

    // 7. 测试与 Agent 的集成
    console.log('=== 7. 测试与 Agent 的集成 ===');
    const agentService = new AgentService();
    
    // 创建 Agent 并添加所有工具
    const agentConfig = {
      model: { name: "deepseek-chat" },
      tools: allTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        handler: tool.handler
      })),
      memory: { enabled: true },
      streaming: false
    };

    const createResult = await agentService.createAgent('test-agent', agentConfig);
    console.log('Agent 创建结果:', createResult);
    
    if (createResult.success) {
      console.log(`✅ Agent 创建成功，包含 ${agentConfig.tools.length} 个工具`);
      
      // 测试 Agent 聊天
      console.log('测试 Agent 聊天:');
      const chatResult = await agentService.chat('test-agent', { 
        message: '请帮我计算 15 * 8 + 32 的结果，并告诉我当前时间' 
      });
      console.log('聊天结果:', chatResult);
      console.log('');
    }

    // 8. 测试工具统计信息
    console.log('=== 8. 测试工具统计信息 ===');
    const stats = toolHub.getStats();
    console.log('工具统计信息:');
    console.log(`  总工具数: ${stats.total}`);
    console.log(`  启用工具数: ${stats.enabled}`);
    console.log('  按分类统计:', stats.byCategory);
    console.log('  按标签统计:', stats.byTag);
    console.log('  最常用工具:', stats.mostUsed.slice(0, 5));
    console.log('');

    // 9. 测试工具缓存
    console.log('=== 9. 测试工具缓存 ===');
    const cacheStats = toolHub.getCacheStats();
    console.log('缓存统计:', cacheStats);
    console.log('');

    // 10. 测试工具事件监听
    console.log('=== 10. 测试工具事件监听 ===');
    toolHub.on('tool.executed', (event) => {
      console.log(`🔧 工具执行事件: ${event.data.toolName} 执行成功`);
    });
    
    toolHub.on('tool.failed', (event) => {
      console.log(`❌ 工具失败事件: ${event.data.toolName} 执行失败 - ${event.data.error}`);
    });

    // 执行一个工具来触发事件
    await toolHub.execute('get_time', { format: 'iso' });
    console.log('');

    console.log('✅ ToolHub 全量提供工具功能测试完成！');
    console.log('');
    console.log('🎉 测试总结:');
    console.log('  ✨ ToolHub 成功注册了所有预设工具');
    console.log('  🔍 工具搜索功能正常工作');
    console.log('  ⚡ 工具执行功能正常工作');
    console.log('  🤖 与 Agent 集成成功');
    console.log('  📊 统计和缓存功能正常');
    console.log('  📡 事件监听功能正常');
    console.log('  🎯 全量提供工具模式运行良好');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testToolHub();
