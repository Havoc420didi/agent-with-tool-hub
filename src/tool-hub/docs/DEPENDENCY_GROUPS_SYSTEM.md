# 依赖组系统 (Dependency Groups System)

## 概述

依赖组系统是一个强大的工具依赖管理机制，支持复杂的依赖逻辑和图关系。它允许工具定义多种类型的依赖关系，包括"任意一个"、"全部"和"顺序"依赖。

## 核心概念

### 1. 依赖组类型 (Dependency Group Types)

#### `any` - 任意一个依赖
- **描述**: 满足组内任意一个依赖即可
- **用途**: 当工具有多种前置条件时使用
- **示例**: `addToCart` 工具需要先展示商品或获取商品详情

```typescript
dependencyGroups: [
  {
    type: 'any',
    description: '需要先展示商品或获取商品详情',
    dependencies: [
      { toolName: 'displayGoods', type: 'required' },
      { toolName: 'getGoodsDetail', type: 'required' }
    ]
  }
]
```

#### `all` - 全部依赖
- **描述**: 必须满足组内所有依赖
- **用途**: 当工具需要多个前置条件都满足时使用
- **示例**: `deleteProduct` 工具需要展示购物车和确认商品信息

```typescript
dependencyGroups: [
  {
    type: 'all',
    description: '需要同时满足：展示购物车和确认商品信息',
    dependencies: [
      { toolName: 'displayShopCart', type: 'required' }
    ]
  }
]
```

#### `sequence` - 顺序依赖
- **描述**: 按顺序检查依赖，前面的依赖必须满足才能检查后面的
- **用途**: 当工具有严格的执行顺序要求时使用
- **示例**: `displayGoodsDetailToUser` 工具需要先获取商品详情

```typescript
dependencyGroups: [
  {
    type: 'sequence',
    description: '需要按顺序执行：先获取商品详情，再展示规格信息',
    dependencies: [
      { toolName: 'getGoodsDetail', type: 'required' }
    ]
  }
]
```

### 3. 依赖条件 (Dependency Conditions)

每个依赖可以定义特定的条件：

```typescript
dependencies: [
  {
    toolName: 'someTool',
    type: 'required',
    condition: (context) => {
      // 检查特定条件
      return context.metadata?.someCondition === true;
    }
  }
]
```

## 使用示例

### 完整的工具配置示例

```typescript
const orderTool = createToolConfig({
  name: 'order',
  description: '下单工具',
  schema: z.object({
    paymentMethod: z.string().optional(),
    deliveryAddress: z.string().optional()
  }),
  handler: async (params) => {
    // 下单逻辑
  },
  dependencyGroups: [
    {
      type: 'any',
      description: '需要先加入购物车或展示购物车',
      dependencies: [
        { toolName: 'addToCart', type: 'required' },
        { toolName: 'displayShopCart', type: 'required' }
      ]
    }
  ],
});
```

## 系统特性

### 1. 动态工具可用性
- 工具只有在所有依赖条件满足时才可用
- 实时更新工具可用性状态
- 提供详细的不可用原因和建议

### 2. 灵活的依赖逻辑
- 支持多种依赖组类型
- 支持条件依赖
- 支持全局条件

### 3. 图关系管理
- 自动构建依赖图
- 支持循环依赖检测
- 提供执行路径建议

### 4. 执行历史跟踪
- 记录工具执行历史
- 跟踪执行上下文
- 支持依赖状态查询

## API 接口

### 工具可用性查询

```typescript
// 获取单个工具可用性
const status = toolHub.getToolAvailabilityStatus('order');
console.log(status.available); // true/false
console.log(status.reason); // 可用性原因
console.log(status.missingDependencies); // 缺少的依赖
console.log(status.suggestedActions); // 建议的操作

// 获取所有工具可用性
const allStatus = toolHub.getAllToolAvailabilityStatus();
```

### 依赖图查询

```typescript
// 获取依赖图
const graph = toolHub.getDependencyGraph();
console.log(graph.nodes); // 节点信息
console.log(graph.edges); // 边信息

// 获取执行路径建议
const path = toolHub.getExecutionPathSuggestion('order');
console.log(path); // 建议的执行路径
```

## 最佳实践

### 1. 依赖组设计
- 使用 `any` 类型处理多种前置条件
- 使用 `all` 类型处理必须同时满足的条件
- 使用 `sequence` 类型处理有严格顺序要求的场景

### 2. 条件设计
- 全局条件用于工具级别的约束
- 依赖条件用于特定依赖的约束
- 保持条件简单和可测试

### 3. 性能考虑
- 避免过深的依赖链
- 合理使用条件依赖
- 定期清理执行历史

## 测试和验证

系统提供了完整的测试工具来验证依赖组功能：

```bash
# 运行依赖组测试
npx tsx src/tool-hub/examples/test-depgroups.mts
```

测试包括：
- 不同依赖组类型的验证
- 工具执行流程测试
- 可用性状态检查
- 全局条件验证

## 总结

依赖组系统提供了一个强大而灵活的工具依赖管理机制，支持复杂的业务逻辑和图关系。通过合理使用不同的依赖组类型和条件，可以构建出既灵活又可靠的工具生态系统。
