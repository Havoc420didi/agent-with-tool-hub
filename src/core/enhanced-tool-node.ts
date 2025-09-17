// enhanced-tool-node.ts - 增强的工具节点，支持外部执行模式

import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { ToolExecutionMode } from './types';

/**
 * 增强的工具节点，支持智能决策和外部执行模式
 */
export class EnhancedToolNode extends ToolNode {
  private executionMode: ToolExecutionMode;
  private pendingToolCalls: Map<string, any> = new Map();

  constructor(
    tools: any[],
    executionMode: ToolExecutionMode = ToolExecutionMode.INTERNAL
  ) {
    super(tools);
    this.executionMode = executionMode;
  }

  /**
   * 重写 invoke 方法以支持直接模式控制
   */
  async invoke(state: any): Promise<any> {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    
    if (!lastMessage.tool_calls?.length) {
      return { messages: [] };
    }

    const toolMessages: ToolMessage[] = [];

    for (const toolCall of lastMessage.tool_calls) {
      try {
        console.log(`🔧 增强工具节点执行: ${toolCall.name} -> ${this.executionMode}`);

        // 直接根据 executionMode 控制执行方式
        if (this.executionMode === ToolExecutionMode.OUTSIDE) {
          // 外部执行模式
          const toolMessage = this.createExternalToolMessage(toolCall);
          toolMessages.push(toolMessage);
          
          // 存储待执行的工具调用
          this.pendingToolCalls.set(toolCall.id || 'unknown', {
            toolCall,
            timestamp: Date.now()
          });
        } else {
          // 内部执行模式
          const toolMessage = await this.executeInternalTool(toolCall);
          toolMessages.push(toolMessage);
        }

      } catch (error) {
        // 创建错误消息
        const toolMessage = new ToolMessage({
          content: `工具执行错误: ${error instanceof Error ? error.message : String(error)}`,
          tool_call_id: toolCall.id || 'unknown',
        });
        
        toolMessages.push(toolMessage);
      }
    }

    return { messages: toolMessages };
  }

  /**
   * 创建外部执行工具消息
   */
  private createExternalToolMessage(toolCall: any): ToolMessage {
    return new ToolMessage({
      content: JSON.stringify({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        toolArgs: toolCall.args,
        status: 'pending',
        message: '工具调用已下发，等待外部执行',
        executionMode: 'outside',
        waitForResult: true,
        timeout: 30000,
        timestamp: new Date().toISOString()
      }),
      tool_call_id: toolCall.id || 'unknown',
    });
  }

  /**
   * 执行内部工具
   */
  private async executeInternalTool(toolCall: any): Promise<ToolMessage> {
    // 查找对应的工具
    const tool = this.tools.find(t => t.name === toolCall.name);
    
    if (!tool) {
      throw new Error(`工具 ${toolCall.name} 未找到`);
    }

    try {
      // 执行工具
      const result = await tool.invoke(toolCall.args);
      
      return new ToolMessage({
        content: JSON.stringify({
          result,
          executionMode: 'internal',
          timestamp: new Date().toISOString()
        }),
        tool_call_id: toolCall.id || 'unknown',
      });
    } catch (error) {
      return new ToolMessage({
        content: `工具执行失败: ${error instanceof Error ? error.message : String(error)}`,
        tool_call_id: toolCall.id || 'unknown',
      });
    }
  }

  /**
   * 获取待执行的工具调用
   */
  getPendingToolCalls(): any[] {
    return Array.from(this.pendingToolCalls.values());
  }

  /**
   * 获取特定工具调用
   */
  getToolCall(toolCallId: string): any | undefined {
    return this.pendingToolCalls.get(toolCallId);
  }

  /**
   * 处理外部工具执行结果
   */
  handleExternalToolResult(toolCallId: string, result: any): void {
    const pendingCall = this.pendingToolCalls.get(toolCallId);
    if (pendingCall) {
      // 更新工具调用状态
      pendingCall.status = 'completed';
      pendingCall.result = result;
      pendingCall.completedAt = Date.now();
      
      // 从待执行列表中移除
      this.pendingToolCalls.delete(toolCallId);
      
      console.log(`✅ 外部工具执行完成: ${toolCallId}`);
    }
  }

  /**
   * 设置执行模式
   */
  setExecutionMode(mode: ToolExecutionMode): void {
    this.executionMode = mode;
  }


  /**
   * 清除待执行的工具调用
   */
  clearPendingToolCalls(): void {
    this.pendingToolCalls.clear();
  }

  /**
   * 获取执行统计
   */
  getExecutionStats(): any {
    const stats = {
      totalPending: this.pendingToolCalls.size,
      executionMode: this.executionMode,
      pendingCalls: Array.from(this.pendingToolCalls.entries()).map(([id, call]) => ({
        id,
        toolName: call.toolCall.name,
        timestamp: call.timestamp,
        status: call.status || 'pending'
      }))
    };

    return stats;
  }
}
