# ToolHub 事件系统架构

## 概述

ToolHub 实现了一个完整的事件驱动架构，用于追踪和管理工具的生命周期、执行状态以及系统状态变化。事件系统采用发布-订阅模式，支持多监听器、异步处理和错误隔离。

## 核心组件

### 1. 事件类型系统

#### ToolHub 核心事件类型

```typescript
export type ToolHubEventType = 
  | 'tool.registered'        // 工具注册成功
  | 'tool.unregistered'      // 工具注销成功
  | 'tool.executed'          // 工具执行成功
  | 'tool.failed'            // 工具执行失败
  | 'hub.initialized'        // Hub 初始化完成
  | 'hub.cleared'            // Hub 清空所有工具
  // 执行器扩展事件
  | 'tool.execution.started'     // 工具执行开始
  | 'tool.execution.completed'   // 工具执行完成
  | 'tool.execution.failed'      // 工具执行失败
  | 'tool.executor.cleaned'      // 执行器清理完成
  | 'tool.executor.exported';    // 执行器导出完成
```

#### 事件数据结构

```typescript
export interface ToolHubEvent {
  type: ToolHubEventType;    // 事件类型
  timestamp: Date;           // 事件时间戳
  data: any;                 // 事件数据
  context?: ToolExecutionContext; // 执行上下文（可选）
}
```

### 2. 事件监听器管理

#### 监听器注册

```typescript
// 添加事件监听器
on(eventType: ToolHubEventType, listener: ToolHubEventListener): void {
  if (!this.eventListeners.has(eventType)) {
    this.eventListeners.set(eventType, new Set());
  }
  this.eventListeners.get(eventType)!.add(listener);
}
```

#### 监听器移除

```typescript
// 移除事件监听器
off(eventType: ToolHubEventType, listener: ToolHubEventListener): void {
  const listeners = this.eventListeners.get(eventType);
  if (listeners) {
    listeners.delete(listener);
  }
}
```

### 3. 事件发布机制

#### 内部事件发送

```typescript
private emit(eventType: ToolHubEventType, data: any): void {
  const listeners = this.eventListeners.get(eventType);
  if (listeners) {
    const event: ToolHubEvent = {
      type: eventType,
      timestamp: new Date(),
      data
    };

    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.logger.error(`事件监听器执行失败: ${error}`, {
          eventType,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
}
```

#### 公开事件发布

```typescript
// 对外发布事件（公开方法）
public publish(eventType: ToolHubEventType, data: any): void {
  this.emit(eventType, data);
}
```

## 事件流转机制

### 1. 工具生命周期事件

#### 工具注册流程

```mermaid
graph TD
    A[register() 调用] --> B[ToolRegistry.register()]
    B --> C{注册成功?}
    C -->|是| D[emit 'tool.registered']
    C -->|否| E[记录错误日志]
    D --> F[通知所有监听器]
    E --> G[返回失败结果]
    F --> H[返回成功结果]
```

#### 工具执行流程

```mermaid
graph TD
    A[execute() 调用] --> B[获取工具配置]
    B --> C{工具存在?}
    C -->|否| D[emit 'tool.failed']
    C -->|是| E[ToolExecutor.execute()]
    E --> F{执行成功?}
    F -->|是| G[emit 'tool.executed']
    F -->|否| H[emit 'tool.failed']
    G --> I[更新使用统计]
    H --> J[记录错误日志]
    I --> K[返回结果]
    J --> K
```

### 2. LangChain 执行器事件

#### 执行器事件类型

```typescript
export interface ToolExecutionEvent {
  type: 'started' | 'completed' | 'failed';
  framework: string;
  timestamp: Date;
  context?: ToolExecutionContext;
  data?: any;
  error?: any;
}
```

#### 执行器事件发送

```typescript
private emitEvent(
  type: 'started' | 'completed' | 'failed', 
  context: ToolExecutionContext, 
  data?: any
): void {
  const event: ToolExecutionEvent = {
    type,
    framework: this.framework,
    timestamp: new Date(),
    context,
    data,
    error: type === 'failed' ? data?.error : undefined
  };
  
  // 发送到 tool-hub 的事件系统
  this.toolHub.publish(`tool.execution.${type}` as any, event);
}
```

#### 执行器事件流转

```mermaid
graph TD
    A[invoke() 调用] --> B[生成执行ID]
    B --> C[创建执行上下文]
    C --> D[emit 'tool.execution.started']
    D --> E[执行工具调用]
    E --> F{执行成功?}
    F -->|是| G[emit 'tool.execution.completed']
    F -->|否| H[emit 'tool.execution.failed']
    G --> I[更新统计信息]
    H --> J[更新统计信息]
    I --> K[返回结果]
    J --> L[抛出异常]
```

## 事件监听器实现

### 1. 基础监听器

```typescript
// 监听工具注册事件
toolHub.on('tool.registered', (event) => {
  console.log(`工具已注册: ${event.data.toolName}`);
  console.log(`注册时间: ${event.timestamp}`);
});

// 监听工具执行事件
toolHub.on('tool.executed', (event) => {
  console.log(`工具执行成功: ${event.data.toolName}`);
  console.log(`执行时间: ${event.data.executionTime}ms`);
});

// 监听工具失败事件
toolHub.on('tool.failed', (event) => {
  console.error(`工具执行失败: ${event.data.toolName}`);
  console.error(`错误信息: ${event.data.error}`);
});
```

### 2. 执行器事件监听

```typescript
// 监听执行器事件
toolHub.on('tool.execution.started', (event) => {
  console.log(`工具执行开始: ${event.data.context?.executionId}`);
});

toolHub.on('tool.execution.completed', (event) => {
  console.log(`工具执行完成: ${event.data.context?.executionId}`);
});

toolHub.on('tool.execution.failed', (event) => {
  console.error(`工具执行失败: ${event.data.context?.executionId}`);
  console.error(`错误: ${event.data.error}`);
});
```

### 3. 高级监听器实现

```typescript
class ToolEventMonitor {
  private toolHub: ToolHub;
  private stats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0
  };

  constructor(toolHub: ToolHub) {
    this.toolHub = toolHub;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 监听所有工具相关事件
    this.toolHub.on('tool.executed', this.handleToolExecuted.bind(this));
    this.toolHub.on('tool.failed', this.handleToolFailed.bind(this));
    this.toolHub.on('tool.registered', this.handleToolRegistered.bind(this));
  }

  private handleToolExecuted(event: ToolHubEvent) {
    this.stats.totalExecutions++;
    this.stats.successfulExecutions++;
    console.log(`工具执行成功: ${event.data.toolName}`);
  }

  private handleToolFailed(event: ToolHubEvent) {
    this.stats.totalExecutions++;
    this.stats.failedExecutions++;
    console.error(`工具执行失败: ${event.data.toolName} - ${event.data.error}`);
  }

  private handleToolRegistered(event: ToolHubEvent) {
    console.log(`新工具已注册: ${event.data.toolName}`);
  }

  getStats() {
    return { ...this.stats };
  }
}
```

## 错误处理机制

### 1. 监听器错误隔离

```typescript
listeners.forEach(listener => {
  try {
    listener(event);
  } catch (error) {
    this.logger.error(`事件监听器执行失败: ${error}`, {
      eventType,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
```

### 2. 事件发送失败处理

- 监听器执行异常不会影响其他监听器
- 异常会被记录到日志系统
- 事件发送失败不会影响主业务流程

## 性能优化

### 1. 事件监听器管理

- 使用 `Set` 数据结构存储监听器，避免重复
- 按事件类型分组管理监听器
- 支持动态添加和移除监听器

### 2. 异步处理

- 事件发送是同步的，但监听器可以异步处理
- 支持 Promise 和 async/await 模式
- 避免阻塞主执行流程

### 3. 内存管理

- 提供清理机制移除所有监听器
- 支持监听器自动清理
- 避免内存泄漏

## 使用示例

### 1. 基础事件监听

```typescript
import { ToolHub } from './tool-hub';

const toolHub = new ToolHub();

// 监听工具注册
toolHub.on('tool.registered', (event) => {
  console.log(`工具注册: ${event.data.toolName}`);
});

// 监听工具执行
toolHub.on('tool.executed', (event) => {
  console.log(`执行成功: ${event.data.toolName} (${event.data.executionTime}ms)`);
});

// 注册工具
toolHub.register({
  name: 'calculator',
  description: '计算器工具',
  execute: (input) => eval(input.expression)
});
```

### 2. 执行器事件监听

```typescript
// 导出执行器
const executor = toolHub.exportToolExecutor('langchain');

// 监听执行器事件
toolHub.on('tool.execution.started', (event) => {
  console.log(`执行开始: ${event.data.context?.executionId}`);
});

toolHub.on('tool.execution.completed', (event) => {
  console.log(`执行完成: ${event.data.context?.executionId}`);
});

// 在 LangGraph 中使用
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("tools", executor)
  .addEdge(START, "tools");
```

### 3. 高级监控

```typescript
class AdvancedToolMonitor {
  private toolHub: ToolHub;
  private metrics = new Map();

  constructor(toolHub: ToolHub) {
    this.toolHub = toolHub;
    this.setupMonitoring();
  }

  private setupMonitoring() {
    // 监控所有事件
    const eventTypes = [
      'tool.registered', 'tool.unregistered',
      'tool.executed', 'tool.failed',
      'tool.execution.started', 'tool.execution.completed', 'tool.execution.failed'
    ];

    eventTypes.forEach(eventType => {
      this.toolHub.on(eventType, (event) => {
        this.recordMetric(eventType, event);
      });
    });
  }

  private recordMetric(eventType: string, event: ToolHubEvent) {
    const timestamp = event.timestamp.getTime();
    const key = `${eventType}_${Math.floor(timestamp / 60000)}`; // 按分钟分组
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, { count: 0, events: [] });
    }
    
    const metric = this.metrics.get(key);
    metric.count++;
    metric.events.push(event);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}
```

## 最佳实践

### 1. 事件监听器设计

- 保持监听器函数简洁高效
- 避免在监听器中执行耗时操作
- 使用 try-catch 处理监听器内部异常

### 2. 事件数据设计

- 事件数据应该包含足够的信息用于调试和监控
- 避免在事件数据中包含敏感信息
- 保持事件数据结构的一致性

### 3. 性能考虑

- 避免注册过多不必要的监听器
- 定期清理不再使用的监听器
- 考虑使用事件节流和防抖

### 4. 调试和监控

- 使用日志记录重要事件
- 实现事件统计和监控
- 提供事件历史查询功能

## 总结

ToolHub 的事件系统提供了一个完整、灵活且高性能的事件驱动架构。通过发布-订阅模式，系统能够有效地追踪工具生命周期、执行状态和系统变化，同时保持代码的松耦合和可扩展性。事件系统支持错误隔离、性能优化和高级监控功能，为复杂的工具管理场景提供了强大的支持。
