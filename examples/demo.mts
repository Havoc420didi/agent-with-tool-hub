// demo.mts - 简洁框架演示

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), './config.env') });

import { 
  createDefaultAgent, 
  createAgent, 
  tool,
  z 
} from '../src/index.js';

console.log('🚀 开始简洁框架演示...\n');

async function runDemo() {
  try {
    // 1. 创建默认 Agent
    console.log('=== 1. 创建默认 Agent ===');
    const defaultAgent = createDefaultAgent();
    console.log('✅ 默认 Agent 创建成功');
    console.log('可用工具:', defaultAgent.getTools());
    console.log('');

    // 2. 基本对话
    console.log('=== 2. 基本对话 ===');
    const response = await defaultAgent.invoke("你好，请介绍一下你自己", "thread-1");
    console.log('Agent 回复:', response.content);
    console.log('使用的工具:', response.metadata?.toolsUsed || '无');
    console.log('');

    // 3. 自定义 Agent
    console.log('=== 3. 自定义 Agent ===');
    const customAgent = createAgent({
      model: {
        name: "deepseek-chat",
        temperature: 0.1
      },
      memory: {
        enabled: true
      }
    });

    // 添加自定义工具
    customAgent.addTool({
      name: 'greet_user',
      description: '问候用户',
      schema: z.object({
        name: z.string().describe("用户姓名"),
      }),
      handler: (input: any) => {
        return `你好，${input.name}！欢迎使用我们的服务！`;
      }
    });

    console.log('✅ 自定义 Agent 创建成功');
    console.log('工具列表:', customAgent.getTools());

    // 测试自定义工具
    const customResponse = await customAgent.invoke("请问候用户张三");
    console.log('自定义工具测试:', customResponse.content);
    console.log('');

    // 4. 流式处理
    console.log('=== 4. 流式处理 ===');
    console.log('流式处理测试:');
    const stream = customAgent.stream("请告诉我今天的天气如何", "thread-2");
    
    for await (const chunk of stream) {
      if (chunk.content) {
        process.stdout.write(chunk.content);
      }
    }
    console.log('\n');

    // 5. 工具管理器
    console.log('=== 5. 工具管理器 ===');
    const toolManager = new DynamicToolManager();
    
    // 注册工具
    toolManager.register({
      name: 'calculate',
      description: '数学计算',
      schema: z.object({
        expression: z.string().describe("数学表达式"),
      }),
      handler: (input: any) => {
        try {
          const result = eval(input.expression);
          return `计算结果: ${input.expression} = ${result}`;
        } catch (error) {
          return `计算失败: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    });

    console.log('✅ 工具管理器创建成功');
    console.log('工具数量:', toolManager.size());
    console.log('工具名称:', toolManager.listToolNames());

    // 测试工具
    const tools = toolManager.getTools();
    const toolResult = await tools[0].invoke({ expression: "2 + 3 * 4" });
    console.log('工具调用结果:', toolResult);
    console.log('');

    console.log('✅ 简洁框架演示完成！');
    console.log('');
    console.log('🎉 框架特性:');
    console.log('  ✨ 基于 Koa.js + TypeScript + Rspack');
    console.log('  🚀 简洁的 API 设计');
    console.log('  🔧 动态工具管理');
    console.log('  📡 流式处理支持');
    console.log('  🎯 类型安全');
    console.log('  📚 自动文档生成');

  } catch (error) {
    console.error('❌ 演示失败:', error);
  }
}

// 运行演示
runDemo();
