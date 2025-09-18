// memory-manager.ts - 记忆管理器，支持两种记忆方式

import { 
  ChatHistoryMessage, 
  ChatHistory, 
  MemoryManager 
} from './types';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

/**
 * 记忆管理器实现
 * 支持两种模式：
 * 1. API模式：通过API传递历史记录
 * 2. LG模式：使用LangGraph内置的MemorySaver
 */
export class MemoryManagerImpl implements MemoryManager {
  private memory: Map<string, ChatHistoryMessage[]> = new Map();
  private maxHistorySize: number = 50; // 默认最大历史记录数量

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 保存消息到历史记录
   */
  async saveMessage(threadId: string, message: ChatHistoryMessage): Promise<void> {
    if (!this.memory.has(threadId)) {
      this.memory.set(threadId, []);
    }

    const history = this.memory.get(threadId)!;
    history.push(message);

    // 限制历史记录数量
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  /**
   * 获取历史记录
   */
  async getHistory(threadId: string, limit?: number): Promise<ChatHistoryMessage[]> {
    const history = this.memory.get(threadId) || [];
    
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    
    return [...history];
  }

  /**
   * 清空历史记录
   */
  async clearHistory(threadId: string): Promise<void> {
    this.memory.delete(threadId);
  }

  /**
   * 删除特定消息
   */
  async deleteMessage(threadId: string, messageId: string): Promise<boolean> {
    const history = this.memory.get(threadId);
    if (!history) {
      return false;
    }

    const index = history.findIndex(msg => 
      msg.metadata?.messageId === messageId
    );

    if (index === -1) {
      return false;
    }

    history.splice(index, 1);
    return true;
  }

  /**
   * 获取会话列表
   */
  async getThreads(): Promise<string[]> {
    return Array.from(this.memory.keys());
  }

  /**
   * 将LangChain消息转换为ChatHistoryMessage
   */
  static fromLangChainMessage(message: any): ChatHistoryMessage {
    const timestamp = new Date().toISOString();
    
    if (message instanceof HumanMessage) {
      return {
        type: 'human',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        timestamp,
        metadata: {
          messageId: message.id || `human_${Date.now()}`,
          originalMessage: message
        }
      };
    } else if (message instanceof AIMessage) {
      return {
        type: 'ai',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        timestamp,
        toolCalls: message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          args: tc.args
        })),
        metadata: {
          messageId: message.id || `ai_${Date.now()}`,
          originalMessage: message
        }
      };
    } else if (message instanceof SystemMessage) {
      return {
        type: 'system',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        timestamp,
        metadata: {
          messageId: message.id || `system_${Date.now()}`,
          originalMessage: message
        }
      };
    } else if (message instanceof ToolMessage) {
      return {
        type: 'tool',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        timestamp,
        toolResult: message.content,
        metadata: {
          messageId: message.id || `tool_${Date.now()}`,
          toolCallId: message.tool_call_id,
          originalMessage: message
        }
      };
    } else {
      // 未知消息类型，尝试解析
      return {
        type: 'ai',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        timestamp,
        metadata: {
          messageId: `unknown_${Date.now()}`,
          originalMessage: message
        }
      };
    }
  }

  /**
   * 将ChatHistoryMessage转换为LangChain消息
   */
  static toLangChainMessage(message: ChatHistoryMessage): any {
    switch (message.type) {
      case 'human':
        return new HumanMessage(message.content);
      case 'ai':
        const aiMessage = new AIMessage(message.content);
        if (message.toolCalls && message.toolCalls.length > 0) {
          aiMessage.tool_calls = message.toolCalls.map(tc => ({
            id: tc.id,
            name: tc.name,
            args: tc.args
          }));
        }
        return aiMessage;
      case 'system':
        return new SystemMessage(message.content);
      case 'tool':
        return new ToolMessage({
          content: message.content,
          tool_call_id: message.metadata?.toolCallId || 'unknown'
        });
      default:
        return new AIMessage(message.content);
    }
  }

  /**
   * 获取完整的聊天历史
   */
  async getFullHistory(threadId: string): Promise<ChatHistory> {
    const messages = await this.getHistory(threadId);
    const now = new Date().toISOString();
    
    return {
      threadId,
      messages,
      createdAt: messages.length > 0 ? messages[0].timestamp : now,
      updatedAt: messages.length > 0 ? messages[messages.length - 1].timestamp : now,
      messageCount: messages.length
    };
  }

  /**
   * 设置最大历史记录数量
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalThreads: number; totalMessages: number; memoryUsage: number } {
    let totalMessages = 0;
    for (const history of this.memory.values()) {
      totalMessages += history.length;
    }

    return {
      totalThreads: this.memory.size,
      totalMessages,
      memoryUsage: JSON.stringify(Array.from(this.memory.entries())).length
    };
  }
}

/**
 * 创建记忆管理器实例
 */
export function createMemoryManager(maxHistorySize: number = 50): MemoryManagerImpl {
  return new MemoryManagerImpl(maxHistorySize);
}
