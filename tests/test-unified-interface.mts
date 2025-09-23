// test-unified-interface.mts - 测试统一接口设计

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { SystemPromptBuilder, SystemPromptBuildConfig, TagConfig } from '../src/core/system-prompt-builder.js';
import { AgentBuilder, createDefaultAgent } from '../src/core/agent-builder.js';
import { ToolRegistry } from '../src/tool-hub/core/tool-registry.js';
import { WestoreCafeTools } from '../examples/tool-demo/westore-cafe-tools.js';

console.log('🧪 开始测试统一接口设计...\n');

async function testUnifiedInterface() {
  try {
    // 创建工具注册表
    const registry = new ToolRegistry();
    
    // 注册 Westore Cafe 工具
    console.log('📝 注册 Westore Cafe 工具...');
    const tools = WestoreCafeTools.getAll();
    const registrationResult = registry.registerBatch(tools);
    
    console.log(`✅ 注册结果: 成功 ${registrationResult.success} 个, 失败 ${registrationResult.failed} 个\n`);

    // 创建系统提示词构建器
    const promptBuilder = new SystemPromptBuilder(registry);

    // 测试1: SystemPromptBuilder 统一接口
    console.log('🎯 测试1: SystemPromptBuilder 统一接口');
    console.log('='.repeat(80));

    // 1.1 通用类型
    const genericConfig: SystemPromptBuildConfig = {
      kind: 'generic',
      config: {
        description: '智能助手',
        expertise: ['帮助用户完成任务', '回答用户问题']
      },
      options: {
        includeStatistics: true,
        includeParameters: true,
        includeDependencies: true,
        includeUnavailable: true
      }
    };
    const genericPrompt = promptBuilder.buildSystemPromptByKind(genericConfig);
    console.log('📋 1.1 通用类型:');
    console.log(genericPrompt.substring(0, 300) + '...');

    // 1.2 微信小程序类型
    const wechatConfig: SystemPromptBuildConfig = {
      kind: 'wechat',
      config: {
        developerContext: '当前页面显示咖啡菜单，包含各种咖啡选项'
      },
      options: {
        includeStatistics: true,
        includeParameters: true,
        includeDependencies: true,
        includeUnavailable: true
      }
    };
    const wechatPrompt = promptBuilder.buildSystemPromptByKind(wechatConfig);
    console.log('\n📋 1.2 微信小程序类型:');
    console.log(wechatPrompt);

    return;

    // 1.3 自定义类型
    const customConfig: SystemPromptBuildConfig = {
      kind: 'custom',
      config: {
        tags: [
          {
            name: 'Identity',
            content: [
              '你是专业的咖啡顾问AI助手',
              '你擅长咖啡知识、口味推荐、价格分析',
              '根据用户喜好推荐合适的咖啡',
              '提供详细的咖啡信息',
              '考虑用户的预算和口味偏好'
            ]
          },
          {
            name: 'Task',
            content: [
              '帮助用户选择合适的咖啡产品',
              '任务目标:',
              '- 了解用户的口味偏好',
              '- 推荐合适的咖啡产品',
              '- 提供价格和品质信息'
            ]
          }
        ],
        context: {
          userInfo: '用户是咖啡爱好者，预算在30-50元之间',
          memorySummary: '用户之前购买过拿铁咖啡，对口感满意',
          developerContext: '当前显示咖啡菜单页面，包含各种咖啡的价格和描述'
        }
      },
      options: {
        includeStatistics: true,
        includeParameters: true,
        includeDependencies: true
      }
    };
    const customPrompt = promptBuilder.buildSystemPromptByKind(customConfig);
    console.log('\n📋 1.3 自定义类型:');
    console.log(customPrompt.substring(0, 300) + '...');

    console.log('='.repeat(80));

    // 测试2: AgentBuilder 统一接口
    console.log('\n🎯 测试2: AgentBuilder 统一接口');
    console.log('='.repeat(80));

    // 创建 Agent
    const agent = createDefaultAgent();
    agent.initialize();
    agent.getToolHub().registerBatch(tools);

    // 2.1 通用类型
    const agentGenericConfig: SystemPromptBuildConfig = {
      kind: 'generic',
      config: {
        description: 'Agent智能助手',
        expertise: ['智能对话', '任务处理']
      },
      options: {
        includeStatistics: true,
        includeParameters: true,
        includeDependencies: false
      }
    };
    const agentGenericPrompt = agent.buildSystemPrompt(agentGenericConfig);
    console.log('📋 2.1 通用类型:');
    console.log(agentGenericPrompt.substring(0, 300) + '...');

    // 2.2 微信小程序类型
    const agentWechatConfig: SystemPromptBuildConfig = {
      kind: 'wechat',
      config: {
        userInfo: 'Agent用户',
        memorySummary: 'Agent记忆',
        developerContext: 'Agent上下文'
      },
      options: {
        includeStatistics: true,
        includeParameters: false,
        includeDependencies: false
      }
    };
    const agentWechatPrompt = agent.buildSystemPrompt(agentWechatConfig);
    console.log('\n📋 2.2 微信小程序类型:');
    console.log(agentWechatPrompt.substring(0, 300) + '...');

    // 2.3 自定义类型
    const agentCustomConfig: SystemPromptBuildConfig = {
      kind: 'custom',
      config: {
        tags: [
          {
            name: 'Identity',
            content: [
              '你是Agent自定义助手',
              '你擅长Agent功能',
              'Agent响应'
            ]
          },
          {
            name: 'Task',
            content: [
              'Agent处理用户请求',
              '任务目标:',
              '- Agent理解',
              '- Agent响应'
            ]
          }
        ],
        context: {
          userInfo: 'Agent用户',
          memorySummary: 'Agent记忆'
        }
      },
      options: {
        includeStatistics: false,
        includeParameters: false,
        includeDependencies: false
      }
    };
    const agentCustomPrompt = agent.buildSystemPrompt(agentCustomConfig);
    console.log('\n📋 2.3 自定义类型:');
    console.log(agentCustomPrompt.substring(0, 300) + '...');

    console.log('='.repeat(80));

    // 测试3: 简化配置
    console.log('\n🎯 测试3: 简化配置');
    console.log('='.repeat(80));

    // 3.1 最简单的通用助手
    const simpleGenericConfig: SystemPromptBuildConfig = {
      kind: 'generic',
      config: {}
    };
    const simpleGenericPrompt = agent.buildSystemPrompt(simpleGenericConfig);
    console.log('📋 3.1 最简单的通用助手:');
    console.log(simpleGenericPrompt.substring(0, 200) + '...');

    // 3.2 带选项的通用助手
    const genericWithOptionsConfig: SystemPromptBuildConfig = {
      kind: 'generic',
      config: {},
      options: {
        includeStatistics: true,
        includeParameters: true,
        includeDependencies: false
      }
    };
    const genericWithOptionsPrompt = agent.buildSystemPrompt(genericWithOptionsConfig);
    console.log('\n📋 3.2 带选项的通用助手:');
    console.log(genericWithOptionsPrompt.substring(0, 200) + '...');

    console.log('='.repeat(80));

    // 测试4: 错误处理
    console.log('\n🎯 测试4: 错误处理');
    console.log('='.repeat(80));

    try {
      // 测试缺少参数的情况
      const invalidWechatConfig: SystemPromptBuildConfig = {
        kind: 'wechat',
        config: { userInfo: 'test' } // 缺少 memorySummary 和 developerContext
      };
      agent.buildSystemPrompt(invalidWechatConfig);
    } catch (error) {
      console.log('✅ 正确捕获错误:', error instanceof Error ? error.message : String(error));
    }

    try {
      // 测试无效类型
      const invalidConfig: SystemPromptBuildConfig = {
        kind: 'invalid' as any,
        config: {}
      };
      agent.buildSystemPrompt(invalidConfig);
    } catch (error) {
      console.log('✅ 正确捕获错误:', error instanceof Error ? error.message : String(error));
    }

    console.log('='.repeat(80));

    // 测试5: 预览功能
    console.log('\n🎯 测试5: 预览功能');
    console.log('='.repeat(80));

    const previewPrompt = agent.previewSystemPrompt({
      includeStatistics: true,
      includeParameters: true,
      includeDependencies: false
    });
    console.log('📋 预览系统提示词:');
    console.log(previewPrompt.substring(0, 300) + '...');

    console.log('='.repeat(80));

    console.log('\n✅ 所有统一接口测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testUnifiedInterface();
