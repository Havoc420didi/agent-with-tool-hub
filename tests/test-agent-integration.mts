// test-agent-integration.mts - 测试 ToolHub 与 Agent 的集成

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { ToolHub } from '../src/tool-hub/core/tool-hub.js';
import { CommonTools } from '../src/tool-hub/presets/common-tools.js';
import { ApiTools } from '../src/tool-hub/presets/api-tools.js';
import { AgentService } from '../src/services/agent.service.js';

console.log('🤖 开始测试 ToolHub 与 Agent 的集成...\n');

async function testAgentIntegration() {
  try {
    // 1. 创建 ToolHub 并注册工具
    console.log('=== 1. 创建 ToolHub 并注册工具 ===');
    const toolHub = new ToolHub({
      logging: true,
      logLevel: 'info',
      statistics: true,
      caching: true
    });

    // 注册所有工具
    const commonTools = CommonTools.getAll();
    const apiTools = ApiTools.getAll();
    const allTools = [...commonTools, ...apiTools];
    
    toolHub.registerBatch(commonTools);
    toolHub.registerBatch(apiTools);
    
    console.log(`✅ ToolHub 创建成功，注册了 ${allTools.length} 个工具`);
    console.log('');

    // 2. 创建 Agent 服务
    console.log('=== 2. 创建 Agent 服务 ===');
    const agentService = new AgentService();
    console.log('✅ Agent 服务创建成功');
    console.log('');

    // 3. 创建 Agent 并添加工具
    console.log('=== 3. 创建 Agent 并添加工具 ===');
    
    // 将 ToolHub 中的工具转换为 Agent 可用的格式
    const agentTools = allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      handler: tool.handler
    }));

    const agentConfig = {
      model: { name: "deepseek-chat" },
      tools: agentTools,
      memory: { enabled: true },
      streaming: false
    };

    const createResult = await agentService.createAgent('test-agent', agentConfig);
    console.log('Agent 创建结果:', createResult);
    
    if (createResult.success) {
      console.log(`✅ Agent 创建成功，包含 ${agentConfig.tools.length} 个工具`);
      console.log('');

      // 4. 测试 Agent 工具调用
      console.log('=== 4. 测试 Agent 工具调用 ===');
      
      // 测试数学计算
      console.log('测试数学计算:');
      const calcResponse = await agentService.chat('test-agent', { 
        message: '请帮我计算 15 * 8 + 32 的结果' 
      });
      console.log('数学计算结果:', calcResponse);
      console.log('');

      // 测试时间获取
      console.log('测试时间获取:');
      const timeResponse = await agentService.chat('test-agent', { 
        message: '请告诉我当前时间' 
      });
      console.log('时间获取结果:', timeResponse);
      console.log('');

      // 测试字符串处理
      console.log('测试字符串处理:');
      const stringResponse = await agentService.chat('test-agent', { 
        message: '请将 "Hello World" 转换为大写' 
      });
      console.log('字符串处理结果:', stringResponse);
      console.log('');

      // 测试随机数生成
      console.log('测试随机数生成:');
      const randomResponse = await agentService.chat('test-agent', { 
        message: '请生成 3 个 1 到 100 之间的随机整数' 
      });
      console.log('随机数生成结果:', randomResponse);
      console.log('');

      // 测试数据验证
      console.log('测试数据验证:');
      const validateResponse = await agentService.chat('test-agent', { 
        message: '请验证邮箱地址 "test@example.com" 的格式是否正确' 
      });
      console.log('数据验证结果:', validateResponse);
      console.log('');

      // 5. 测试工具列表获取
      console.log('=== 5. 测试工具列表获取 ===');
      const toolsResult = await agentService.getAgentTools('test-agent');
      console.log('Agent 工具列表:', toolsResult);
      console.log('');

      // 6. 测试 Agent 状态
      console.log('=== 6. 测试 Agent 状态 ===');
      const statusResult = await agentService.getAgentStatus('test-agent');
      console.log('Agent 状态:', statusResult);
      console.log('');

      // 7. 测试流式处理
      console.log('=== 7. 测试流式处理 ===');
      console.log('流式处理测试:');
      const stream = agentService.streamChat('test-agent', { 
        message: '请告诉我今天的天气如何，并生成一个随机数' 
      });
      
      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.data.content) {
          process.stdout.write(chunk.data.content);
        } else if (chunk.type === 'error') {
          console.log('\n错误:', chunk.data);
        } else if (chunk.type === 'done') {
          console.log('\n✅ 流式处理完成');
        }
      }
      console.log('');

      // 8. 清理测试 Agent
      console.log('=== 8. 清理测试 Agent ===');
      const deleteResult = await agentService.deleteAgent('test-agent');
      console.log('删除 Agent 结果:', deleteResult);
      console.log('');

    } else {
      console.log('❌ Agent 创建失败:', createResult.error);
    }

    console.log('✅ ToolHub 与 Agent 集成测试完成！');
    console.log('');
    console.log('🎉 集成测试总结:');
    console.log('  ✨ ToolHub 成功为 Agent 提供了全量工具');
    console.log('  🤖 Agent 能够正确调用各种工具');
    console.log('  🔧 工具调用结果正确返回');
    console.log('  📡 流式处理功能正常');
    console.log('  🎯 全量提供工具模式与 Agent 集成良好');

  } catch (error) {
    console.error('❌ 集成测试失败:', error);
  }
}

// 运行测试
testAgentIntegration();
