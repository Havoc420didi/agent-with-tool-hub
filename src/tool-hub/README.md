# ToolHub - 集中式工具管理中心

一个通用的、框架无关的工具管理中心，可以轻松集成到 LangChain、LangGraph 或其他任何框架中。

## 特性

- 🚀 **框架无关**: 支持 LangChain、LangGraph、OpenAI 等框架
- 🔧 **动态管理**: 支持运行时注册、注销、更新工具
- 📊 **统计监控**: 内置工具使用统计和性能监控
- 🎯 **类型安全**: 完整的 TypeScript 类型支持
- 🔄 **缓存机制**: 内置工具执行结果缓存
- 📦 **预设工具**: 提供常用工具集合
- 🔌 **适配器模式**: 灵活的框架适配器系统
- 🛡️ **安全验证**: 工具配置验证和安全检查

## 快速开始

### 安装

```bash
npm install tool-hub
```

### 基本使用

```typescript
import { createToolHub, createToolHubWithPresets } from 'tool-hub';

// 创建基础 ToolHub
const toolHub = createToolHub();

// 创建带有预设工具的 ToolHub
const toolHubWithPresets = createToolHubWithPresets();
```

### 注册工具

```typescript
import { z } from 'zod';

const myTool = {
  name: 'my_tool',
  description: '我的自定义工具',
  schema: z.object({
    input: z.string().describe('输入参数')
  }),
  handler: async (input: any) => {
    return {
      success: true,
      data: `处理结果: ${input.input}`
    };
  },
  category: 'custom',
  tags: ['example']
};

toolHub.register(myTool);
```

### 执行工具

```typescript
const result = await toolHub.execute('my_tool', { input: 'Hello World' });
console.log(result);
```

## 框架集成

### LangChain 集成

```typescript
import { createToolHubWithPresets } from 'tool-hub';
import { LangChainAdapter } from 'tool-hub/adapters';
import { ChatOpenAI } from '@langchain/openai';

const toolHub = createToolHubWithPresets();
const adapter = new LangChainAdapter();
const tools = adapter.convertTools(toolHub.getEnabled());

const model = new ChatOpenAI({ model: 'gpt-3.5-turbo' });
const modelWithTools = model.bindTools(tools);
```

### LangGraph 集成

```typescript
import { ToolNode } from '@langchain/langgraph/prebuilt';

const toolNode = new ToolNode(tools);
// 在 LangGraph 工作流中使用 toolNode
```

### 通用框架集成

```typescript
import { GenericAdapter } from 'tool-hub/adapters';

const adapter = new GenericAdapter();
const genericTools = adapter.convertTools(toolHub.getEnabled());

// 在任何框架中使用 genericTools
```

## 预设工具

ToolHub 提供了丰富的预设工具集合：

### 常用工具
- `get_time`: 获取当前时间
- `calculate`: 数学计算
- `string_process`: 字符串处理
- `random`: 随机数生成
- `validate`: 数据验证

### API 工具
- `http_request`: HTTP 请求
- `get_weather`: 天气信息
- `translate`: 文本翻译
- `get_news`: 新闻获取
- `get_stock`: 股票信息

### 系统工具
- `get_system_info`: 系统信息
- `file_operation`: 文件操作
- `environment`: 环境变量
- `logging`: 日志记录
- `process_management`: 进程管理

## 高级功能

### 工具搜索

```typescript
// 按分类搜索
const mathTools = toolHub.search({ category: 'math' });

// 按标签搜索
const apiTools = toolHub.search({ tags: ['api'] });

// 按名称搜索
const timeTools = toolHub.search({ name: 'time' });
```

### 工具统计

```typescript
const stats = toolHub.getStats();
console.log('工具统计:', stats);
```

### 事件监听

```typescript
toolHub.on('tool.registered', (event) => {
  console.log('工具已注册:', event.data.toolName);
});

toolHub.on('tool.executed', (event) => {
  console.log('工具已执行:', event.data.toolName);
});
```

### 缓存管理

```typescript
// 获取缓存统计
const cacheStats = toolHub.getCacheStats();

// 清空缓存
toolHub.clearCache();
```

## 配置选项

```typescript
const toolHub = createToolHub({
  logging: true,           // 启用日志
  logLevel: 'info',        // 日志级别
  statistics: true,        // 启用统计
  caching: true,           // 启用缓存
  cacheConfig: {
    ttl: 300000,          // 缓存生存时间（毫秒）
    maxSize: 1000         // 最大缓存条目数
  },
  defaultExecutionOptions: {
    timeout: 30000,       // 默认超时时间
    retries: 0            // 默认重试次数
  }
});
```

## 工具开发

### 创建自定义工具

```typescript
import { ToolConfig } from 'tool-hub';

const customTool: ToolConfig = {
  name: 'my_custom_tool',
  description: '自定义工具描述',
  schema: z.object({
    // 定义输入参数
  }),
  handler: async (input) => {
    // 实现工具逻辑
    return {
      success: true,
      data: '结果'
    };
  },
  category: 'custom',
  tags: ['example'],
  version: '1.0.0',
  author: 'Your Name'
};
```

### 工具验证

```typescript
import { validateToolConfigComprehensive } from 'tool-hub/utils';

const validation = validateToolConfigComprehensive(toolConfig);
if (!validation.valid) {
  console.error('验证失败:', validation.errors);
}
```

## 迁移指南

### 从现有项目迁移

1. **安装 ToolHub**
   ```bash
   npm install tool-hub
   ```

2. **创建 ToolHub 实例**
   ```typescript
   import { createToolHub } from 'tool-hub';
   const toolHub = createToolHub();
   ```

3. **迁移现有工具**
   ```typescript
   // 将现有工具转换为 ToolConfig 格式
   const migratedTool = {
     name: existingTool.name,
     description: existingTool.description,
     schema: existingTool.schema,
     handler: existingTool.handler,
     // ... 其他配置
   };
   
   toolHub.register(migratedTool);
   ```

4. **使用适配器集成框架**
   ```typescript
   import { LangChainAdapter } from 'tool-hub/adapters';
   const adapter = new LangChainAdapter();
   const frameworkTools = adapter.convertTools(toolHub.getEnabled());
   ```

## 最佳实践

1. **工具命名**: 使用下划线分隔的小写字母
2. **错误处理**: 始终返回 `{ success: boolean, data?, error? }` 格式
3. **类型安全**: 使用 Zod 定义严格的输入模式
4. **性能优化**: 合理使用缓存和异步处理
5. **安全考虑**: 验证输入参数，避免执行危险代码

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
