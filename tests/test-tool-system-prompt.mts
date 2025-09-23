// test-tool-system-prompt.mts - 测试改进后的 generateSystemPrompt 函数

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { ToolRegistry } from '../src/tool-hub/core/tool-registry.js';
import { WestoreCafeTools } from '../examples/tool-demo/westore-cafe-tools.js';

console.log('🧪 开始测试改进后的 generateSystemPrompt 函数...\n');

async function testImprovedSystemPrompt() {
  try {
    // 创建工具注册表
    const registry = new ToolRegistry();

    // 注册 Westore Cafe 工具
    console.log('📝 注册 Westore Cafe 工具...');
    const tools = WestoreCafeTools.getAll();
    const registrationResult = registry.registerBatch(tools);
    
    console.log(`✅ 注册结果: 成功 ${registrationResult.success} 个, 失败 ${registrationResult.failed} 个\n`);

    // 显示注册的工具
    console.log('📋 已注册的工具:');
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description.substring(0, 50)}...`);
    });
    console.log('');

    // 测试改进后的系统提示词生成
    console.log('🎯 改进后的系统提示词 (包含依赖组类型说明):');
    console.log('='.repeat(80));
    const improvedPrompt = registry.generateSystemPrompt();
    console.log(improvedPrompt);
    console.log('='.repeat(80));

    // 模拟执行一些工具来改变依赖状态
    console.log('\n⚡ 模拟执行工具来改变依赖状态...');
    
    // 执行 displayGoods (根节点)
    console.log('执行 displayGoods...');
    registry.recordToolExecution('displayGoods', {
      executionId: 'test_1',
      sessionId: 'test_session',
      threadId: 'test_thread',
      metadata: {}
    });

    // 执行 getGoodsDetail
    console.log('执行 getGoodsDetail...');
    registry.recordToolExecution('getGoodsDetail', {
      executionId: 'test_2',
      sessionId: 'test_session',
      threadId: 'test_thread',
      metadata: {}
    });

    // 执行 displayShopCart
    console.log('执行 displayShopCart...');
    registry.recordToolExecution('displayShopCart', {
      executionId: 'test_3',
      sessionId: 'test_session',
      threadId: 'test_thread',
      metadata: {}
    });

    console.log('\n📊 执行后的工具可用性状态:');
    const updatedStatuses = registry.getAllToolAvailabilityStatus();
    updatedStatuses.forEach(status => {
      console.log(`- ${status.toolName}: ${status.available ? '✅ 可用' : '❌ 不可用'} (${status.reason})`);
    });

    // 生成更新后的系统提示词
    console.log('\n🎯 更新后的系统提示词 (显示更多可用工具):');
    console.log('='.repeat(80));
    const updatedPrompt = registry.generateSystemPrompt();
    console.log(updatedPrompt);
    console.log('='.repeat(80));

    // 测试不同选项的系统提示词
    console.log('\n🔍 测试不同选项的系统提示词:');
    
    // 测试不包含统计信息的版本
    console.log('\n📊 不包含统计信息的版本:');
    console.log('-'.repeat(50));
    const promptWithoutStats = registry.generateSystemPrompt({ includeStatistics: false });
    console.log(promptWithoutStats);
    console.log('-'.repeat(50));

    // 测试包含不可用工具的版本
    console.log('\n📋 包含不可用工具的版本:');
    console.log('-'.repeat(50));
    const promptWithUnavailable = registry.generateSystemPrompt({ includeUnavailable: true });
    console.log(promptWithUnavailable);
    console.log('-'.repeat(50));

    console.log('\n✅ 测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testImprovedSystemPrompt();