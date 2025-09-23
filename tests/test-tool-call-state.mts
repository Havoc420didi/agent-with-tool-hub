// test-tool-call-state.mts - 测试工具调用状态跟踪功能

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { AdvancedChatTester } from './test-chat.mts';

// 模拟测试工具调用状态跟踪
class ToolCallStateTester {
  private tester: AdvancedChatTester;

  constructor() {
    this.tester = new AdvancedChatTester();
  }

  /**
   * 测试工具调用状态跟踪
   */
  async testToolCallStateTracking(): Promise<void> {
    console.log('🧪 开始测试工具调用状态跟踪功能...\n');

    // 测试1: 检查初始状态
    console.log('📋 测试1: 检查初始状态');
    this.testInitialState();

    // 测试2: 模拟工具调用状态更新
    console.log('📋 测试2: 模拟工具调用状态更新');
    this.testToolCallStateUpdate();

    // 测试3: 测试状态重置
    console.log('📋 测试3: 测试状态重置');
    this.testStateReset();

    console.log('✅ 所有测试完成！');
  }

  /**
   * 测试初始状态
   */
  private testInitialState(): void {
    // 通过反射访问私有属性进行测试
    const sessionState = (this.tester as any).sessionState;
    
    console.log(`  - pendingToolCalls: ${sessionState.pendingToolCalls.length} (期望: 0)`);
    console.log(`  - isWaitingForToolResult: ${sessionState.isWaitingForToolResult} (期望: false)`);
    
    const isInitialStateCorrect = 
      sessionState.pendingToolCalls.length === 0 && 
      sessionState.isWaitingForToolResult === false;
    
    console.log(`  ✅ 初始状态: ${isInitialStateCorrect ? '正确' : '错误'}\n`);
  }

  /**
   * 测试工具调用状态更新
   */
  private testToolCallStateUpdate(): void {
    const sessionState = (this.tester as any).sessionState;
    
    // 模拟添加待执行的工具调用
    const mockToolCalls = [
      {
        id: 'tool_call_123',
        name: 'test_tool',
        args: { param1: 'value1' },
        description: '测试工具',
        status: 'pending'
      }
    ];
    
    sessionState.pendingToolCalls = [...mockToolCalls];
    sessionState.isWaitingForToolResult = true;
    
    console.log(`  - 添加工具调用后 pendingToolCalls: ${sessionState.pendingToolCalls.length} (期望: 1)`);
    console.log(`  - 添加工具调用后 isWaitingForToolResult: ${sessionState.isWaitingForToolResult} (期望: true)`);
    
    const isStateUpdated = 
      sessionState.pendingToolCalls.length === 1 && 
      sessionState.isWaitingForToolResult === true;
    
    console.log(`  ✅ 状态更新: ${isStateUpdated ? '正确' : '错误'}\n`);
  }

  /**
   * 测试状态重置
   */
  private testStateReset(): void {
    const sessionState = (this.tester as any).sessionState;
    
    // 调用清除工具调用方法
    (this.tester as any).clearPendingTools();
    
    console.log(`  - 清除后 pendingToolCalls: ${sessionState.pendingToolCalls.length} (期望: 0)`);
    console.log(`  - 清除后 isWaitingForToolResult: ${sessionState.isWaitingForToolResult} (期望: false)`);
    
    const isStateReset = 
      sessionState.pendingToolCalls.length === 0 && 
      sessionState.isWaitingForToolResult === false;
    
    console.log(`  ✅ 状态重置: ${isStateReset ? '正确' : '错误'}\n`);
  }
}

// 运行测试
async function main() {
  const tester = new ToolCallStateTester();
  await tester.testToolCallStateTracking();
}

// 运行主程序
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
