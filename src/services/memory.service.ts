// memory.service.ts - 记忆管理服务

import { AgentBuilder } from '../core/agent-builder';
import { ChatHistoryMessage } from '../core/types';

/**
 * 记忆管理服务
 * 提供统一的记忆管理接口，支持多Agent实例
 */
export class MemoryService {
  private agents: Map<string, AgentBuilder> = new Map();

  constructor(agents: Map<string, AgentBuilder>) {
    this.agents = agents;
  }

  /**
   * 获取聊天历史
   */
  async getChatHistory(agentId: string, threadId: string, limit?: number) {
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

      const history = await agent.getChatHistory(threadId, limit);
      return {
        success: true,
        data: {
          threadId,
          messages: history,
          messageCount: history.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `获取聊天历史失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 清空聊天历史
   */
  async clearChatHistory(agentId: string, threadId: string) {
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

      await agent.clearChatHistory(threadId);
      return {
        success: true,
        data: {
          threadId,
          message: '聊天历史已清空',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `清空聊天历史失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 获取会话列表
   */
  async getThreads(agentId: string) {
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

      const threads = await agent.getThreads();
      return {
        success: true,
        data: {
          threads,
          count: threads.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `获取会话列表失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 设置记忆模式
   */
  async setMemoryMode(agentId: string, mode: 'api' | 'lg') {
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

      agent.setMemoryMode(mode);
      return {
        success: true,
        data: {
          agentId,
          memoryMode: mode,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `设置记忆模式失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 获取记忆统计信息
   */
  async getMemoryStats(agentId: string) {
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

      const stats = agent.getMemoryStats();
      return {
        success: true,
        data: {
          agentId,
          ...stats,
          timestamp: new Date().toISOString()
        }
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

  /**
   * 删除特定消息
   */
  async deleteMessage(agentId: string, threadId: string, messageId: string) {
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

      const memoryManager = agent.getMemoryManager();
      const success = await memoryManager.deleteMessage(threadId, messageId);
      
      return {
        success: true,
        data: {
          agentId,
          threadId,
          messageId,
          deleted: success,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `删除消息失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 获取所有Agent的记忆统计
   */
  async getAllMemoryStats() {
    try {
      const allStats = [];
      
      for (const [agentId, agent] of this.agents) {
        const stats = agent.getMemoryStats();
        allStats.push({
          agentId,
          ...stats
        });
      }

      return {
        success: true,
        data: {
          agents: allStats,
          totalAgents: allStats.length,
          timestamp: new Date().toISOString()
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

  /**
   * 清空所有Agent的记忆
   */
  async clearAllMemory() {
    try {
      const results = [];
      
      for (const [agentId, agent] of this.agents) {
        const memoryManager = agent.getMemoryManager();
        const threads = await memoryManager.getThreads();
        
        for (const threadId of threads) {
          await memoryManager.clearHistory(threadId);
        }
        
        results.push({
          agentId,
          clearedThreads: threads.length
        });
      }

      return {
        success: true,
        data: {
          results,
          totalAgents: results.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `清空所有记忆失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 导出聊天历史
   */
  async exportChatHistory(agentId: string, threadId: string, format: 'json' | 'txt' = 'json') {
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

      const history = await agent.getChatHistory(threadId);
      
      let exportData: string;
      if (format === 'json') {
        exportData = JSON.stringify({
          agentId,
          threadId,
          messages: history,
          exportTime: new Date().toISOString(),
          messageCount: history.length
        }, null, 2);
      } else {
        exportData = history.map(msg => 
          `[${msg.timestamp}] ${msg.type.toUpperCase()}: ${msg.content}`
        ).join('\n');
      }

      return {
        success: true,
        data: {
          agentId,
          threadId,
          format,
          content: exportData,
          messageCount: history.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `导出聊天历史失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 导入聊天历史
   */
  async importChatHistory(agentId: string, threadId: string, historyData: ChatHistoryMessage[]) {
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

      const memoryManager = agent.getMemoryManager();
      
      // 清空现有历史
      await memoryManager.clearHistory(threadId);
      
      // 导入新历史
      for (const message of historyData) {
        await memoryManager.saveMessage(threadId, message);
      }

      return {
        success: true,
        data: {
          agentId,
          threadId,
          importedMessages: historyData.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MEMORY_ERROR',
          message: `导入聊天历史失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
}
