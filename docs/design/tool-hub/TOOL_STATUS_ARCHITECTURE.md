# 工具状态管理架构重新设计

## 架构概述

重新设计了工具状态管理架构，采用中心化的状态管理方式，由 `ToolHub` 作为状态管理中心，`LangChainExecutor` 只负责状态报告，`ToolRegistry` 负责可用性管理。

## 架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ LangChainExecutor│    │     ToolHub     │    │  ToolRegistry   │
│                 │    │                 │    │                 │
│ 1. 执行工具     │───▶│ 2. 接收状态报告 │    │ 3. 更新可用性   │
│ 2. 报告结果     │    │ 3. 管理状态     │───▶│ 4. 提供可用工具 │
│ 3. 委托状态查询 │◀───│ 4. 提供状态API │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心组件

### 1. ToolHub（状态管理中心）

**职责：**
- 接收工具执行结果报告
- 管理工具状态（成功/失败计数、状态转换）
- 提供状态查询 API
- 发送状态变化事件
- 协调工具重新绑定

**核心方法：**
```typescript
// 接收执行结果报告
reportToolExecutionResult(toolName: string, success: boolean, error?: any): void

// 状态查询
getToolStatus(toolName: string): ToolStatusInfo | undefined
getAllToolStatuses(): Map<string, ToolStatusInfo>
getAvailableToolsByStatus(): string[]

// 状态管理
resetToolStatus(toolName: string): boolean
setToolStatus(toolName: string, status: ToolStatus, reason?: string): boolean
```

### 2. LangChainExecutor（状态报告器）

**职责：**
- 执行工具调用
- 报告执行结果给 ToolHub
- 委托状态查询给 ToolHub
- 不直接管理状态

**核心方法：**
```typescript
// 报告执行结果
private reportToolExecutionResult(state: any, success: boolean, resultOrError: any): void

// 委托状态查询
getToolStatus(toolName: string): ToolStatusInfo | undefined
getAllToolStatuses(): Map<string, ToolStatusInfo>
getAvailableTools(): string[]
```

### 3. ToolRegistry（可用性管理）

**职责：**
- 管理工具注册和依赖关系
- 根据状态更新工具可用性
- 提供基于依赖关系的可用工具列表

## 类型定义重新组织

### 新的类型文件结构

```
src/tool-hub/types/
├── index.ts              # 统一导出
├── tool.types.ts         # 工具相关类型
├── hub.types.ts          # Hub 相关类型
├── adapter-tool.types.ts # 适配器相关类型
└── status.types.ts       # 状态管理相关类型（新增）
```

### 状态管理类型

```typescript
// status.types.ts
export enum ToolStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable', 
  FAILED = 'failed',
  MAINTENANCE = 'maintenance'
}

export interface ToolStatusInfo {
  toolName: string;
  status: ToolStatus;
  reason?: string;
  lastUpdated: Date;
  consecutiveFailures: number;
  lastSuccessTime?: Date;
  lastFailureTime?: Date;
  shouldRebind: boolean;
}

export interface ToolStatusManagementConfig {
  enabled: boolean;
  failureThreshold: number;
  failureDuration: number;
  autoRebind: boolean;
  rebindDelay: number;
}
```

## 事件系统

### 新增事件类型

```typescript
// hub.types.ts
export type ToolHubEventType = 
  | 'tool.registered'
  | 'tool.unregistered'
  | 'tool.executed'
  | 'tool.failed'
  | 'hub.initialized'
  | 'hub.cleared'
  | 'tool.execution.started'
  | 'tool.execution.completed'
  | 'tool.execution.failed'
  | 'tool.executor.cleaned'
  | 'tool.executor.exported'
  // 新增状态管理事件
  | 'tool.status.changed'
  | 'tool.availability.changed'
  | 'tool.rebind.required';
```

### 事件数据接口

```typescript
export interface ToolStatusChangedEventData {
  toolName: string;
  oldStatus?: ToolStatus;
  newStatus: ToolStatus;
  reason: string;
  timestamp: Date;
}

export interface ToolAvailabilityChangedEventData {
  toolName: string;
  available: boolean;
  reason: string;
  timestamp: Date;
}

export interface ToolRebindRequiredEventData {
  timestamp: Date;
  reason: string;
}
```

## 工作流程

### 1. 工具执行流程

```
1. Agent 调用 LangChainExecutor.invoke()
2. LangChainExecutor 执行工具调用
3. 根据执行结果调用 reportToolExecutionResult()
4. ToolHub 接收报告，更新工具状态
5. ToolHub 发送状态变化事件
6. ToolRegistry 根据状态更新可用性
7. 如果需要，安排工具重新绑定
```

### 2. 状态查询流程

```
1. Agent 调用 getToolStatusDetails()
2. AgentBuilder 委托给 ToolHub
3. ToolHub 返回状态信息
4. 显示调试日志
```

## 配置选项

### ToolHub 状态管理配置

```typescript
const statusManagementConfig = {
  enabled: true,                    // 启用状态管理
  failureThreshold: 3,             // 连续失败阈值
  failureDuration: 300000,         // 失败状态持续时间（5分钟）
  autoRebind: true,                // 自动重新绑定
  rebindDelay: 10000              // 重新绑定延迟（10秒）
};
```

## 优势

### 1. 职责分离
- **ToolHub**: 中心化状态管理
- **LangChainExecutor**: 专注执行和报告
- **ToolRegistry**: 专注可用性管理

### 2. 类型安全
- 统一的类型定义
- 清晰的接口边界
- 完整的类型检查

### 3. 可扩展性
- 易于添加新的状态类型
- 支持多种执行器框架
- 灵活的事件系统

### 4. 可维护性
- 清晰的代码结构
- 单一职责原则
- 易于测试和调试

## 使用示例

```typescript
// 创建 agent
const agent = createAgent({
  model: { name: "deepseek-chat" },
  toolExecutionConfig: {
    mode: 'internal',
    internalConfig: { maxRetries: 2 }
  }
});

agent.initialize();

// 调用 agent（自动输出状态日志）
const response = await agent.invoke('请使用某个工具');

// 查看状态详情
const statusDetails = agent.getToolStatusDetails();

// 手动管理状态
agent.resetToolStatus('failing_tool');
agent.setToolStatus('test_tool', 'maintenance', '维护模式');
```

## 总结

重新设计的架构实现了：

✅ **中心化状态管理**: ToolHub 作为状态管理中心  
✅ **职责分离**: 各组件职责明确，边界清晰  
✅ **类型安全**: 统一的类型定义和完整的类型检查  
✅ **可扩展性**: 易于添加新功能和状态类型  
✅ **可维护性**: 清晰的代码结构和单一职责原则  

这个架构更好地支持了工具状态管理的需求，同时保持了代码的清晰性和可维护性。
