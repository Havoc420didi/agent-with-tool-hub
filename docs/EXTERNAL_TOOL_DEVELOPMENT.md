# 外部工具开发指南

本指南介绍如何开发和集成外部工具到 tool-hub 系统中。

## 目录结构

```
external-tools/           # 外部工具目录
├── westore-cafe-tools.ts # 西城咖啡工具集合
├── your-tool-set.ts     # 你的工具集合
└── README.md            # 外部工具说明

src/tool-hub/adapters/   # 适配器目录
├── external-tool-adapter.ts  # 外部工具适配器
└── index.ts             # 适配器导出
```

## 开发外部工具

### 1. 定义工具类型

外部工具需要定义自己的类型系统：

```typescript
// external-tools/your-tool-set.ts
import { z } from 'zod';

// 定义工具结果接口
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// 定义权限级别
export enum ToolPermissionLevel {
  PUBLIC = 'public',
  ADMIN = 'admin'
}

// 定义安全级别
export enum ToolSecurityLevel {
  AUTO = 'auto',
  HUMAN = 'human',
  SYSTEM = 'system'
}

// 定义工具配置接口
export interface ToolConfig {
  name: string;
  displayName?: string;
  description: string;
  longDescription?: string;
  schema: z.ZodSchema<any>;
  handler: (input: any) => Promise<ToolResult> | ToolResult;
  tags: string[];
  permissionLevel?: ToolPermissionLevel;
  securityLevel?: ToolSecurityLevel;
  config?: Record<string, any>;
  enabled?: boolean;
}
```

### 2. 创建辅助函数

```typescript
// 辅助函数
export class ToolHelpers {
  static createSuccessResult(data: any, metadata?: Record<string, any>): ToolResult {
    return {
      success: true,
      data,
      metadata
    };
  }

  static createErrorResult(error: string, metadata?: Record<string, any>): ToolResult {
    return {
      success: false,
      error,
      metadata
    };
  }
}

// 工具配置创建函数
export function createToolConfig(config: Omit<ToolConfig, 'permissionLevel' | 'securityLevel' | 'enabled'> & Partial<Pick<ToolConfig, 'permissionLevel' | 'securityLevel' | 'enabled'>>): ToolConfig {
  return {
    permissionLevel: ToolPermissionLevel.PUBLIC,
    securityLevel: ToolSecurityLevel.AUTO,
    enabled: true,
    ...config
  };
}
```

### 3. 实现工具类

```typescript
export class YourToolSet {
  /**
   * 示例工具
   */
  static exampleTool(): ToolConfig {
    return createToolConfig({
      name: 'example_tool',
      description: '示例工具',
      schema: z.object({
        input: z.string().describe('输入参数')
      }),
      handler: async (input: { input: string }) => {
        try {
          // 工具逻辑
          const result = {
            message: `处理输入: ${input.input}`,
            timestamp: new Date().toISOString()
          };
          
          return ToolHelpers.createSuccessResult(result);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['example', 'demo'],
      permissionLevel: ToolPermissionLevel.PUBLIC,
      securityLevel: ToolSecurityLevel.AUTO
    });
  }

  /**
   * 获取所有工具
   */
  static getAll(): ToolConfig[] {
    return [
      this.exampleTool()
    ];
  }

  /**
   * 按标签获取工具
   */
  static getByTag(tag: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.tags?.includes(tag));
  }
}
```

## 集成到 ToolHub

### 1. 使用 ExternalToolLoader

```typescript
import { ToolHub } from '../src/tool-hub/core/tool-hub.js';
import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

// 创建 ToolHub 实例
const toolHub = new ToolHub();

// 加载外部工具
const externalTools = await ExternalToolLoader.loadFromPath('./external-tools/your-tool-set.js');

// 注册工具
toolHub.registerBatch(externalTools);

// 使用工具
const result = await toolHub.execute('example_tool', {
  input: 'Hello World'
});
```

### 2. 从对象加载

```typescript
import { YourToolSet } from './external-tools/your-tool-set.js';
import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

// 从对象加载
const externalTools = ExternalToolLoader.loadFromObject(YourToolSet.getAll());

// 注册工具
toolHub.registerBatch(externalTools);
```

## 最佳实践

### 1. 工具设计原则

- **单一职责**: 每个工具只做一件事
- **参数验证**: 使用 Zod 进行严格的参数验证
- **错误处理**: 提供详细的错误信息
- **类型安全**: 使用 TypeScript 确保类型安全

### 2. 命名规范

- 工具名称使用下划线分隔: `your_tool_name`
- 类名使用帕斯卡命名: `YourToolSet`
- 方法名使用驼峰命名: `getAll()`

### 3. 标签系统

```typescript
// 使用有意义的标签
tags: ['category', 'function', 'priority']

// 示例
tags: ['westore', 'cafe', 'goods', 'display']
tags: ['system', 'admin', 'critical']
tags: ['utility', 'helper', 'common']
```

### 4. 权限和安全

```typescript
// 根据工具功能设置合适的权限级别
permissionLevel: ToolPermissionLevel.PUBLIC,  // 公开工具
permissionLevel: ToolPermissionLevel.ADMIN,   // 管理员工具

// 根据风险级别设置安全级别
securityLevel: ToolSecurityLevel.AUTO,   // 自动执行
securityLevel: ToolSecurityLevel.HUMAN,  // 需要人工确认
securityLevel: ToolSecurityLevel.SYSTEM, // 系统级操作
```

### 5. 错误处理

```typescript
handler: async (input: any) => {
  try {
    // 参数验证
    if (!input.requiredParam) {
      return ToolHelpers.createErrorResult('缺少必需参数: requiredParam');
    }
    
    // 业务逻辑
    const result = await processInput(input);
    
    return ToolHelpers.createSuccessResult(result);
  } catch (error) {
    // 统一错误处理
    return ToolHelpers.createErrorResult(
      error instanceof Error ? error.message : String(error)
    );
  }
}
```

## 测试

### 1. 单元测试

```typescript
// test-your-tool-set.mts
import { YourToolSet } from './external-tools/your-tool-set.js';
import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

async function testYourToolSet() {
  // 加载工具
  const tools = ExternalToolLoader.loadFromObject(YourToolSet.getAll());
  
  // 测试工具
  const tool = tools.find(t => t.name === 'example_tool');
  if (tool) {
    const result = await tool.handler({ input: 'test' });
    console.log('测试结果:', result);
  }
}
```

### 2. 集成测试

```typescript
// test-integration.mts
import { ToolHub } from '../src/tool-hub/core/tool-hub.js';
import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

async function testIntegration() {
  const toolHub = new ToolHub();
  
  // 加载外部工具
  const tools = await ExternalToolLoader.loadFromPath('./external-tools/your-tool-set.js');
  toolHub.registerBatch(tools);
  
  // 测试工具执行
  const result = await toolHub.execute('example_tool', { input: 'test' });
  console.log('集成测试结果:', result);
}
```

## 部署

### 1. 文件结构

确保外部工具文件位于正确的位置：

```
external-tools/
├── your-tool-set.ts      # 源代码
├── your-tool-set.js      # 编译后的代码
└── README.md             # 工具说明
```

### 2. 编译

```bash
# 编译 TypeScript 文件
npx tsc external-tools/your-tool-set.ts --outDir external-tools/
```

### 3. 动态加载

```typescript
// 支持动态加载
const tools = await ExternalToolLoader.loadFromPath('./external-tools/your-tool-set.js');
```

## 故障排除

### 1. 常见问题

- **模块加载失败**: 检查文件路径和编译输出
- **类型不匹配**: 确保外部工具类型与适配器兼容
- **权限错误**: 检查权限级别设置

### 2. 调试技巧

```typescript
// 启用详细日志
const toolHub = new ToolHub({
  logging: true,
  logLevel: 'debug'
});

// 检查工具注册状态
console.log('注册的工具:', toolHub.getAll().map(t => t.name));

// 检查工具配置
const tool = toolHub.get('your_tool_name');
console.log('工具配置:', tool);
```

## 总结

外部工具开发提供了灵活的扩展方式，允许开发者：

1. 独立开发和维护工具集合
2. 通过适配器无缝集成到 tool-hub 系统
3. 支持动态加载和热更新
4. 保持类型安全和错误处理的一致性

遵循本指南可以确保外部工具的质量和兼容性。
