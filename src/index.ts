// index.ts - 简洁的框架主入口

// 核心框架导出
export { AgentBuilder, createAgent, createDefaultAgent } from './core/agent-builder';

// 服务层导出
export { AgentService } from './services/agent.service';

// 类型导出
export type { 
  ToolConfig, 
  ToolRegistry, 
  AgentConfig, 
  AgentState, 
  AgentResponse, 
  ToolCallResult 
} from './core/types';

// 重新导出常用的 LangChain 类型和函数
export { tool } from '@langchain/core/tools';
export { z } from 'zod';
export { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
export { ChatOpenAI } from '@langchain/openai';
export { MemorySaver } from '@langchain/langgraph';