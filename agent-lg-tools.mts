// agent-lg-tools.mts
// 参考 LangGraph ToolNode 文档的演示文件

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";

// 定义自定义工具 - 使用 any 类型避免复杂类型推断
const getWeather = tool(
  (input: any) => {
    if (['sf', 'san francisco', '旧金山'].includes(input.location.toLowerCase())) {
      return '旧金山现在是60度，有雾。';
    } else if (['nyc', 'new york', '纽约'].includes(input.location.toLowerCase())) {
      return '纽约现在是90度，阳光明媚。';
    } else {
      return `${input.location}现在是75度，天气晴朗。`;
    }
  },
  {
    name: 'get_weather',
    description: '获取指定地点的当前天气信息',
    schema: z.object({
      location: z.string().describe("要查询天气的地点名称"),
    })
  } as any
);

const getCoolestCities = tool(
  (input: any) => {
    return '纽约, 旧金山, 北京, 上海';
  },
  {
    name: 'get_coolest_cities',
    description: '获取最酷炫的城市列表',
    schema: z.object({
      noOp: z.string().optional().describe("无操作参数"),
    })
  } as any
);

// 定义工具数组
const tools = [getWeather, getCoolestCities];
const toolNode = new ToolNode(tools);

// 创建聊天模型并绑定工具
const model = new ChatOpenAI({
  model: "deepseek-chat",
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
  }
}).bindTools(tools);

console.log('🚀 开始 ToolNode 演示...\n');

// TAG 1. 手动调用 ToolNode 示例
console.log('=== 1. 手动调用 ToolNode ===');

// 创建包含单个工具调用的 AI 消息
const messageWithSingleToolCall = new AIMessage({
  content: "",
  tool_calls: [
    {
      name: "get_weather",
      args: { location: "旧金山" },
      id: "tool_call_id_1",
      type: "tool_call",
    }
  ]
});

const singleToolResult = await toolNode.invoke({ messages: [messageWithSingleToolCall] });
console.log('单个工具调用结果:', singleToolResult.messages[0].content);

// 创建包含多个工具调用的 AI 消息
const messageWithMultipleToolCalls = new AIMessage({
  content: "",
  tool_calls: [
    {
      name: "get_coolest_cities",
      args: {},
      id: "tool_call_id_2",
      type: "tool_call",
    },
    {
      name: "get_weather",
      args: { location: "纽约" },
      id: "tool_call_id_3",
      type: "tool_call",
    }
  ]
});

const multipleToolResult = await toolNode.invoke({ messages: [messageWithMultipleToolCalls] });
console.log('多个工具调用结果:');
multipleToolResult.messages.forEach((msg: ToolMessage, index: number) => {
  console.log(`  工具 ${index + 1}: ${msg.content}`);
});

// // TAG 2. 与聊天模型一起使用
// console.log('\n=== 2. 与聊天模型一起使用 ===');
// const responseMessage = await model.invoke("旧金山的天气怎么样？");
// console.log('模型响应:', responseMessage.content);
// console.log('工具调用:', responseMessage.tool_calls);

// // 将模型响应传递给 ToolNode
// const toolResult = await toolNode.invoke({ messages: [responseMessage] });
// console.log('工具执行结果:', toolResult.messages[0].content);

// console.log('\n=== 3. ReAct 代理示例 ===');

// TAG 3. ReAct 代理实现
const shouldContinue = (state: { messages: any[] }) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  
  // 如果 LLM 进行了工具调用，则路由到 "tools" 节点
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  // 否则停止（回复用户）
  return END;
};

const callModel = async (state: { messages: any[] }) => {
  const { messages } = state;
  const response = await model.invoke(messages);
  return { messages: [response] };
};

// 创建 ReAct 代理图
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent");

const app = workflow.compile();

// 测试 ReAct 代理
// console.log('测试单个工具调用:');
// const singleAgentResult = await app.invoke({
//   messages: [new HumanMessage("旧金山的天气如何？")],
// });
// console.log('代理回复:', singleAgentResult.messages[singleAgentResult.messages.length - 1].content);

// console.log('\n测试多个工具调用:');
// const multiAgentResult = await app.invoke({
//   messages: [new HumanMessage("最酷炫的城市有哪些？它们的天气怎么样？")],
// });
// console.log('代理回复:', multiAgentResult.messages[multiAgentResult.messages.length - 1].content);

// TAG 4. 流式处理示例
console.log('\n=== 4. 流式处理示例 ===');
console.log('流式处理工具调用:');
const stream = await app.stream(
  {
    messages: [new HumanMessage("请告诉我最酷炫城市的天气情况")],
  },
  {
    streamMode: "values"
  }
);

for await (const chunk of stream) {
    // const lastMessage = chunk.messages[chunk.messages.length - 1] as any;
    console.log('😺', chunk.messages);
}