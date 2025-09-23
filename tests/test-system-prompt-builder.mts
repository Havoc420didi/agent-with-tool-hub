// test-system-prompt-builder.mts - 测试新的系统提示词构建器组件

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { SystemPromptBuilder, IdentityConfig, TaskConfig, ContextConfig, SystemPromptOptions } from '../src/core/system-prompt-builder.js';
import { ToolRegistry } from '../src/tool-hub/core/tool-registry.js';
import { WestoreCafeTools } from '../examples/tool-demo/westore-cafe-tools.js';

console.log('🧪 开始测试系统提示词构建器组件...\n');

async function testSystemPromptBuilder() {
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

    // 测试1: 微信小程序AI助手系统提示词
    console.log('🎯 测试1: 微信小程序AI助手系统提示词');
    console.log('='.repeat(80));
    
    const wechatPrompt = promptBuilder.buildWechatMiniProgramPrompt(
      '用户是25岁的程序员，喜欢喝咖啡，经常在下午工作间隙购买咖啡',
      '用户之前询问过拿铁咖啡的价格和口味，对咖啡品质有较高要求',
      '当前页面显示咖啡菜单，包含拿铁、美式、卡布奇诺等选项，页面数据包含价格和描述信息',
      {
        includeStatistics: true,
        includeParameters: true,
        includeDependencies: false
      }
    );
    
    console.log(wechatPrompt);
    console.log('='.repeat(80));

    // 测试2: 自定义身份和任务配置
    console.log('\n🎯 测试2: 自定义身份和任务配置');
    console.log('='.repeat(80));
    
    const identity: IdentityConfig = {
      description: '专业的咖啡顾问AI助手',
      expertise: ['咖啡知识', '口味推荐', '价格分析'],
      guidelines: [
        '根据用户喜好推荐合适的咖啡',
        '提供详细的咖啡信息',
        '考虑用户的预算和口味偏好'
      ],
      responseFormat: '以专业但友好的语调回答，包含具体的推荐理由'
    };

    const task: TaskConfig = {
      description: '帮助用户选择合适的咖啡产品',
      objectives: [
        '了解用户的口味偏好',
        '推荐合适的咖啡产品',
        '提供价格和品质信息'
      ],
      steps: [
        '询问用户的口味偏好',
        '分析可用的咖啡选项',
        '推荐最合适的产品',
        '解释推荐理由'
      ],
      notes: [
        '考虑用户的预算限制',
        '提供多种选择供用户参考',
        '确保推荐的产品符合用户需求'
      ]
    };

    const context: ContextConfig = {
      userInfo: '用户是咖啡爱好者，预算在30-50元之间',
      memorySummary: '用户之前购买过拿铁咖啡，对口感满意',
      developerContext: '当前显示咖啡菜单页面，包含各种咖啡的价格和描述',
      additionalContext: {
        'currentTime': '下午3点，适合喝咖啡的时间',
        'weather': '阴天，适合喝热咖啡'
      }
    };

    const customPrompt = promptBuilder.buildSystemPrompt(identity, task, context, {
      includeStatistics: true,
      includeParameters: true,
      includeDependencies: true
    });
    
    console.log(customPrompt);
    console.log('='.repeat(80));

    // 测试3: 通用智能助手
    console.log('\n🎯 测试3: 通用智能助手');
    console.log('='.repeat(80));
    
    const genericPrompt = promptBuilder.buildGenericAssistantPrompt(
      '多功能的AI助手',
      ['回答问题', '提供建议', '协助完成任务'],
      {
        includeStatistics: true,
        includeParameters: false,
        includeDependencies: false
      }
    );
    
    console.log(genericPrompt);
    console.log('='.repeat(80));

    // 测试4: 预览功能
    console.log('\n🎯 测试4: 预览功能');
    console.log('='.repeat(80));
    
    const previewPrompt = promptBuilder.previewSystemPrompt(identity, task, context, {
      includeStatistics: false,
      includeParameters: true,
      includeDependencies: false
    });
    
    console.log('预览结果:');
    console.log(previewPrompt.substring(0, 500) + '...');
    console.log('='.repeat(80));

    // 测试5: 不同选项组合
    console.log('\n🎯 测试5: 不同选项组合');
    console.log('='.repeat(80));
    
    const options: SystemPromptOptions[] = [
      { includeStatistics: false, includeParameters: false, includeDependencies: false },
      { includeStatistics: true, includeParameters: true, includeDependencies: true },
      { includeUnavailable: true, includeStatistics: true },
      { customPrefix: '【重要】请特别注意以下要求：' }
    ];

    options.forEach((option, index) => {
      console.log(`\n选项 ${index + 1}:`, option);
      console.log('-'.repeat(50));
      const prompt = promptBuilder.buildGenericAssistantPrompt(
        '测试助手',
        ['测试功能'],
        option
      );
      console.log(prompt.substring(0, 300) + '...');
    });

    console.log('\n✅ 所有测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testSystemPromptBuilder();
