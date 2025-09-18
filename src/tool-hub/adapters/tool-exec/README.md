# 工具执行器 (Tool Executors)

工具执行器模块提供了框架特定的工具执行能力，继承各框架原生执行器功能的同时集成 tool-hub 的追踪和统计能力。

## 特性

- **框架继承**：完全继承 LangChain 的 ToolNode 功能
- **追踪集成**：自动集成 tool-hub 的事件系统和统计功能
- **性能监控**：提供详细的执行统计和性能指标
- **健康检查**：内置健康检查机制
- **配置灵活**：支持多种配置选项

## 使用方法

### 基础使用

```typescript
import { createToolHub } from '../tool-hub';

// 创建 tool-hub
const toolHub = createToolHub();

// 注册工具
toolHub.registerBatch(toolConfigs);

// 导出 LangChain 执行器
const langchainExecutor = toolHub.exportToolExecutor('langchain');

// 在 LangGraph 中使用
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", langchainExecutor)  // 直接使用
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent");
```

### 高级配置

```typescript
// 带配置的执行器
const executor = toolHub.exportToolExecutor('langchain', {
  enableStats: true,
  enableEvents: true,
  enablePerformanceMonitoring: true,
  maxRetries: 3,
  timeout: 30000
});

// 获取统计信息
const stats = executor.getStats();
console.log('执行统计:', stats);

// 健康检查
const health = executor.healthCheck();
console.log('健康状态:', health);
```

### 事件监听

```typescript
// 监听工具执行事件
toolHub.on('tool.execution.started', (event) => {
  console.log('工具执行开始:', event);
});

toolHub.on('tool.execution.completed', (event) => {
  console.log('工具执行完成:', event);
});

toolHub.on('tool.execution.failed', (event) => {
  console.log('工具执行失败:', event);
});
```

## API 参考

### LangChainToolExecutor

#### 方法

- `invoke(state: any): Promise<any>` - 执行工具调用
- `getStats(): ToolExecutionStats` - 获取执行统计
- `getDetailedStats()` - 获取详细统计信息
- `resetStats()` - 重置统计信息
- `healthCheck()` - 健康检查
- `cleanup()` - 清理资源

#### 配置选项

```typescript
interface ToolExecutorConfig {
  enableStats?: boolean;                    // 启用统计
  enableEvents?: boolean;                   // 启用事件追踪
  enablePerformanceMonitoring?: boolean;    // 启用性能监控
  maxRetries?: number;                      // 最大重试次数
  timeout?: number;                         // 超时时间（毫秒）
  frameworkConfig?: Record<string, any>;    // 框架特定配置
}
```

## 统计信息

执行器提供详细的统计信息：

```typescript
interface ToolExecutionStats {
  totalExecutions: number;        // 总执行次数
  successfulExecutions: number;   // 成功执行次数
  failedExecutions: number;       // 失败执行次数
  averageExecutionTime: number;   // 平均执行时间
  lastExecutionTime?: Date;       // 最后执行时间
  frameworkStats?: Record<string, any>; // 框架特定统计
}
```

## 事件系统

执行器会发送以下事件：

- `tool.execution.started` - 工具执行开始
- `tool.execution.completed` - 工具执行完成
- `tool.execution.failed` - 工具执行失败
- `tool.executor.cleaned` - 执行器清理

每个事件都包含详细的上下文信息，便于监控和调试。
