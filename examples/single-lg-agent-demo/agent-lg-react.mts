// agent.mts

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';

// 从当前目录加载 config.env 文件
config({ path: resolve(process.cwd(), './config.env') });

import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Define the tools for the agent to use
const agentTools = [new TavilySearch({ maxResults: 3 })];  // INFO 这里关于 Tool 的设计都是很简单的 list 全量方式。
const agentModel = new ChatOpenAI({ 
  model: "deepseek-chat",
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
  }
});

// Initialize memory to persist state between graph runs
const agentCheckpointer = new MemorySaver(); // TODO 这里的记忆底层是如何实现的？
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

// Now it's time to use!
const agentFinalState = await agent.invoke(
  { messages: [new HumanMessage("今天有什么热点新闻吗？")] },
  { configurable: { thread_id: "42" } },
);

console.log(
    '😺',
     agentFinalState.messages[agentFinalState.messages.length - 1].content,
);

const agentNextState = await agent.invoke(
  { messages: [new HumanMessage("what about ny")] },
  { configurable: { thread_id: "42" } },
);

console.log(
    '😺',
    agentNextState.messages[agentNextState.messages.length - 1].content,
);