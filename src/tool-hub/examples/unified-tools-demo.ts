// unified-tools-demo.ts - 统一工具管理系统演示

import { ToolHub } from '../core/tool-hub';
import { WestoreCafeTools } from '../../examples/tool-demo/westore-cafe-tools';

/**
 * 统一工具管理系统演示
 */
export class UnifiedToolsDemo {
  private toolHub: ToolHub;

  constructor() {
    this.toolHub = new ToolHub({
      logging: true,
      logLevel: 'info'
    });

    this.setupEventListeners();
    this.registerToolsWithDependencies();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听工具注册事件
    this.toolHub.on('tool.registered', (event) => {
      console.log(`✅ 工具注册: ${event.data.toolName}`);
      if (event.data.dependencies && event.data.dependencies.length > 0) {
        console.log(`   依赖: ${event.data.dependencies.map((d: any) => d.toolName).join(', ')}`);
      }
    });

    // 监听工具执行事件
    this.toolHub.on('tool.executed', (event) => {
      console.log(`🚀 工具执行成功: ${event.data.toolName}`);
      this.showAvailableTools();
    });

    // 监听工具失败事件
    this.toolHub.on('tool.failed', (event) => {
      console.log(`❌ 工具执行失败: ${event.data.toolName} - ${event.data.error}`);
    });
  }

  /**
   * 注册工具及其依赖关系
   */
  private registerToolsWithDependencies(): void {
    const tools = WestoreCafeTools.getAll();

    console.log('📦 开始注册工具...\n');

    // 使用新的统一注册方式（依赖关系已集成在工具定义中）
    const result = this.toolHub.registerBatch(tools);
    
    console.log(`\n📊 批量注册结果: 成功 ${result.success} 个，失败 ${result.failed} 个`);
    
    if (result.failed > 0) {
      console.log('\n❌ 注册失败的工具:');
      result.results.forEach(regResult => {
        if (!regResult.success) {
          console.log(`  - ${regResult.toolName}: ${regResult.error}`);
        }
      });
    }

    console.log('\n📊 工具注册完成，当前可用工具:');
    this.showAvailableTools();
  }

  /**
   * 显示当前可用的工具
   */
  private showAvailableTools(): void {
    const availableTools = this.toolHub.getAvailableTools();
    const allStatus = this.toolHub.getAllToolAvailabilityStatus();
    
    console.log('\n🔧 当前可用工具:');
    availableTools.forEach(tool => {
      console.log(`  ✅ ${tool.name}: ${tool.description}`);
    });

    console.log('\n📋 所有工具状态:');
    allStatus.forEach(status => {
      const icon = status.available ? '✅' : '⏳';
      console.log(`  ${icon} ${status.toolName}: ${status.reason}`);
      if (!status.available && status.suggestedActions.length > 0) {
        console.log(`      💡 建议: ${status.suggestedActions.join(', ')}`);
      }
    });

    console.log('\n📈 工具统计:');
    const stats = this.toolHub.getToolStatistics();
    console.log(`  总工具数: ${stats.totalTools}`);
    console.log(`  可用工具: ${stats.availableTools}`);
    console.log(`  已执行工具: ${stats.executedTools}`);
    console.log(`  根工具: ${stats.rootTools}`);
    console.log(`  叶子工具: ${stats.leafTools}`);
    console.log(`  平均执行次数: ${stats.averageExecutionCount}`);
  }

  /**
   * 演示搜索功能
   */
  demonstrateSearch(): void {
    console.log('\n🔍 演示搜索功能:');
    
    // 搜索所有工具
    console.log('\n1. 搜索所有工具:');
    const allTools = this.toolHub.search({});
    console.log(`   找到 ${allTools.total} 个工具`);
    
    // 搜索可用工具
    console.log('\n2. 搜索可用工具:');
    const availableTools = this.toolHub.search({ available: true });
    console.log(`   找到 ${availableTools.total} 个可用工具`);
    availableTools.tools.forEach(tool => {
      console.log(`   ✅ ${tool.name}`);
    });
    
    // 搜索不可用工具
    console.log('\n3. 搜索不可用工具:');
    const unavailableTools = this.toolHub.search({ available: false });
    console.log(`   找到 ${unavailableTools.total} 个不可用工具`);
    unavailableTools.tools.forEach(tool => {
      console.log(`   ⏳ ${tool.name}`);
    });
    
    // 按标签搜索
    console.log('\n4. 按标签搜索 (cart):');
    const cartTools = this.toolHub.search({ tags: ['cart'] });
    console.log(`   找到 ${cartTools.total} 个购物车相关工具`);
    cartTools.tools.forEach(tool => {
      console.log(`   🛒 ${tool.name}`);
    });
  }

  /**
   * 模拟工具执行流程
   */
  async simulateToolExecution(): Promise<void> {
    console.log('\n🎬 开始模拟工具执行流程...\n');

    // 1. 执行 displayGoods
    await this.executeTool('displayGoods', {
      goodsList: [
        { goodsId: '1', goodsName: '冰美式', goodsPrice: 25, picture: 'coffee1.jpg', keywords: '咖啡,冰饮' },
        { goodsId: '2', goodsName: '生椰拿铁', goodsPrice: 28, picture: 'coffee2.jpg', keywords: '咖啡,热饮' }
      ]
    });

    // 2. 执行 getGoodsDetail
    await this.executeTool('getGoodsDetail', {
      items: [{ goodsId: 1 }]
    });

    // 3. 执行 addToCart
    await this.executeTool('addToCart', {
      items: [{ skuId: 101, num: 1 }]
    });

    // 4. 执行 displayShopCart
    await this.executeTool('displayShopCart', {});

    // 5. 执行 order
    await this.executeTool('order', {
      items: [{ skuId: 101, num: 1 }]
    });

    console.log('\n🎉 模拟执行完成！');
  }

  /**
   * 执行工具
   */
  private async executeTool(toolName: string, input: any): Promise<void> {
    console.log(`\n🔧 执行工具: ${toolName}`);
    
    // 检查工具可用性
    const availability = this.toolHub.getToolAvailabilityStatus(toolName);
    if (!availability.available) {
      console.log(`❌ 工具不可用: ${availability.reason}`);
      if (availability.suggestedActions.length > 0) {
        console.log(`💡 建议: ${availability.suggestedActions.join(', ')}`);
      }
      return;
    }

    // 创建执行上下文
    const context = {
      executionId: `exec_${Date.now()}`,
      sessionId: 'demo_session',
      threadId: 'demo_thread',
      metadata: { demo: true }
    };

    try {
      const result = await this.toolHub.execute(toolName, input, {}, context);
      
      if (result.success) {
        console.log(`✅ 执行成功: ${JSON.stringify(result.data, null, 2)}`);
      } else {
        console.log(`❌ 执行失败: ${result.error}`);
      }
    } catch (error) {
      console.log(`💥 执行异常: ${error}`);
    }
  }

  /**
   * 演示依赖图结构
   */
  demonstrateDependencyGraph(): void {
    console.log('\n📊 工具依赖图结构:');
    
    const graph = this.toolHub.getDependencyGraph();
    
    console.log('\n🌳 根节点 (无依赖):');
    graph.rootNodes.forEach(nodeName => {
      console.log(`  • ${nodeName}`);
    });
    
    console.log('\n🍃 叶子节点 (无被依赖):');
    graph.leafNodes.forEach(nodeName => {
      console.log(`  • ${nodeName}`);
    });
    
    console.log('\n🔗 依赖关系:');
    for (const [from, toSet] of graph.edges) {
      toSet.forEach(to => {
        console.log(`  ${from} → ${to}`);
      });
    }
  }

  /**
   * 演示执行路径建议
   */
  demonstrateExecutionPath(): void {
    console.log('\n🗺️ 工具执行路径建议:');
    
    const targetTools = ['order', 'addToCart', 'displayGoodsDetailToUser'];
    
    targetTools.forEach(targetTool => {
      const path = this.toolHub.getExecutionPathSuggestion(targetTool);
      console.log(`\n🎯 到达 "${targetTool}" 的路径:`);
      if (path.length > 0) {
        console.log(`  ${path.join(' → ')}`);
      } else {
        console.log(`  ${targetTool} 是根工具，可直接执行`);
      }
    });
  }

  /**
   * 演示重置功能
   */
  demonstrateReset(): void {
    console.log('\n🔄 演示重置功能:');
    
    console.log('\n重置前状态:');
    this.showAvailableTools();
    
    console.log('\n重置所有工具执行状态...');
    this.toolHub.resetAllToolExecution();
    
    console.log('\n重置后状态:');
    this.showAvailableTools();
  }

  /**
   * 运行完整演示
   */
  async runDemo(): Promise<void> {
    console.log('🎭 统一工具管理系统演示\n');
    console.log('='.repeat(50));
    
    // 1. 显示初始状态
    this.showAvailableTools();
    
    // 2. 演示搜索功能
    this.demonstrateSearch();
    
    // 3. 演示依赖图
    this.demonstrateDependencyGraph();
    
    // 4. 演示执行路径建议
    this.demonstrateExecutionPath();
    
    // 5. 模拟工具执行
    await this.simulateToolExecution();
    
    // 6. 演示重置功能
    this.demonstrateReset();
    
    console.log('\n🎉 演示完成！');
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const demo = new UnifiedToolsDemo();
  demo.runDemo().catch(console.error);
}
