// generic-example.ts - 通用框架使用示例

import { createToolHub, ToolConfig } from '../index';
import { GenericAdapter } from '../adapters/generic-adapter';

/**
 * 通用框架使用示例
 */
export async function genericExample() {
  // 1. 创建 ToolHub 实例
  const toolHub = createToolHub({
    logging: true,
    statistics: true
  });

  // 2. 注册自定义工具
  const customTool: ToolConfig = {
    name: 'custom_calculator',
    description: '自定义计算器工具',
    schema: require('zod').z.object({
      operation: require('zod').z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: require('zod').z.number(),
      b: require('zod').z.number()
    }),
    handler: async (input: any) => {
      const { operation, a, b } = input;
      let result: number;

      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            return { success: false, error: '除数不能为零' };
          }
          result = a / b;
          break;
        default:
          return { success: false, error: '不支持的操作' };
      }

      return { success: true, data: { result, operation, a, b } };
    },
    category: 'math',
    tags: ['calculator', 'math']
  };

  toolHub.register(customTool);

  // 3. 创建通用适配器
  const adapter = new GenericAdapter();

  // 4. 转换工具
  const tools = toolHub.getEnabled();
  const genericTools = adapter.convertTools(tools);

  // 5. 使用工具
  console.log('可用的工具:', genericTools.map(t => t.name));

  // 6. 执行工具
  const calculatorTool = genericTools.find(t => t.name === 'custom_calculator');
  if (calculatorTool) {
    const result = await calculatorTool.execute({ operation: 'add', a: 5, b: 3 });
    console.log('计算器结果:', result);
  }

  return {
    toolHub,
    adapter,
    tools: genericTools
  };
}

/**
 * 在自定义框架中使用
 */
export class CustomFramework {
  private tools: Map<string, any> = new Map();

  addTool(tool: any) {
    this.tools.set(tool.name, tool);
  }

  async executeTool(name: string, input: any) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`工具 ${name} 不存在`);
    }
    return await tool.execute(input);
  }

  getTools() {
    return Array.from(this.tools.values());
  }
}

export async function customFrameworkExample() {
  const { toolHub, adapter } = await genericExample();
  const customFramework = new CustomFramework();

  // 将工具添加到自定义框架
  const tools = adapter.getTools();
  tools.forEach(tool => {
    customFramework.addTool(tool);
  });

  // 使用自定义框架执行工具
  const result = await customFramework.executeTool('custom_calculator', {
    operation: 'multiply',
    a: 4,
    b: 7
  });

  console.log('自定义框架执行结果:', result);

  return {
    toolHub,
    customFramework,
    tools: customFramework.getTools()
  };
}
