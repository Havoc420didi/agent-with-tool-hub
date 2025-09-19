// test-depgroups.mts - 测试依赖组系统

import { ToolHub } from '../core/tool-hub';
import { WestoreCafeTools } from '../../../examples/tool-demo/westore-cafe-tools';

async function testDependencyGroups() {
  console.log('🧪 测试依赖组系统...\n');

  // 创建工具中心
  const toolHub = new ToolHub({
    validators: []
  });

  // 注册所有工具
  const tools = WestoreCafeTools.getAll();
  const result = await toolHub.registerBatch(tools);
  
  if (!result.success) {
    console.error('❌ 工具注册失败:', result.errors);
    return;
  }

  console.log('✅ 工具注册成功\n');

  // 测试依赖组类型
  console.log('📋 测试不同依赖组类型:\n');

  // 1. 测试 'any' 类型 - addToCart 工具
  console.log('1️⃣ 测试 "any" 类型依赖组 (addToCart):');
  const addToCartStatus = toolHub.getToolAvailabilityStatus('addToCart');
  console.log(`   可用性: ${addToCartStatus.available ? '✅' : '❌'}`);
  console.log(`   原因: ${addToCartStatus.reason}`);
  console.log(`   缺少依赖: ${addToCartStatus.missingDependencies.join(', ') || '无'}`);
  console.log();

  // 2. 测试 'sequence' 类型 - displayGoodsDetailToUser 工具
  console.log('2️⃣ 测试 "sequence" 类型依赖组 (displayGoodsDetailToUser):');
  const displayDetailStatus = toolHub.getToolAvailabilityStatus('displayGoodsDetailToUser');
  console.log(`   可用性: ${displayDetailStatus.available ? '✅' : '❌'}`);
  console.log(`   原因: ${displayDetailStatus.reason}`);
  console.log(`   缺少依赖: ${displayDetailStatus.missingDependencies.join(', ') || '无'}`);
  console.log();

  // 3. 测试 'all' 类型 - deleteProduct 工具
  console.log('3️⃣ 测试 "all" 类型依赖组 (deleteProduct):');
  const deleteProductStatus = toolHub.getToolAvailabilityStatus('deleteProduct');
  console.log(`   可用性: ${deleteProductStatus.available ? '✅' : '❌'}`);
  console.log(`   原因: ${deleteProductStatus.reason}`);
  console.log(`   缺少依赖: ${deleteProductStatus.missingDependencies.join(', ') || '无'}`);
  console.log();

  // 4. 测试全局条件 - order 工具
  console.log('4️⃣ 测试全局条件 (order):');
  const orderStatus = toolHub.getToolAvailabilityStatus('order');
  console.log(`   可用性: ${orderStatus.available ? '✅' : '❌'}`);
  console.log(`   原因: ${orderStatus.reason}`);
  console.log(`   缺少依赖: ${orderStatus.missingDependencies.join(', ') || '无'}`);
  console.log();

  // 模拟执行一些工具来测试依赖关系
  console.log('🔄 模拟工具执行流程:\n');

  // 执行 displayGoods
  console.log('执行 displayGoods...');
  const displayGoodsResult = await toolHub.execute('displayGoods', {});
  console.log(`结果: ${displayGoodsResult.success ? '✅' : '❌'}`);
  console.log();

  // 检查 addToCart 现在是否可用
  console.log('检查 addToCart 现在是否可用:');
  const addToCartStatusAfter = toolHub.getToolAvailabilityStatus('addToCart');
  console.log(`   可用性: ${addToCartStatusAfter.available ? '✅' : '❌'}`);
  console.log(`   原因: ${addToCartStatusAfter.reason}`);
  console.log();

  // 执行 getGoodsDetail
  console.log('执行 getGoodsDetail...');
  const getGoodsDetailResult = await toolHub.execute('getGoodsDetail', { items: [{ goodsId: 1 }] });
  console.log(`结果: ${getGoodsDetailResult.success ? '✅' : '❌'}`);
  console.log();

  // 检查 displayGoodsDetailToUser 现在是否可用
  console.log('检查 displayGoodsDetailToUser 现在是否可用:');
  const displayDetailStatusAfter = toolHub.getToolAvailabilityStatus('displayGoodsDetailToUser');
  console.log(`   可用性: ${displayDetailStatusAfter.available ? '✅' : '❌'}`);
  console.log(`   原因: ${displayDetailStatusAfter.reason}`);
  console.log();

  // 执行 addToCart
  console.log('执行 addToCart...');
  const addToCartResult = await toolHub.execute('addToCart', { 
    items: [{ skuId: 1, num: 1 }] 
  });
  console.log(`结果: ${addToCartResult.success ? '✅' : '❌'}`);
  console.log();

  // 检查 order 现在是否可用
  console.log('检查 order 现在是否可用:');
  const orderStatusAfter = toolHub.getToolAvailabilityStatus('order');
  console.log(`   可用性: ${orderStatusAfter.available ? '✅' : '❌'}`);
  console.log(`   原因: ${orderStatusAfter.reason}`);
  console.log();

  // 显示所有工具的可用性状态
  console.log('📊 所有工具可用性状态:');
  const allStatus = toolHub.getAllToolAvailabilityStatus();
  allStatus.forEach(status => {
    console.log(`   ${status.toolName}: ${status.available ? '✅' : '❌'} - ${status.reason}`);
  });

  console.log('\n🎉 依赖组系统测试完成!');
}

// 运行测试
testDependencyGroups().catch(console.error);
