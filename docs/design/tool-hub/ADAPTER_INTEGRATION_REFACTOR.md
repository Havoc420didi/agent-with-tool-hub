# ToolHub 适配器集成重构

## 概述

本次重构将适配器从独立的组件集成到 ToolHub 中，使 ToolHub 能够直接导出工具为特定格式，简化了 AgentBuilder 的使用。

## 重构前的问题

1. **架构分离**: 适配器和 ToolHub 是独立的组件
2. **重复代码**: AgentBuilder 需要同时管理 ToolHub 和适配器
3. **耦合度高**: AgentBuilder 直接依赖特定的适配器实现
4. **扩展性差**: 添加新的导出格式需要修改多个地方

## 重构后的架构

```
ToolHub
├── ToolRegistry (工具注册表)
├── ToolExecutor (工具执行器)
└── Adapters (适配器管理)
    ├── LangChainAdapter
    ├── GenericAdapter
    └── OpenAIAdapter
```

## 主要变更

### 1. ToolHub 增强

#### 新增属性
```typescript
private adapters: Map<string, ToolDefineFrameworkAdapter> = new Map();
private defaultAdapter: string = 'langchain';
```

#### 新增方法

**适配器管理:**
- `registerAdapter(name: string, adapter: ToolDefineFrameworkAdapter): void`
- `getAdapter(name: string): ToolDefineFrameworkAdapter | undefined`
- `getAdapters(): Map<string, ToolDefineFrameworkAdapter>`
- `setDefaultAdapter(name: string): boolean`
- `getDefaultAdapter(): ToolDefineFrameworkAdapter | undefined`

**工具导出:**
- `exportTools(format: string = 'langchain', options?: ToolConversionOptions): any[]`
- `exportTool(toolName: string, format: string = 'langchain', options?: ToolConversionOptions): any | null`
- `getSupportedFormats(): string[]`
- `isFormatSupported(format: string): boolean`

### 2. AgentBuilder 简化

#### 移除的依赖
```typescript
// 移除
import { LangChainAdapter } from '../tool-hub/adapters/langchain-adapter';

// 移除
private adapter: LangChainAdapter;
```

#### 简化的工具初始化
```typescript
// 重构前
const langchainTools = this.adapter.convertTools(this.toolHub.getEnabled());

// 重构后
const langchainTools = this.toolHub.exportTools('langchain');
```

## 使用示例

### 基本使用

```typescript
import { createToolHub } from './src/tool-hub/index';

const toolHub = createToolHub();

// 注册工具
toolHub.registerBatch(tools);

// 导出为不同格式
const langchainTools = toolHub.exportTools('langchain');
const genericTools = toolHub.exportTools('generic');
const openaiTools = toolHub.exportTools('openai');
```

### 适配器管理

```typescript
// 查看支持的格式
const formats = toolHub.getSupportedFormats();
console.log('支持的格式:', formats); // ['langchain', 'generic', 'openai']

// 设置默认适配器
toolHub.setDefaultAdapter('generic');

// 验证格式支持
const isSupported = toolHub.isFormatSupported('langchain');
```

### AgentBuilder 使用

```typescript
import { createAgent } from './src/core/agent-builder';

const agent = createAgent({
  model: { name: "deepseek-chat" },
  tools: [weatherTool, cityTool] // 工具由 ToolHub 管理
});

agent.initialize(); // 内部使用 toolHub.exportTools('langchain')
```

## 优势

### 1. 架构简化
- 适配器作为 ToolHub 的组件，统一管理
- AgentBuilder 只需依赖 ToolHub，无需直接管理适配器

### 2. 代码复用
- 适配器逻辑集中在 ToolHub 中
- 避免在多个地方重复适配器代码

### 3. 扩展性
- 添加新格式只需在 ToolHub 中注册新适配器
- AgentBuilder 无需修改即可支持新格式

### 4. 一致性
- 所有工具导出都通过 ToolHub 统一接口
- 保证不同格式导出的一致性

## 测试验证

创建了完整的测试套件验证重构功能：

1. **适配器注册测试**: 验证默认适配器正确注册
2. **格式导出测试**: 验证所有支持格式的导出功能
3. **单个工具导出测试**: 验证单个工具的导出功能
4. **格式验证测试**: 验证格式支持检查功能
5. **适配器管理测试**: 验证适配器切换和管理功能

## 向后兼容性

- AgentBuilder 的公共 API 保持不变
- 现有的工具配置格式无需修改
- 只是内部实现从独立适配器改为 ToolHub 导出

## 未来扩展

1. **更多适配器**: 可以轻松添加新的框架适配器
2. **自定义适配器**: 支持用户注册自定义适配器
3. **转换选项**: 支持更丰富的工具转换选项
4. **缓存机制**: 可以为导出的工具添加缓存机制

## 总结

通过将适配器集成到 ToolHub 中，我们实现了：

- ✅ 更清晰的架构分层
- ✅ 简化的 AgentBuilder 使用
- ✅ 更好的代码复用和扩展性
- ✅ 统一的工具导出接口
- ✅ 保持向后兼容性

这次重构使整个工具管理系统更加内聚和易于维护。
