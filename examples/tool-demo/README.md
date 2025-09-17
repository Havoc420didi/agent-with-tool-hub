# 外部工具集合

本目录包含独立于 tool-hub 核心系统的外部工具集合。

## 目录结构

```
external-tools/
├── README.md                    # 本文件
├── westore-cafe-tools.ts       # 西城咖啡工具集合
└── your-tool-set.ts            # 你的工具集合 (示例)
```

## 工具列表

### 1. 西城咖啡工具集合 (`westore-cafe-tools.ts`)

基于 `westore-cafe.json` 定义的小程序工具集合，包含：

- `displayGoods` - 展示商品列表
- `getGoodsDetail` - 获取商品详情
- `displayGoodsDetailToUser` - 展示商品规格信息
- `addToCart` - 加入购物车
- `order` - 点单
- `clearShopCart` - 清空购物车
- `deleteProduct` - 删除购物车商品
- `getOrderStatus` - 获取订单状态
- `displayShopCart` - 展示购物车

## 使用方法

### 1. 直接使用

```typescript
import { WestoreCafeTools } from './westore-cafe-tools.js';

// 获取所有工具
const tools = WestoreCafeTools.getAll();

// 使用特定工具
const displayGoodsTool = WestoreCafeTools.displayGoods();
const result = await displayGoodsTool.handler({
  goodsList: [/* 商品数据 */]
});
```

### 2. 通过 ToolHub 集成

```typescript
import { ToolHub } from '../src/tool-hub/core/tool-hub.js';
import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

// 创建 ToolHub 实例
const toolHub = new ToolHub();

// 加载外部工具
const westoreTools = await ExternalToolLoader.loadFromPath('./external-tools/westore-cafe-tools.js');

// 注册工具
toolHub.registerBatch(westoreTools);

// 使用工具
const result = await toolHub.execute('displayGoods', {
  goodsList: [/* 商品数据 */]
});
```

## 开发新工具

### 1. 创建工具文件

```typescript
// your-tool-set.ts
import { z } from 'zod';

// 定义类型和辅助函数
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export class ToolHelpers {
  static createSuccessResult(data: any): ToolResult {
    return { success: true, data };
  }
  
  static createErrorResult(error: string): ToolResult {
    return { success: false, error };
  }
}

// 实现工具类
export class YourToolSet {
  static yourTool(): ToolConfig {
    return {
      name: 'your_tool',
      description: '你的工具描述',
      schema: z.object({
        input: z.string().describe('输入参数')
      }),
      handler: async (input: any) => {
        // 工具逻辑
        return ToolHelpers.createSuccessResult({ result: 'success' });
      },
      tags: ['your', 'tool'],
      permissionLevel: 'public',
      securityLevel: 'auto'
    };
  }
  
  static getAll(): ToolConfig[] {
    return [this.yourTool()];
  }
}
```

### 2. 测试工具

```typescript
// test-your-tool-set.mts
import { YourToolSet } from './your-tool-set.js';
import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

async function testYourToolSet() {
  // 加载工具
  const tools = ExternalToolLoader.loadFromObject(YourToolSet.getAll());
  
  // 测试工具
  const tool = tools.find(t => t.name === 'your_tool');
  if (tool) {
    const result = await tool.handler({ input: 'test' });
    console.log('测试结果:', result);
  }
}

testYourToolSet();
```

## 特性

### 1. 独立性
- 不依赖 tool-hub 核心实现
- 可以独立开发和测试
- 支持独立部署和版本管理

### 2. 类型安全
- 完整的 TypeScript 支持
- 自定义类型系统
- 编译时类型检查

### 3. 适配器集成
- 通过 `ExternalToolAdapter` 自动转换
- 支持权限级别映射
- 兼容 tool-hub 接口

### 4. 动态加载
- 支持运行时加载
- 无需重启服务
- 支持热更新

## 注意事项

1. **文件位置**: 确保工具文件位于 `external-tools/` 目录下
2. **编译输出**: 需要编译为 JavaScript 文件供动态加载
3. **类型兼容**: 确保外部工具类型与适配器兼容
4. **错误处理**: 实现完整的错误处理机制
5. **文档说明**: 为每个工具提供详细的文档

## 相关文档

- [西城咖啡工具详细文档](../docs/WESTORE_CAFE_TOOLS.md)
- [外部工具开发指南](../docs/EXTERNAL_TOOL_DEVELOPMENT.md)
- [ToolHub 核心文档](../src/tool-hub/README.md)
