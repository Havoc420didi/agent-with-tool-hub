// services/agent.service.ts - 简洁的 Agent 服务

import { AgentBuilder } from '../core/agent-builder';
import { ChatRequest, ChatHistoryMessage } from '../core/types';

export class AgentService {
  private agents: Map<string, AgentBuilder> = new Map();
  private toolStates: Map<string, string> = new Map(); // 存储每个 agent 的工具状态
  
  // 创建 Agent
  async createAgent(agentId: string, config: any) {
    // agentId 实际就是 route 传递的 threadId
    try {
      if (this.agents.has(agentId)) {
        return {
          success: false,
          error: {
            code: 'AGENT_EXISTS',
            message: `Agent ${agentId} 已存在`
          }
        };
      }

      const agent = new AgentBuilder({
        model: config.model || { name: "deepseek-chat" },
        tools: config.tools || [],
        memory: config.memory || { enabled: true },
        toolExecutionConfig: config.toolExecutionConfig,
        systemPrompt: config.systemPrompt || {
          enabled: true,
          includeUnavailable: true,
          includeParameters: true,
          includeStatistics: true,
          includeDependencies: true,
        }
        // streaming: config.streaming || true,
      });

      // 初始化 Agent
      agent.initialize();
      
      this.agents.set(agentId, agent);

      return {
        success: true,
        data: {
          agentId,
          status: 'active',
          tools: agent.getTools(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AGENT_ERROR',
          message: `创建 Agent 失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  // 获取 Agent 状态
  async getAgentStatus(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent ${agentId} 不存在`
        }
      };
    }

    return {
      success: true,
      data: {
        agentId,
        status: 'active',
        tools: agent.getTools(),
        timestamp: new Date().toISOString()
      }
    };
  }

  // 直接获取 AgentBuilder 实例
  getAgent(agentId: string): AgentBuilder | undefined {
    return this.agents.get(agentId);
  }

  // 聊天（支持两种记忆方式）
  async chat(agentId: string, request: ChatRequest | { message: string; threadId?: string }) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent ${agentId} 不存在`
          }
        };
      }

      const response = await agent.invoke(request as any);

      return {
        success: true,
        data: {
          content: response.content,
          toolCalls: response.toolCalls,
          metadata: response.metadata,
          timestamp: new Date().toISOString(),
          threadId: (request as any).threadId || 'default'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: `聊天失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  // 流式聊天
  async *streamChat(agentId: string, request: { message: string; threadId?: string }) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        yield {
          type: 'error',
          data: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent ${agentId} 不存在`
          },
          timestamp: new Date().toISOString(),
          threadId: request.threadId || 'default'
        };
        return;
      }

      const stream = agent.stream(request.message, request.threadId);

      for await (const chunk of stream) {
        yield {
          type: 'content',
          data: chunk,
          timestamp: new Date().toISOString(),
          threadId: request.threadId || 'default'
        };
      }

      yield {
        type: 'done',
        data: { success: true },
        timestamp: new Date().toISOString(),
        threadId: request.threadId || 'default'
      };
    } catch (error) {
      yield {
        type: 'error',
        data: {
          code: 'STREAM_ERROR',
          message: `流式聊天失败: ${error instanceof Error ? error.message : String(error)}`
        },
        timestamp: new Date().toISOString(),
        threadId: request.threadId || 'default'
      };
    }
  }

  // 获取工具列表
  async getAgentTools(agentId: string) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent ${agentId} 不存在`
          }
        };
      }

      return {
        success: true,
        data: {
          tools: agent.getTools(),
          total: agent.getTools().length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOOL_ERROR',
          message: `获取工具列表失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  // 删除 Agent
  async deleteAgent(agentId: string) {
    try {
      if (!this.agents.has(agentId)) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent ${agentId} 不存在`
          }
        };
      }

      this.agents.delete(agentId);
      this.toolStates.delete(agentId); // 清理工具状态

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AGENT_ERROR',
          message: `删除 Agent 失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  // 获取所有 Agent
  async listAgents() {
    try {
      const agentIds = Array.from(this.agents.keys());
      return {
        success: true,
        data: agentIds
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `获取 Agent 列表失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  // 获取Agent的记忆统计信息
  getAgentMemoryStats(agentId: string) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        return {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent ${agentId} 不存在`
          }
        };
      }

      return {
        success: true,
        data: agent.getMemoryStats()
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `获取记忆统计失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  // 获取所有Agent的记忆统计信息
  getAllMemoryStats() {
    try {
      const stats = Array.from(this.agents.entries()).map(([agentId, agent]) => ({
        agentId,
        ...agent.getMemoryStats()
      }));

      return {
        success: true,
        data: {
          totalAgents: stats.length,
          stats
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `获取所有记忆统计失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

}
