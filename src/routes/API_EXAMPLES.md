# 聊天 API 使用示例

## 基础聊天

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，请帮我获取当前时间"
  }'
```

## 带自定义工具的聊天

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请帮我计算 5 + 3 的结果",
    "threadId": "user-123",
    "tools": [
      {
        "name": "calculator",
        "description": "数学计算工具",
        "schema": {
          "type": "object",
          "properties": {
            "expression": {
              "type": "string",
              "description": "数学表达式"
            }
          },
          "required": ["expression"]
        },
        "handler": "function(input) { return { success: true, data: eval(input.expression) }; }",
        "category": "math",
        "tags": ["calculation"]
      }
    ]
  }'
```

## 流式聊天

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请详细解释什么是人工智能",
    "streaming": true,
    "threadId": "stream-456"
  }'
```

## 完整配置示例

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请帮我分析这个数据",
    "threadId": "analysis-789",
    "model": {
      "name": "gpt-4",
      "temperature": 0.7,
      "baseURL": "https://api.openai.com/v1",
      "apiKey": "your-api-key"
    },
    "memory": {
      "enabled": true
    },
    "streaming": false,
    "tools": [
      {
        "name": "data_analyzer",
        "description": "数据分析工具",
        "schema": {
          "type": "object",
          "properties": {
            "data": {
              "type": "array",
              "description": "要分析的数据"
            },
            "type": {
              "type": "string",
              "enum": ["statistical", "trend", "correlation"],
              "description": "分析类型"
            }
          },
          "required": ["data", "type"]
        },
        "handler": "async function(input) { return { success: true, data: { analysis: \"分析结果\" } }; }",
        "category": "analysis",
        "tags": ["data", "statistics"]
      }
    ],
    "toolHubConfig": {
      "logging": true,
      "caching": true,
      "statistics": true
    },
    "toolRelations": {
      "data_analyzer": {
        "dependsOn": ["get_time"],
        "conflictsWith": ["simple_calc"]
      }
    },
    "config": {
      "maxIterations": 10,
      "timeout": 30000
    }
  }'
```

## 请求参数说明

### 必需参数
- `message` (string): 用户消息

### 可选参数

#### Agent 配置
- `threadId` (string): 会话ID，用于记忆管理
- `model` (object): 模型配置
  - `name` (string): 模型名称，默认 "deepseek-chat"
  - `temperature` (number): 温度参数，默认 0
  - `baseURL` (string): API 基础URL
  - `apiKey` (string): API 密钥
- `memory` (object): 记忆配置
  - `enabled` (boolean): 是否启用记忆，默认 true
- `streaming` (boolean): 是否流式响应，默认 false

#### 工具配置
- `tools` (array): 自定义工具列表
  - `name` (string): 工具名称
  - `description` (string): 工具描述
  - `schema` (object): 工具参数模式
  - `handler` (string): 工具处理函数（字符串形式）
  - `category` (string): 工具分类
  - `tags` (array): 工具标签
- `toolHubConfig` (object): ToolHub 配置
  - `logging` (boolean): 是否启用日志
  - `caching` (boolean): 是否启用缓存
  - `statistics` (boolean): 是否启用统计
- `toolRelations` (object): 工具关系配置
  - `dependsOn` (array): 依赖的工具
  - `conflictsWith` (array): 冲突的工具

#### 其他配置
- `config` (object): 其他 Agent 配置

## 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    "content": "AI 回复内容",
    "toolCalls": [
      {
        "toolName": "get_time",
        "result": "2024-01-01T12:00:00Z",
        "success": true
      }
    ],
    "metadata": {
      "totalMessages": 3,
      "toolsUsed": ["get_time"],
      "threadId": "user-123",
      "timestamp": "2024-01-01T12:00:00Z",
      "toolHubStats": {
        "total": 5,
        "enabled": 5,
        "byCategory": {
          "system": 2,
          "math": 1,
          "api": 2
        }
      }
    }
  }
}
```

### 流式响应
```
data: {"type":"content","data":{"content":"AI 回复内容","metadata":{"isStreaming":true}},"timestamp":"2024-01-01T12:00:00Z","threadId":"user-123"}

data: {"type":"done","data":{"success":true},"timestamp":"2024-01-01T12:00:00Z","threadId":"user-123"}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "message 是必需的"
  }
}
```
