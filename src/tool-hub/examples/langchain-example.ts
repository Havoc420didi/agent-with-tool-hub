// langchain-example.ts - LangChain 使用示例

import { createToolHubWithPresets } from '../index';
import { LangChainAdapter } from '../adapters/langchain-adapter';
import { ChatOpenAI } from '@langchain/openai';

/**
 * LangChain 使用示例
 */
export async function langchainExample() {
  // 1. 创建 ToolHub 实例
  const toolHub = createToolHubWithPresets({
    logging: true,
    statistics: true,
    caching: true
  });

  // 2. 创建 LangChain 适配器
  const adapter = new LangChainAdapter();

  // 3. 获取所有工具并转换为 LangChain 格式
  const tools = toolHub.getEnabled();
  const langchainTools = adapter.convertTools(tools);

  // 4. 创建 ChatOpenAI 实例并绑定工具
  const model = new ChatOpenAI({
    model: 'gpt-3.5-turbo',
    temperature: 0
  });

  const modelWithTools = model.bindTools(langchainTools);

  // 5. 使用工具
  console.log('可用的工具:', langchainTools.map(t => t.name));

  // 6. 执行工具
  const timeTool = langchainTools.find(t => t.name === 'get_time');
  if (timeTool) {
    const result = await timeTool.invoke({ timezone: 'Asia/Shanghai' });
    console.log('时间工具结果:', result);
  }

  return {
    toolHub,
    adapter,
    model: modelWithTools,
    tools: langchainTools
  };
}

/**
 * 在 LangGraph 中使用
 */
export async function langgraphExample() {
  const { toolHub, tools } = await langchainExample();

  // 在 LangGraph 中使用工具
  const { ToolNode } = await import('@langchain/langgraph/prebuilt');
  const toolNode = new ToolNode(tools);

  console.log('LangGraph 工具节点已创建，包含', tools.length, '个工具');

  return {
    toolHub,
    toolNode,
    tools
  };
}
