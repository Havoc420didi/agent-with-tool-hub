# 简化的 API 使用指南

## 概述

根据您的要求，API 已经简化为只保留 `/chat` 接口。外部执行工具时，外部系统需要自行处理消息。

## API 接口

### 聊天接口

**POST** `/api/chat`

#### 请求参数

```json
{
  "message": "用户消息",
  "threadId": "可选的会话ID",
  "toolExecution": {
    "mode": "internal" | "outside",
    "internalConfig": {
      "enableCache": true,
      "cacheTtl": 300000,
      "maxRetries": 3
    },
    "outsideConfig": {
      "waitForResult": true,
      "timeout": 30000,
      "callbackUrl": "https://your-external.com/callback"
    }
  },
  "tools": [
    {
      "name": "工具名称",
      "description": "工具描述",
      "schema": "Zod schema 对象",
      "handler": "工具处理函数"
    }
  ]
}
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "content": "Agent 回复内容",
    "toolCalls": [
      {
        "toolName": "工具名称",
        "result": "工具执行结果（内部模式）或 null（外部模式）",
        "success": true,
        "error": "错误信息（如果有）"
      }
    ],
    "metadata": {
      "threadId": "会话ID",
      "timestamp": "时间戳",
      "toolsUsed": ["使用的工具列表"]
    }
  }
}
```

## 使用场景

### 1. 内部执行模式

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请计算 2 + 3 的结果",
    "toolExecution": {
      "mode": "internal",
      "internalConfig": {
        "enableCache": true,
        "cacheTtl": 300000,
        "maxRetries": 3
      }
    },
    "tools": [
      {
        "name": "calculator",
        "description": "执行数学计算",
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
        "handler": "async (input) => { return { success: true, data: eval(input.expression) }; }"
      }
    ]
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "content": "计算结果为 5",
    "toolCalls": [
      {
        "toolName": "calculator",
        "result": 5,
        "success": true
      }
    ],
    "metadata": {
      "threadId": "default",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "toolsUsed": ["calculator"]
    }
  }
}
```

### 2. 外部执行模式

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请上传文件 test.txt",
    "toolExecution": {
      "mode": "outside",
      "outsideConfig": {
        "waitForResult": false
      }
    },
    "tools": [
      {
        "name": "file_upload",
        "description": "上传文件到服务器",
        "schema": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "description": "文件名"
            },
            "content": {
              "type": "string",
              "description": "文件内容"
            }
          },
          "required": ["filename", "content"]
        }
      }
    ]
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "content": "我需要上传文件，请执行文件上传工具",
    "toolCalls": [
      {
        "toolName": "file_upload",
        "result": null,
        "success": true
      }
    ],
    "metadata": {
      "threadId": "default",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "toolsUsed": ["file_upload"]
    }
  }
}
```

## 外部执行流程

在外部执行模式下，外部系统需要：

1. **解析响应**：检查 `toolCalls` 数组
2. **执行工具**：根据 `toolName` 和参数执行相应工具
3. **发送结果**：将执行结果作为新消息发送给 agent

### 示例流程

```bash
# 1. 发送初始消息
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请上传文件 test.txt",
    "toolExecution": {
      "mode": "outside",
      "outsideConfig": {
        "waitForResult": false
      }
    }
  }'

# 2. 外部系统执行工具后，将结果作为新消息发送
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "文件上传完成，文件ID为 file_123456，URL为 https://server.com/files/file_123456",
    "threadId": "same_thread_id"
  }'
```

## 配置示例

### 获取配置示例

```bash
curl -X GET http://localhost:3000/api/tool-execution/examples
```

**响应：**
```json
{
  "success": true,
  "data": {
    "internal": {
      "mode": "internal",
      "internalConfig": {
        "enableCache": true,
        "cacheTtl": 300000,
        "maxRetries": 3
      },
      "description": "内部执行模式：工具在 agent 内部直接执行"
    },
    "outside": {
      "mode": "outside",
      "outsideConfig": {
        "waitForResult": true,
        "timeout": 30000,
        "callbackUrl": "https://your-external.com/api/tool-callback"
      },
      "description": "外部执行模式：agent 只负责下发 tool-call，由外部执行"
    },
    "outsideNoWait": {
      "mode": "outside",
      "outsideConfig": {
        "waitForResult": false,
        "callbackUrl": "https://your-external.com/api/tool-callback"
      },
      "description": "外部执行模式（不等待结果）：下发 tool-call 后立即返回"
    }
  }
}
```

## 注意事项

1. **外部执行模式**：外部系统需要解析 `toolCalls` 并执行相应工具
2. **会话管理**：使用 `threadId` 保持会话连续性
3. **错误处理**：检查 `success` 字段和 `error` 信息
4. **工具定义**：确保工具定义包含正确的 schema 和 handler
5. **超时设置**：外部执行模式支持超时配置

## 最佳实践

1. **内部执行模式**：适合服务端工具，如数据库查询、API 调用
2. **外部执行模式**：适合需要外部交互的工具，如文件上传、用户界面操作
3. **会话管理**：始终使用相同的 `threadId` 保持上下文
4. **错误处理**：实现适当的重试和错误处理机制
5. **工具设计**：确保工具接口清晰，参数验证完整
