# 工具描述导出功能

## 概述

`ToolRegistry` 现在支持导出工具描述和依赖关系信息，方便 LLM Agent 了解可用的工具能力。这对于在没有完整 tool-call 时，让 Agent 能够预期自己能够做到哪些能力非常有用。

## 主要功能

### 1. 工具描述导出

```typescript
// 获取工具描述列表
const descriptions = registry.getToolDescriptions({
  includeUnavailable: false,  // 是否包含不可用工具
  includeParameters: true     // 是否包含参数详情
});
```

### 2. 依赖关系导出

```typescript
// 获取依赖关系描述
const dependencies = registry.getDependencyDescriptions();
```

### 3. 系统提示词生成

```typescript
// 生成系统提示词
const systemPrompt = registry.generateSystemPrompt({
  includeUnavailable: false,  // 只显示可用工具
  includeParameters: true,    // 包含参数详情
  includeStatistics: true     // 包含统计信息
});
```

### 4. Markdown 格式导出

```typescript
// 生成 Markdown 格式的工具描述
const markdown = registry.generateMarkdownDescription({
  includeUnavailable: true,
  includeDependencies: true,
  includeParameters: true,
  includeStatistics: true
});
```

### 5. 统一导出接口

```typescript
// 支持多种格式导出
const result = registry.exportToolInfo({
  format: 'json',           // 'json' | 'markdown' | 'text'
  includeUnavailable: false,
  includeDependencies: true,
  includeStatistics: true,
  includeParameters: true
});
```

## 接口定义

### ToolDescription

```typescript
interface ToolDescription {
  name: string;                    // 工具名称
  description: string;             // 工具描述
  parameters: any;                 // 工具参数模式
  tags?: string[];                // 工具标签
  available: boolean;              // 是否可用
  availabilityReason?: string;     // 可用性原因
  dependencies: string[];          // 依赖的工具
  dependents: string[];           // 依赖此工具的其他工具
}
```

### DependencyDescription

```typescript
interface DependencyDescription {
  toolName: string;               // 工具名称
  dependsOn: string[];            // 依赖的工具列表
  dependedBy: string[];           // 被依赖的工具列表
  dependencyGroups?: Array<{      // 依赖组信息
    type: string;
    description?: string;
    dependencies: string[];
  }>;
}
```

### ExportOptions

```typescript
interface ExportOptions {
  format?: 'markdown' | 'json' | 'text';  // 输出格式
  includeUnavailable?: boolean;            // 是否包含不可用工具
  includeDependencies?: boolean;           // 是否包含依赖关系
  includeStatistics?: boolean;             // 是否包含统计信息
  includeParameters?: boolean;             // 是否包含参数详情
}
```

## 使用场景

### 1. Agent 系统提示词

```typescript
// 为 Agent 生成系统提示词
const systemPrompt = registry.generateSystemPrompt({
  includeUnavailable: false,
  includeParameters: true,
  includeStatistics: true
});

// 在 Agent 初始化时使用
const agent = new Agent({
  systemPrompt: systemPrompt,
  tools: registry.getAvailableTools()
});
```

### 2. 工具能力展示

```typescript
// 生成工具能力概览
const overview = registry.getToolCapabilityOverview({
  includeUnavailable: true,
  includeDependencies: true,
  includeStatistics: true
});

console.log(`总工具数: ${overview.statistics.totalTools}`);
console.log(`可用工具数: ${overview.statistics.availableTools}`);
```

### 3. 依赖关系分析

```typescript
// 获取依赖关系
const dependencies = registry.getDependencyDescriptions();

// 分析工具依赖
dependencies.forEach(dep => {
  if (dep.dependsOn.length > 0) {
    console.log(`${dep.toolName} 依赖: ${dep.dependsOn.join(', ')}`);
  }
});
```

### 4. 执行路径建议

```typescript
// 获取工具执行路径建议
const path = registry.getExecutionPathSuggestion('target_tool');
console.log(`执行路径: ${path.join(' → ')}`);
```

## 示例输出

### 系统提示词示例

```
你是一个智能助手，可以使用以下工具来帮助用户完成任务。

当前共有 4 个工具，其中 2 个可用。

## 可用工具

### search_products
- 描述: 搜索产品信息
- 标签: product, search
- 参数: {
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "搜索关键词"
    }
  },
  "required": ["query"]
}

## 使用说明

1. 工具之间存在依赖关系，请确保先执行依赖的工具
2. 只有标记为"可用"的工具才能被调用
3. 调用工具时请提供正确的参数格式
4. 如果工具不可用，请检查其依赖是否已满足
```

### Markdown 格式示例

```markdown
# 可用工具列表

## 统计信息

- 总工具数: 4
- 可用工具数: 2
- 根工具数: 1
- 叶子工具数: 1

## 工具列表

### search_products

**描述**: 搜索产品信息

**标签**: product, search

**状态**: ✅ 可用
**原因**: 所有依赖已满足

**参数**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "搜索关键词"
    }
  },
  "required": ["query"]
}
```

---

## 依赖关系

### search_products

**被依赖**: get_product_details

### get_product_details

**依赖**: search_products

**依赖组**:
- any: search_products (需要先搜索或了解产品)
```

## 最佳实践

1. **系统提示词生成**: 使用 `generateSystemPrompt()` 为 Agent 生成清晰的工具说明
2. **动态更新**: 在工具执行后，重新生成系统提示词以反映最新的可用工具状态
3. **依赖管理**: 利用依赖关系信息帮助 Agent 理解工具执行顺序
4. **格式选择**: 根据使用场景选择合适的输出格式（JSON 用于程序处理，Markdown 用于文档展示，Text 用于系统提示词）

## 注意事项

1. 工具可用性会随着依赖工具的执行而动态变化
2. 建议在工具执行后重新生成系统提示词
3. 依赖关系检查基于工具是否已执行，而不是工具是否存在
4. 系统提示词应该定期更新以反映当前的工具状态
