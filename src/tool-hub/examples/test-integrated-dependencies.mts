// test-integrated-dependencies.mts - 测试集成的依赖关系系统

import { ToolHub } from '../core/tool-hub';
import { WestoreCafeTools } from '../../examples/tool-demo/westore-cafe-tools';

async function testIntegratedDependencies() {
  console.log('🧪 测试集成的依赖关系系统\n');

  // 创建 ToolHub
  const toolHub = new ToolHub({
    logging: true,
    logLevel: 'info'
  });

  // 注册工具（依赖关系已集成在工具定义中）
  console.log('📦 注册工具...');
  const tools = WestoreCafeTools.getAll();
  const result = toolHub.registerBatch(tools);
  
  console.log(`注册结果: 成功 ${result.success} 个，失败 ${result.failed} 个`);

  // 显示初始状态
  console.log('\n🔧 初始可用工具:');
  const initialAvailable = toolHub.getAvailableTools();
  console.log(initialAvailable.map(t => t.name).join(', '));

  // 显示所有工具状态
  console.log('\n📋 所有工具状态:');
  const allStatus = toolHub.getAllToolAvailabilityStatus();
  allStatus.forEach(status => {
    const icon = status.available ? '✅' : '⏳';
    console.log(`${icon} ${status.toolName}: ${status.reason}`);
  });

  // 测试工具执行
  console.log('\n🚀 测试工具执行...');
  
  // 创建执行上下文
  const context = {
    executionId: 'test_exec_001',
    sessionId: 'test_session',
    threadId: 'test_thread',
    metadata: { test: true }
  };

  // 执行 displayGoods
  console.log('\n1. 执行 displayGoods...');
  const result1 = await toolHub.execute('displayGoods', {
    goodsList: [
      { goodsId: '1', goodsName: '冰美式', goodsPrice: 25, picture: 'coffee1.jpg', keywords: '咖啡,冰饮' }
    ]
  }, {}, context);
  
  if (result1.success) {
    console.log('✅ displayGoods 执行成功');
  } else {
    console.log('❌ displayGoods 执行失败:', result1.error);
  }

  // 检查 addToCart 是否变为可用
  console.log('\n2. 检查 addToCart 可用性...');
  const addToCartStatus = toolHub.getToolAvailabilityStatus('addToCart');
  console.log(`addToCart 可用: ${addToCartStatus.available}`);
  console.log(`原因: ${addToCartStatus.reason}`);

  // 执行 addToCart
  if (addToCartStatus.available) {
    console.log('\n3. 执行 addToCart...');
    const result2 = await toolHub.execute('addToCart', {
      items: [{ skuId: 101, num: 1 }]
    }, {}, context);
    
    if (result2.success) {
      console.log('✅ addToCart 执行成功');
    } else {
      console.log('❌ addToCart 执行失败:', result2.error);
    }
  }

  // 检查 order 是否变为可用
  console.log('\n4. 检查 order 可用性...');
  const orderStatus = toolHub.getToolAvailabilityStatus('order');
  console.log(`order 可用: ${orderStatus.available}`);
  console.log(`原因: ${orderStatus.reason}`);

  // 显示最终状态
  console.log('\n🔧 最终可用工具:');
  const finalAvailable = toolHub.getAvailableTools();
  console.log(finalAvailable.map(t => t.name).join(', '));

  // 显示统计信息
  console.log('\n📊 工具统计:');
  const stats = toolHub.getToolStatistics();
  console.log(`总工具数: ${stats.totalTools}`);
  console.log(`可用工具: ${stats.availableTools}`);
  console.log(`已执行工具: ${stats.executedTools}`);
  console.log(`平均执行次数: ${stats.averageExecutionCount}`);

  console.log('\n✅ 测试完成！');
}

// 运行测试
testIntegratedDependencies().catch(console.error);
