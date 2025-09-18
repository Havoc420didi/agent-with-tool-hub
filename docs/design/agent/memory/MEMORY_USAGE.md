# 记忆功能使用指南

本文档介绍如何使用两种记忆对话上下文的方式。

## 两种记忆方式对比

### 1. API模式 (`memoryMode: 'api'`)

**特点：**
- 通过API请求传递历史记录
- 客户端完全控制历史状态
- 支持跨会话的历史记录管理
- 网络传输开销较大

**适用场景：**
- 需要精确控制历史记录
- 跨设备同步对话历史
- 需要持久化存储历史记录

### 2. LG模式 (`memoryMode: 'lg'`)

**特点：**
- 使用LangGraph内置的MemorySaver机制
- 服务端自动管理历史记录
- 基于thread_id进行会话隔离
- 网络传输开销小

**适用场景：**
- 简单的对话记忆需求
- 服务端统一管理历史记录
- 减少客户端复杂度

## 使用方法

### 基本聊天API

```typescript
// API模式 - 带历史记录
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '你好',
    threadId: 'session_123',
    memoryMode: 'api',
    chatHistory: [
      {
        type: 'human',
        content: '之前的消息',
        timestamp: '2024-01-01T00:00:00.000Z'
      },
      {
        type: 'ai',
        content: 'AI的回复',
        timestamp: '2024-01-01T00:00:01.000Z'
      }
    ],
    maxHistory: 50
  })
});

// LG模式 - 自动记忆
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '你好',
    threadId: 'session_123',
    memoryMode: 'lg',
    maxHistory: 50
  })
});
```

### 记忆管理API

#### 获取聊天历史
```bash
GET /api/memory/{agentId}/history/{threadId}?limit=10
```

#### 清空聊天历史
```bash
DELETE /api/memory/{agentId}/history/{threadId}
```

#### 获取会话列表
```bash
GET /api/memory/{agentId}/threads
```

#### 设置记忆模式
```bash
POST /api/memory/{agentId}/mode
Content-Type: application/json

{
  "mode": "api"  // 或 "lg"
}
```

#### 获取记忆统计
```bash
GET /api/memory/{agentId}/stats
```

## 代码示例

### 使用AgentBuilder

```typescript
import { AgentBuilder } from './core/agent-builder';
import { ChatRequest } from './core/types';

// 创建支持记忆的Agent
const agent = new AgentBuilder({
  model: {
    name: 'deepseek-chat',
    temperature: 0
  },
  memory: {
    enabled: true,
    mode: 'api', // 或 'lg'
    maxHistory: 50
  }
});

agent.initialize();

// API模式对话
const request: ChatRequest = {
  message: '你好',
  threadId: 'session_123',
  memoryMode: 'api',
  chatHistory: [
    // 历史记录...
  ]
};

const response = await agent.invoke(request);

// LG模式对话
const response2 = await agent.invoke('你好', 'session_123');

// 获取历史记录
const history = await agent.getChatHistory('session_123');

// 清空历史记录
await agent.clearChatHistory('session_123');
```

### 使用AgentService

```typescript
import { AgentService } from './services/agent.service';

const agentService = new AgentService();

// 创建Agent
await agentService.createAgent('my_agent', {
  model: { name: 'deepseek-chat' },
  memory: { enabled: true, mode: 'api' }
});

// 聊天
const response = await agentService.chat('my_agent', {
  message: '你好',
  threadId: 'session_123',
  memoryMode: 'api',
  chatHistory: []
});

// 获取历史记录
const history = await agentService.getChatHistory('my_agent', 'session_123');

// 设置记忆模式
await agentService.setMemoryMode('my_agent', 'lg');
```

## 配置选项

### AgentConfig.memory

```typescript
interface MemoryConfig {
  enabled: boolean;           // 是否启用记忆
  threadId?: string;          // 默认会话ID
  mode?: 'api' | 'lg';       // 记忆模式
  maxHistory?: number;        // 最大历史记录数量
}
```

### ChatRequest

```typescript
interface ChatRequest {
  message: string;                    // 用户消息
  threadId?: string;                 // 会话ID
  chatHistory?: ChatHistoryMessage[]; // 聊天历史（API模式）
  memoryMode?: 'api' | 'lg';         // 记忆模式
  maxHistory?: number;               // 最大历史记录数量
  config?: Record<string, any>;      // 其他配置
}
```

### ChatHistoryMessage

```typescript
interface ChatHistoryMessage {
  type: 'human' | 'ai' | 'system' | 'tool';  // 消息类型
  content: string;                            // 消息内容
  timestamp: string;                          // 时间戳
  toolCalls?: {                              // 工具调用信息
    id: string;
    name: string;
    args: Record<string, any>;
  }[];
  toolResult?: any;                          // 工具结果
  metadata?: Record<string, any>;            // 元数据
}
```

## 最佳实践

### 1. 选择合适的记忆模式

- **简单应用**：使用LG模式，减少客户端复杂度
- **复杂应用**：使用API模式，获得更多控制权
- **跨设备同步**：使用API模式，配合持久化存储

### 2. 历史记录管理

- 设置合理的`maxHistory`值，避免内存溢出
- 定期清理不需要的历史记录
- 使用有意义的`threadId`进行会话隔离

### 3. 错误处理

```typescript
try {
  const response = await agent.invoke(request);
  // 处理响应
} catch (error) {
  console.error('聊天失败:', error);
  // 错误处理
}
```

### 4. 性能优化

- API模式：考虑历史记录压缩
- LG模式：合理设置checkpointer存储策略
- 使用流式响应减少延迟

## 测试

运行记忆功能测试：

```bash
# 运行记忆功能测试
npx tsx tests/test-memory.mts

# 启动服务器进行API测试
npm run dev
```

## 故障排除

### 常见问题

1. **历史记录不生效**
   - 检查`memory.enabled`是否为true
   - 确认`threadId`是否一致
   - 验证记忆模式设置

2. **API模式历史记录丢失**
   - 检查`chatHistory`格式是否正确
   - 确认消息类型和内容格式

3. **LG模式记忆不持久**
   - 检查checkpointer配置
   - 确认thread_id传递正确

### 调试技巧

```typescript
// 获取记忆统计信息
const stats = agent.getMemoryStats();
console.log('记忆统计:', stats);

// 检查历史记录
const history = await agent.getChatHistory(threadId);
console.log('历史记录:', history);
```
