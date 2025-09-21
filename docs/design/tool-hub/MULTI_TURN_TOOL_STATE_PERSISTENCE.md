# 多轮对话中工具状态持久化

## 概述

在多轮对话中，工具状态需要在不同的对话轮次之间保持，以确保：
1. 依赖工具的执行状态能够正确传递
2. 失败的工具状态能够持续跟踪
3. 动态可用工具列表能够正确更新

## 架构设计

### 1. 状态持久化层次

```
AgentService (内存存储)
├── agents: Map<string, AgentBuilder>
└── toolStates: Map<string, string>  // 序列化的工具状态

AgentBuilder
└── toolHub: ToolHub
    └── toolStatuses: Map<string, ToolStatusInfo>
```

### 2. 状态流转过程

1. **工具执行** → `ToolHub.reportToolExecutionResult()`
2. **状态更新** → `ToolHub.updateToolStatus()`
3. **状态序列化** → `ToolHub.serializeToolStates()`
4. **状态保存** → `AgentService.saveToolStates()`
5. **状态恢复** → `AgentService.setAgent()` → `AgentBuilder.deserializeToolStates()`

## 核心功能

### 1. ToolHub 状态序列化

```typescript
// 序列化工具状态
serializeToolStates(): string {
  const states = Array.from(this.toolStatuses.entries()).map(([toolName, status]) => ({
    toolName,
    status: status.status,
    reason: status.reason,
    lastUpdated: status.lastUpdated.toISOString(),
    consecutiveFailures: status.consecutiveFailures,
    lastSuccessTime: status.lastSuccessTime?.toISOString(),
    lastFailureTime: status.lastFailureTime?.toISOString(),
    shouldRebind: status.shouldRebind
  }));
  
  return JSON.stringify({
    states,
    config: this.statusManagementConfig,
    timestamp: new Date().toISOString()
  });
}

// 反序列化工具状态
deserializeToolStates(serializedData: string): boolean {
  // 恢复工具状态和配置
}
```

### 2. AgentService 状态管理

```typescript
export class AgentService {
  private agents: Map<string, AgentBuilder> = new Map();
  private toolStates: Map<string, string> = new Map(); // 存储序列化的工具状态

  // 设置 Agent 时恢复工具状态
  setAgent(agentId: string, agent: AgentBuilder): void {
    this.agents.set(agentId, agent);
    
    // 如果存在保存的工具状态，恢复它
    const savedToolStates = this.toolStates.get(agentId);
    if (savedToolStates) {
      agent.deserializeToolStates(savedToolStates);
    }
  }

  // 每次对话后保存工具状态
  private saveToolStates(agentId: string, agent: AgentBuilder): void {
    const serializedStates = agent.serializeToolStates();
    if (serializedStates) {
      this.toolStates.set(agentId, serializedStates);
    }
  }
}
```

### 3. 动态可用工具计算

```typescript
// 结合状态和依赖关系计算可用工具
getAvailableToolsByStatus(): string[] {
  const availableTools: string[] = [];
  const allTools = this.registry.getAll();
  
  for (const tool of allTools) {
    const toolName = tool.name;
    
    // 检查工具状态
    const status = this.toolStatuses.get(toolName);
    if (status && status.status !== ToolStatus.AVAILABLE) {
      continue; // 工具状态不可用
    }
    
    // 检查依赖关系
    const availabilityStatus = this.registry.getToolAvailabilityStatus(toolName);
    if (!availabilityStatus.available) {
      continue; // 依赖关系不满足
    }
    
    availableTools.push(toolName);
  }
  
  return availableTools;
}
```

## API 接口

### 1. 获取工具状态摘要

```http
GET /agents/{threadId}/tool-states
```

响应：
```json
{
  "success": true,
  "data": {
    "agentId": "thread_123",
    "toolStates": {
      "base_tool": {
        "status": "available",
        "reason": "执行成功",
        "lastUpdated": "2024-01-01T12:00:00.000Z"
      },
      "dependent_tool": {
        "status": "available",
        "reason": "依赖已满足",
        "lastUpdated": "2024-01-01T12:01:00.000Z"
      },
      "failing_tool": {
        "status": "failed",
        "reason": "连续失败超过阈值",
        "lastUpdated": "2024-01-01T12:02:00.000Z"
      }
    },
    "timestamp": "2024-01-01T12:03:00.000Z"
  }
}
```

### 2. 重置工具状态

```http
POST /agents/{threadId}/tool-states/reset
Content-Type: application/json

{
  "toolName": "failing_tool"  // 可选，不提供则重置所有工具
}
```

## 使用场景

### 1. 依赖工具链

```typescript
// 第一轮对话：执行基础工具
await agent.invoke("请使用 base_tool 处理数据");

// 第二轮对话：依赖工具现在可用
await agent.invoke("请使用 dependent_tool 处理数据");
```

### 2. 失败工具恢复

```typescript
// 第一轮对话：工具失败
await agent.invoke("请使用 failing_tool 处理数据");

// 第二轮对话：工具仍然失败状态
await agent.invoke("请使用 failing_tool 处理数据");

// 手动重置工具状态
await fetch('/agents/thread_123/tool-states/reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ toolName: 'failing_tool' })
});

// 第三轮对话：工具已恢复
await agent.invoke("请使用 failing_tool 处理数据");
```

### 3. 状态监控

```typescript
// 获取当前工具状态
const response = await fetch('/agents/thread_123/tool-states');
const { data } = await response.json();

console.log('工具状态摘要:', data.toolStates);
```

## 调试功能

### 1. 增强的调试日志

```typescript
// 每次调用 agent 时输出详细信息
🔧 可用工具 (9个) (可用: 3, 失败: 1, 根节点: 2): [
  'base_tool',
  'dependent_tool', 
  'slow_tool'
] [失败工具: failing_tool] [等待依赖: waiting_tool]
```

### 2. 状态摘要

```typescript
// 获取详细的状态信息
const summary = agent.getToolStatesSummary();
console.log('工具状态摘要:', summary);
```

## 注意事项

1. **内存存储**：当前实现使用内存存储，重启服务会丢失状态
2. **状态同步**：多实例部署时需要考虑状态同步
3. **状态清理**：长时间不活跃的 Agent 状态应该定期清理
4. **错误恢复**：反序列化失败时应该优雅降级

## 扩展建议

1. **持久化存储**：使用 Redis 或数据库存储工具状态
2. **状态同步**：实现分布式状态同步机制
3. **状态清理**：添加自动清理机制
4. **状态监控**：添加状态变化监控和告警
