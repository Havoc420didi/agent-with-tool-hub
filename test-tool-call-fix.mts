#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// 从当前目录加载 config.env 文件
config({ path: resolve(process.cwd(), './config.env') });

async function testToolCallFix() {
  const baseUrl = 'http://localhost:3000';
  const threadId = `test_${Date.now()}`;
  
  console.log('🧪 测试工具调用状态修复');
  console.log('='.repeat(50));
  
  try {
    // 第一次调用 - 用户消息
    console.log('1️⃣ 发送用户消息...');
    const userResponse = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '看一下我的购物车',
        threadId: threadId,
        messageType: 'user',
        memoryMode: 'lg'
      })
    });
    
    if (!userResponse.ok) {
      throw new Error(`用户消息失败: ${userResponse.status}`);
    }
    
    const userData = await userResponse.json();
    console.log('✅ 用户消息响应:', {
      success: userData.success,
      toolCalls: userData.data?.toolCalls?.length || 0,
      content: userData.data?.content?.substring(0, 100) || ''
    });
    
    if (userData.data?.toolCalls?.length > 0) {
      const toolCall = userData.data.toolCalls[0];
      console.log('🔧 工具调用详情:', {
        toolName: toolCall.toolName,
        id: toolCall.id,
        args: toolCall.args
      });
      
      // 等待一下
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 第二次调用 - 工具结果
      console.log('2️⃣ 发送工具执行结果...');
      const toolResponse = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '购物车是空的',
          threadId: threadId,
          messageType: 'tool',
          memoryMode: 'lg'
        })
      });
      
      if (!toolResponse.ok) {
        const errorText = await toolResponse.text();
        throw new Error(`工具结果失败: ${toolResponse.status} - ${errorText}`);
      }
      
      const toolData = await toolResponse.json();
      console.log('✅ 工具结果响应:', {
        success: toolData.success,
        content: toolData.data?.content?.substring(0, 200) || '',
        toolCalls: toolData.data?.toolCalls?.length || 0
      });
      
      console.log('🎉 测试完成！工具调用状态修复成功');
    } else {
      console.log('⚠️ 没有工具调用，无法测试工具结果处理');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error instanceof Error ? error.message : String(error));
  }
}

// 运行测试
testToolCallFix().catch(console.error);
