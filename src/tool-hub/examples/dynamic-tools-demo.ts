// dynamic-tools-demo.ts - 动态工具可用性演示

import { ToolHub } from '../core/tool-hub';
import { WestoreCafeTools } from './westore-cafe-tools';
import { WestoreCafeDependencies } from './westore-cafe-dependencies';

/**
 * 动态工具可用性演示
 */
export class DynamicToolsDemo {
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
    const dependencies = WestoreCafeDependencies.getDependencies();

    console.log('📦 开始注册工具...\n');

    tools.forEach(tool => {
      const toolDependencies = dependencies.get(tool.name) || [];
      this.toolHub.register(tool, toolDependencies);
    });

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
   * 演示工具执行路径建议
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
    console.log('🎭 动态工具可用性系统演示\n');
    console.log('='.repeat(50));
    
    // 1. 显示初始状态
    this.showAvailableTools();
    
    // 2. 演示依赖图
    this.demonstrateDependencyGraph();
    
    // 3. 演示执行路径建议
    this.demonstrateExecutionPath();
    
    // 4. 模拟工具执行
    await this.simulateToolExecution();
    
    // 5. 演示重置功能
    this.demonstrateReset();
    
    console.log('\n🎉 演示完成！');
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const demo = new DynamicToolsDemo();
  demo.runDemo().catch(console.error);
}
