# 工具执行模式实现总结

## 概述

已成功实现了两种工具执行模式，满足您的需求：

1. **完全封装的 agent 体系**：工具在内部直接完成执行
2. **类似 wxapp-agent 的框架**：工具的执行由 agent 后台下发到外部完成

## 实现架构

### 核心组件

1. **类型定义** (`src/core/types.ts`)
   - `ToolExecutionMode` 枚举：定义两种执行模式
   - `ToolExecutionConfig` 接口：配置执行模式参数
   - `ToolCallInfo` 接口：工具调用信息结构

2. **执行策略** (`src/core/tool-execution-strategy.ts`)
   - `ToolExecutionStrategy` 接口：策略模式接口
   - `InternalExecutionStrategy` 类：内部执行策略
   - `FrontendExecutionStrategy` 类：前端执行策略
   - `ToolCallManager` 类：工具调用管理器

3. **Agent 构建器** (`src/core/agent-builder.ts`)
   - 支持两种执行模式的动态切换
   - 集成工具执行策略
   - 提供前端执行模式的管理接口

4. **API 路由** (`src/routes/index.ts`)
   - 支持工具执行模式配置
   - 提供前端工具调用管理接口
   - 包含配置示例和说明

## 功能特性

### 内部执行模式 (INTERNAL)

- ✅ 工具在 agent 内部直接执行
- ✅ 支持工具缓存和重试机制
- ✅ 类似 LangGraph 的 Tool 同时定义 define 和 invoke
- ✅ 适合服务端工具：数据库查询、API 调用等

### 外部执行模式 (OUTSIDE)

- ✅ agent 只负责下发 tool-call
- ✅ 支持等待结果和不等待结果两种子模式
- ✅ 类似 wxapp-agent 的框架设计
- ✅ 适合外部工具：文件上传、用户界面操作等

### 动态切换

- ✅ 运行时动态切换执行模式
- ✅ 支持配置热更新
- ✅ 保持状态一致性

## 使用方式

### 1. 内部执行模式

```typescript
const agent = new AgentBuilder({
  model: { name: 'deepseek-chat', temperature: 0 },
  toolExecution: {
    mode: ToolExecutionMode.INTERNAL,
    internalConfig: {
      enableCache: true,
      cacheTtl: 300000,
      maxRetries: 3
    }
  },
  tools: [/* 工具定义 */]
});
```

### 2. 外部执行模式

```typescript
const agent = new AgentBuilder({
  model: { name: 'deepseek-chat', temperature: 0 },
  toolExecution: {
    mode: ToolExecutionMode.OUTSIDE,
    outsideConfig: {
      waitForResult: true,
      timeout: 30000,
      callbackUrl: 'https://your-external.com/callback'
    }
  },
  tools: [/* 工具定义 */]
});
```

### 3. API 调用

```bash
# 内部执行模式
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请计算 2+3",
    "toolExecution": {
      "mode": "internal",
      "internalConfig": {
        "enableCache": true,
        "cacheTtl": 300000,
        "maxRetries": 3
      }
    }
  }'

# 外部执行模式
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请上传文件",
    "toolExecution": {
      "mode": "outside",
      "outsideConfig": {
        "waitForResult": true,
        "timeout": 30000
      }
    }
  }'
```

## 文件结构

```
src/
├── core/
│   ├── types.ts                    # 类型定义
│   ├── tool-execution-strategy.ts  # 执行策略
│   └── agent-builder.ts           # Agent 构建器
├── routes/
│   └── index.ts                   # API 路由
examples/
├── tool-execution-modes.mts       # 使用示例
tests/
├── test-tool-execution-modes.mts  # 测试用例
docs/
├── TOOL_EXECUTION_MODES.md        # API 文档
└── TOOL_EXECUTION_IMPLEMENTATION.md # 实现总结
```

## 测试和示例

### 运行测试

```bash
# 运行工具执行模式测试
npm run test:tool-modes

# 运行示例
npm run demo:tool-modes
```

### 测试覆盖

- ✅ 内部执行模式功能测试
- ✅ 前端执行模式功能测试
- ✅ 动态模式切换测试
- ✅ API 接口测试

## 配置选项

### 内部执行模式配置

```typescript
interface InternalConfig {
  enableCache?: boolean;    // 是否启用工具缓存
  cacheTtl?: number;        // 缓存生存时间（毫秒）
  maxRetries?: number;      // 最大重试次数
}
```

### 外部执行模式配置

```typescript
interface OutsideConfig {
  waitForResult?: boolean;  // 是否等待外部执行结果
  timeout?: number;         // 超时时间（毫秒）
  callbackUrl?: string;     // 外部回调 URL
}
```

## 扩展性

### 添加新的执行策略

1. 实现 `ToolExecutionStrategy` 接口
2. 在 `ToolExecutionStrategyFactory` 中注册
3. 在 `ToolExecutionMode` 枚举中添加新模式

### 自定义工具调用管理

1. 继承 `ToolCallManager` 类
2. 重写相关方法
3. 在 `AgentBuilder` 中使用自定义管理器

## 注意事项

1. **外部执行模式**需要外部系统配合实现工具执行逻辑
2. **等待结果模式**会增加响应时间
3. **不等待结果模式**适合异步任务
4. 工具执行模式可以在运行时动态切换
5. 建议根据具体业务场景选择合适的执行模式

## 总结

已成功实现了您要求的两种工具执行模式：

1. **完全封装的 agent 体系**：通过 `InternalExecutionStrategy` 实现，工具在内部直接执行
2. **类似 wxapp-agent 的框架**：通过 `OutsideExecutionStrategy` 实现，agent 只负责下发 tool-call

两种模式都支持完整的配置选项，可以满足不同场景的需求。代码结构清晰，易于扩展和维护。
