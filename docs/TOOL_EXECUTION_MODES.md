# 工具执行模式文档

本文档介绍了两种不同的工具执行模式：内部执行模式和前端执行模式。

## 概述

### 内部执行模式 (INTERNAL)
- 工具在 agent 内部直接执行
- 类似 LangGraph 的 Tool 同时定义 define 和 invoke
- 适合服务端工具，如数据库查询、API 调用等

### 前端执行模式 (FRONTEND)
- agent 只负责下发 tool-call，由前端执行工具
- 类似 wxapp-agent 的框架
- 适合需要前端交互的工具，如文件上传、用户界面操作等

## API 使用示例

### 1. 内部执行模式

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请计算 2 + 3 * 4 的结果",
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

**响应示例：**
```json
{
  "success": true,
  "data": {
    "content": "计算结果为 14",
    "toolCalls": [
      {
        "toolName": "calculator",
        "result": 14,
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

### 2. 前端执行模式（等待结果）

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请帮我上传一个文件",
    "toolExecution": {
      "mode": "frontend",
      "frontendConfig": {
        "waitForResult": true,
        "timeout": 30000,
        "callbackUrl": "https://your-frontend.com/api/tool-callback"
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

**响应示例：**
```json
{
  "success": true,
  "data": {
    "content": "文件上传完成，文件ID为 file_123456",
    "toolCalls": [
      {
        "toolName": "file_upload",
        "result": {
          "fileId": "file_123456",
          "url": "https://your-server.com/files/file_123456",
          "size": 1024
        },
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

### 3. 前端执行模式（不等待结果）

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请发送通知给用户",
    "toolExecution": {
      "mode": "frontend",
      "frontendConfig": {
        "waitForResult": false,
        "callbackUrl": "https://your-frontend.com/api/tool-callback"
      }
    },
    "tools": [
      {
        "name": "send_notification",
        "description": "发送通知给用户",
        "schema": {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "通知消息"
            },
            "userId": {
              "type": "string",
              "description": "用户ID"
            }
          },
          "required": ["message", "userId"]
        }
      }
    ]
  }'
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "content": "通知已下发，等待前端执行",
    "toolCalls": [
      {
        "toolName": "send_notification",
        "result": null,
        "success": true
      }
    ],
    "metadata": {
      "threadId": "default",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "toolsUsed": ["send_notification"]
    }
  }
}
```

## 外部执行模式说明

在外部执行模式下，agent 只负责下发 tool-call，外部系统需要：

1. **解析响应中的工具调用信息**
2. **执行相应的工具**
3. **将结果作为新的消息发送给 agent**

### 外部执行流程

1. 发送聊天请求到 `/api/chat`
2. 如果响应包含 `toolCalls`，说明需要外部执行工具
3. 外部系统执行工具并获取结果
4. 将工具执行结果作为新的消息再次发送给 `/api/chat`

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

# 响应可能包含：
# {
#   "success": true,
#   "data": {
#     "content": "我需要上传文件，请执行文件上传工具",
#     "toolCalls": [
#       {
#         "toolName": "file_upload",
#         "result": null,
#         "success": true
#       }
#     ]
#   }
# }

# 2. 外部系统执行工具后，将结果作为新消息发送
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "文件上传完成，文件ID为 file_123456",
    "threadId": "same_thread_id"
  }'
```

## 配置选项

### 内部执行模式配置

```typescript
interface InternalConfig {
  enableCache?: boolean;    // 是否启用工具缓存
  cacheTtl?: number;        // 缓存生存时间（毫秒）
  maxRetries?: number;      // 最大重试次数
}
```

### 前端执行模式配置

```typescript
interface FrontendConfig {
  waitForResult?: boolean;  // 是否等待前端执行结果
  timeout?: number;         // 超时时间（毫秒）
  callbackUrl?: string;     // 前端回调 URL
}
```

## 工具执行模式配置示例

```bash
curl -X GET http://localhost:3000/api/tool-execution/examples
```

**响应示例：**
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
    "frontend": {
      "mode": "frontend",
      "frontendConfig": {
        "waitForResult": true,
        "timeout": 30000,
        "callbackUrl": "https://your-frontend.com/api/tool-callback"
      },
      "description": "前端执行模式：agent 只负责下发 tool-call，由前端执行"
    },
    "frontendNoWait": {
      "mode": "frontend",
      "frontendConfig": {
        "waitForResult": false,
        "callbackUrl": "https://your-frontend.com/api/tool-callback"
      },
      "description": "前端执行模式（不等待结果）：下发 tool-call 后立即返回"
    }
  }
}
```

## 使用场景

### 内部执行模式适用于：
- 数据库查询
- API 调用
- 文件系统操作
- 计算密集型任务
- 需要服务端权限的操作

### 前端执行模式适用于：
- 文件上传/下载
- 用户界面交互
- 浏览器 API 调用
- 需要用户确认的操作
- 客户端特定的功能

## 注意事项

1. **前端执行模式**需要前端配合实现工具执行逻辑
2. **等待结果模式**会增加响应时间，适合需要立即获取结果的场景
3. **不等待结果模式**适合异步任务，如发送通知、记录日志等
4. 工具执行模式可以在运行时动态切换
5. 建议根据具体业务场景选择合适的执行模式
