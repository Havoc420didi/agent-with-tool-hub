# Chat API 工具状态自动恢复

## 概述

Chat API 现在能够根据 `threadId` 自动恢复和保持工具状态，确保在多轮对话中工具的执行状态和依赖关系能够正确传递。

## 核心机制

### 1. 状态恢复流程

```
POST /chat
├── 解析 threadId
├── getOrCreateAgent(threadId, config)
│   ├── service.getAgent(threadId) // 尝试获取现有 Agent
│   └── 如果不存在，创建新 Agent 并注册
├── service.setAgent(threadId, agent) // 自动恢复工具状态
├── 执行对话
└── 自动保存工具状态
```

### 2. 状态持久化

- **内存存储**：`AgentService` 在内存中维护 `Map<string, string>` 存储序列化的工具状态
- **自动保存**：每次对话完成后自动保存工具状态
- **自动恢复**：获取现有 Agent 时自动恢复工具状态

## API 使用示例

### 基本对话

```bash
# 第一轮对话
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请使用 base_tool 处理数据",
    "threadId": "user_123"
  }'

# 第二轮对话（自动恢复工具状态）
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请使用 dependent_tool 处理数据",
    "threadId": "user_123"
  }'
```

### 流式对话

```bash
# 流式对话也支持状态恢复
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请使用工具处理数据",
    "threadId": "user_123",
    "streaming": true
  }'
```

## 状态管理细节

### 1. 工具状态包含

- 工具执行状态（available/unavailable/failed/maintenance）
- 连续失败次数
- 最后成功/失败时间
- 失败原因
- 是否需要重新绑定

### 2. 依赖关系管理

- 根节点工具：无依赖，始终可用
- 依赖工具：需要先执行依赖工具才能使用
- 动态解锁：依赖工具执行成功后自动解锁

### 3. 状态传递

```typescript
// 第一轮：只有根节点工具可用
🔧 可用工具 (3个) (可用: 1, 失败: 0, 根节点: 1): ['base_tool']

// 第二轮：依赖工具解锁
🔧 可用工具 (3个) (可用: 2, 失败: 0, 根节点: 1): ['base_tool', 'dependent_tool']
```

## 调试信息

每次对话都会输出详细的工具状态信息：

```
🔧 可用工具 (9个) (可用: 3, 失败: 1, 根节点: 2): [
  'base_tool',
  'dependent_tool', 
  'slow_tool'
] [失败工具: failing_tool] [等待依赖: waiting_tool]
```

## 注意事项

1. **Thread ID 重要性**：必须使用相同的 `threadId` 才能恢复状态
2. **内存限制**：状态存储在内存中，重启服务会丢失
3. **状态清理**：长时间不活跃的 Agent 状态应该定期清理
4. **错误处理**：状态恢复失败时会优雅降级，不影响对话

## 扩展建议

1. **持久化存储**：使用 Redis 或数据库存储工具状态
2. **状态同步**：多实例部署时实现状态同步
3. **状态监控**：添加状态变化监控和告警
4. **自动清理**：实现长时间不活跃 Agent 的自动清理机制
