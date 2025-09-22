# Chat API 文档

## 概述

Chat API 提供了与 AI Agent 进行对话的核心接口，支持记忆功能、工具调用和流式响应（待实现）。

## 基础聊天接口

### POST /api/chat

与指定的 Agent 进行对话，支持记忆功能和工具调用。

#### 请求参数

**Body (application/json):**

```json
{
  "message": "用户消息内容",
  "threadId": "thread_123456789",
  "chatHistory": [
    {
      "role": "user",
      "content": "之前的用户消息"
    },
    {
      "role": "assistant",
      "content": "之前的助手回复"
    }
  ],
  "memoryMode": "lg",
  "maxHistory": 50,
  "model": {
    "name": "deepseek-chat",
    "temperature": 0,
    "baseURL": "https://api.deepseek.com",
    "apiKey": "your_api_key"
  },
  "memory": {
    "enabled": true,
    "mode": "lg",
    "maxHistory": 50
  },
  "streaming": false,
  "tools": [],
  "toolHubConfig": {},
  "toolRelations": {},
  "toolExecutionConfig": {
    "mode": "internal",
    "internalConfig": {
      "enableCache": true,
      "cacheTtl": 300000,
      "maxRetries": 3
    }
  },
  "systemPrompt": {
    "enabled": true,
    "includeUnavailable": true,
    "includeParameters": true,
    "includeStatistics": true,
    "includeDependencies": true
  },
  "config": {}
}
```

#### 参数说明

**必需参数:**
- `message` (string): 用户发送的消息内容

**可选参数:**
- `threadId` (string): 对话线程ID，默认为 `thread_${Date.now()}`
- `chatHistory` (array): 对话历史记录
- `memoryMode` (string): 记忆模式，可选值：`lg`（默认）、`api`
- `maxHistory` (number): 最大历史记录条数，默认 50

**模型配置:**
- `model.name` (string): 模型名称，默认 "deepseek-chat"
- `model.temperature` (number): 温度参数，默认 0
- `model.baseURL` (string): API 基础URL，从环境变量读取
- `model.apiKey` (string): API 密钥，从环境变量读取

**记忆配置:**
- `memory.enabled` (boolean): 是否启用记忆，默认 true
- `memory.mode` (string): 记忆模式，默认 "lg"
- `memory.maxHistory` (number): 最大历史记录，默认 50

**流式响应:**
- `streaming` (boolean): 是否启用流式响应，默认 false（暂不支持）

**工具配置:**
- `tools` (array): 工具配置数组
- `toolHubConfig` (object): 工具Hub配置
- `toolRelations` (object): 工具关系配置

**工具执行配置:**
- `toolExecutionConfig.mode` (string): 执行模式，默认 "internal"
- `toolExecutionConfig.internalConfig.enableCache` (boolean): 启用缓存，默认 true
- `toolExecutionConfig.internalConfig.cacheTtl` (number): 缓存TTL（毫秒），默认 300000
- `toolExecutionConfig.internalConfig.maxRetries` (number): 最大重试次数，默认 3

**系统提示配置:**
- `systemPrompt.enabled` (boolean): 启用系统提示，默认 true
- `systemPrompt.includeUnavailable` (boolean): 包含不可用工具信息，默认 true
- `systemPrompt.includeParameters` (boolean): 包含参数信息，默认 true
- `systemPrompt.includeStatistics` (boolean): 包含统计信息，默认 true
- `systemPrompt.includeDependencies` (boolean): 包含依赖信息，默认 true

#### 响应格式

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "content": "助手回复内容",
    "toolCalls": [
      {
        "toolName": "工具名称",
        "parameters": {},
        "result": "工具执行结果"
      }
    ],
    "metadata": {
      "threadId": "thread_123456789",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "toolsUsed": ["tool1", "tool2"]
    }
  }
}
```

**错误响应 (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "message 是必需的"
  }
}
```

**错误响应 (500):**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "聊天处理失败"
  }
}
```

## Agent 管理接口

### GET /api/agents/status

获取所有活跃 Agent 的状态信息。

**响应格式:**
```json
{
  "success": true,
  "data": {
    "totalAgents": 5,
    "agents": [
      {
        "id": "thread_123456789",
        "status": "active"
      }
    ]
  }
}
```

### DELETE /api/agents/cache/:threadId

清理指定线程的 Agent 缓存。

**路径参数:**
- `threadId` (string): 要清理的线程ID

**响应格式:**
```json
{
  "success": true,
  "data": {
    "message": "Thread thread_123456789 的Agent缓存已清理"
  }
}
```

### DELETE /api/agents/cache

清理所有 Agent 缓存。

**响应格式:**
```json
{
  "success": true,
  "data": {
    "message": "已清理 5 个Agent缓存",
    "clearedAgents": 5
  }
}
```

### DELETE /api/agents/:threadId/memory

清空指定线程的 LG 记忆状态。

**路径参数:**
- `threadId` (string): 要清空记忆的线程ID

**响应格式:**
```json
{
  "success": true,
  "data": {
    "message": "Thread thread_123456789 的Agent已清空"
  }
}
```

## 使用示例

### 基础聊天
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，请介绍一下你自己",
    "threadId": "thread_123456789"
  }'
```

### 带历史记录的聊天
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "继续刚才的话题",
    "threadId": "thread_123456789",
    "chatHistory": [
      {
        "role": "user",
        "content": "什么是人工智能"
      },
      {
        "role": "assistant",
        "content": "人工智能是..."
      }
    ]
  }'
```

### 清理特定线程缓存
```bash
curl -X DELETE http://localhost:3000/api/agents/cache/thread_123456789
```

## 错误代码

- `INVALID_REQUEST`: 请求参数无效
- `NOT_IMPLEMENTED`: 功能暂未实现（如流式响应）
- `INTERNAL_ERROR`: 服务器内部错误
- `CACHE_ERROR`: 缓存操作错误
- `AGENT_NOT_FOUND`: Agent 不存在
- `MEMORY_ERROR`: 记忆操作错误

## 注意事项

1. **线程管理**: 每个 `threadId` 对应一个独立的对话会话，记忆和工具状态会按线程保存
2. **工具执行**: 默认使用内部执行模式，支持缓存和重试机制
3. **记忆模式**:
   - `lg` 模式使用 LangGraph 内置 MemorySaver
   - `api` 模式需要手动管理对话历史
4. **流式响应**: 当前版本暂不支持流式响应，返回 501 状态码
5. **环境变量**: 需要配置 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL`