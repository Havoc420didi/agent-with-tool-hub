// test-dag-visualization.mts - 测试 DAG 可视化功能

import { ToolHub } from '../../core/tool-hub';
import { DAGVisualizer } from '../../utils/virtual/dag-visualizer';
import { WestoreCafeTools } from '../../../../examples/tool-demo/westore-cafe-tools';

async function testDAGVisualization() {
  console.log('🎨 测试 DAG 可视化功能...\n');

  // 创建工具中心
  const toolHub = new ToolHub({
    validators: []
  });

  // 注册所有工具
  const tools = WestoreCafeTools.getAll();
  const result = toolHub.registerBatch(tools);
  
  if (!result.success) {
    console.error('❌ 工具注册失败:', result);
    return;
  }

  console.log('✅ 工具注册成功\n');

  // 创建 DAG 可视化器
  const visualizer = new DAGVisualizer(toolHub, {
    direction: 'TD'
  });

  // 1. 生成完整的 DAG 图
  console.log('1️⃣ 生成完整 DAG 图...');
  const fullDAG = visualizer.generateMermaidDAG();
  console.log('Mermaid 代码:');
  console.log(fullDAG);
  console.log();

  // 2. 生成并保存 Markdown 格式的图表
  console.log('2️⃣ 生成 Markdown 格式图表...');
  const markdownPath = visualizer.saveMarkdownToFile('generated-dag.md');
  console.log(`✅ Markdown 图表已保存到: ${markdownPath}`);
  console.log();

  // 3. 生成并保存特定工具的依赖路径
  console.log('3️⃣ 生成 order 工具的依赖路径...');
  const orderPathFile = visualizer.saveToolPathToFile('order', 'order-dependency-path.mmd');
  console.log(`✅ Order 依赖路径已保存到: ${orderPathFile}`);
  console.log();

  console.log('\n🎉 DAG 可视化测试完成!');
  console.log('\n📁 生成的文件 (保存在 data/ 目录下):');
  console.log(`   - ${markdownPath}`);
  console.log(`   - ${orderPathFile}`);
  console.log('\n💡 提示: 您可以将 Mermaid 代码复制到支持 Mermaid 的编辑器中查看图表');
}

// 运行测试
testDAGVisualization().catch(console.error);
