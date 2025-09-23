# 外部工具执行 API 使用指南

本文档介绍如何使用外部工具执行功能，让 Agent 能够将工具调用委托给外部系统执行。

## 功能概述

外部工具执行模式允许：
- Agent 生成工具调用但不直接执行
- 外部系统接收工具调用并执行
- 外部系统将执行结果返回给 Agent
- Agent 继续处理工具执行结果

## API 接口

### 1. 创建支持外部执行的 Agent

```bash
POST /chat
Content-Type: application/json

{
  "message": "用户消息",
  "threadId": "your_thread_id",
  "toolExecutionConfig": {
    "mode": "outside",
    "outsideConfig": {
      "waitForResult": false,
      "timeout": 30000
    }
  }
}
```

### 2. 发送用户消息（触发工具调用）

```bash
POST /chat
Content-Type: application/json

{
  "message": "帮我查询咖啡菜单",
  "threadId": "your_thread_id",
  "messageType": "user"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "content": "我来帮您查询咖啡菜单",
    "toolCalls": [
      {
        "toolName": "get_menu",
        "result": null,
        "success": true
      }
    ],
    "metadata": {
      "threadId": "your_thread_id",
      "toolsUsed": ["get_menu"]
    }
  }
}
```

### 3. 获取待执行的工具调用

```bash
GET /chat/pending-tools/{threadId}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "threadId": "your_thread_id",
    "pendingToolCalls": [
      {
        "id": "tool_call_1234567890_1",
        "name": "get_menu",
        "args": {
          "category": "coffee"
        },
        "description": "获取咖啡菜单",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "threadId": "your_thread_id",
        "status": "pending"
      }
    ],
    "count": 1
  }
}
```

### 4. 发送工具执行结果

```bash
POST /chat/tool-result
Content-Type: application/json

{
  "threadId": "your_thread_id",
  "toolResult": {
    "success": true,
    "data": {
      "menu": [
        {
          "name": "美式咖啡",
          "price": 25,
          "description": "经典美式咖啡"
        },
        {
          "name": "拿铁",
          "price": 30,
          "description": "香浓拿铁咖啡"
        }
      ]
    }
  },
  "success": true,
  "metadata": {
    "executionTime": 1500,
    "source": "external_system"
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "message": "工具执行结果已处理",
    "threadId": "your_thread_id",
    "agentResponse": {
      "content": "这是我们的咖啡菜单：\n\n1. 美式咖啡 - ¥25\n   经典美式咖啡\n\n2. 拿铁 - ¥30\n   香浓拿铁咖啡\n\n您想了解哪个产品的更多信息吗？",
      "toolCalls": [],
      "metadata": {
        "threadId": "your_thread_id",
        "toolsUsed": []
      }
    }
  }
}
```

### 5. 直接通过聊天接口发送工具结果

```bash
POST /chat
Content-Type: application/json

{
  "message": "",
  "threadId": "your_thread_id",
  "messageType": "tool",
  "toolResult": {
    "success": true,
    "data": {
      "menu": [...]
    }
  }
}
```

## 使用流程

### 基本流程

1. **创建 Agent**：使用外部执行模式创建 Agent
2. **发送用户消息**：Agent 分析消息并生成工具调用
3. **获取工具调用**：通过 API 获取待执行的工具调用
4. **执行工具**：外部系统执行工具并获取结果
5. **返回结果**：将工具执行结果发送回 Agent
6. **继续对话**：Agent 处理结果并生成最终响应

### 错误处理

#### 工具执行失败

```json
{
  "threadId": "your_thread_id",
  "toolResult": {
    "success": false,
    "error": "数据库连接失败",
    "data": null
  },
  "success": false,
  "metadata": {
    "errorCode": "DB_CONNECTION_ERROR"
  }
}
```

#### 超时处理

如果工具执行超时，系统会自动标记为失败：

```json
{
  "success": false,
  "error": "外部执行超时"
}
```

## 配置选项

### 工具执行配置

```typescript
interface ToolExecutionConfig {
  mode: 'internal' | 'outside';
  outsideConfig?: {
    waitForResult?: boolean;  // 是否等待外部执行结果
    timeout?: number;         // 超时时间（毫秒）
    callbackUrl?: string;     // 回调 URL（可选）
  };
  internalConfig?: {
    enableCache?: boolean;    // 是否启用缓存
    cacheTtl?: number;        // 缓存 TTL（毫秒）
    maxRetries?: number;      // 最大重试次数
  };
}
```

### 消息类型

- `user`: 用户消息（默认）
- `tool`: 工具执行结果消息
- `auto`: 自动检测（系统自动判断）

## 最佳实践

1. **错误处理**：始终检查 API 响应的 `success` 字段
2. **超时设置**：根据工具执行复杂度设置合适的超时时间
3. **状态管理**：定期检查待执行的工具调用状态
4. **日志记录**：记录工具执行过程和结果
5. **重试机制**：实现适当的重试逻辑处理临时失败

## 注意事项

1. **Tool Call ID 管理**：系统会自动管理 tool call ID，无需手动指定
2. **消息顺序**：确保工具执行结果按正确顺序发送
3. **状态同步**：外部系统需要维护与 Agent 的状态同步
4. **资源清理**：及时清理已完成的工具调用状态

## 示例代码

### Node.js 示例

```javascript
const axios = require('axios');

class ExternalToolExecutor {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async sendUserMessage(threadId, message) {
    const response = await axios.post(`${this.baseURL}/chat`, {
      message,
      threadId,
      messageType: 'user',
      toolExecutionConfig: {
        mode: 'outside',
        outsideConfig: {
          waitForResult: false,
          timeout: 30000
        }
      }
    });
    return response.data;
  }

  async getPendingTools(threadId) {
    const response = await axios.get(`${this.baseURL}/chat/pending-tools/${threadId}`);
    return response.data;
  }

  async sendToolResult(threadId, toolResult) {
    const response = await axios.post(`${this.baseURL}/chat/tool-result`, {
      threadId,
      toolResult,
      success: true
    });
    return response.data;
  }

  async executeToolCall(toolCall) {
    // 根据工具名称执行相应的逻辑
    switch (toolCall.name) {
      case 'get_menu':
        return await this.getMenu(toolCall.args);
      case 'place_order':
        return await this.placeOrder(toolCall.args);
      default:
        throw new Error(`未知工具: ${toolCall.name}`);
    }
  }

  async processUserMessage(threadId, message) {
    // 1. 发送用户消息
    const chatResponse = await this.sendUserMessage(threadId, message);
    
    if (chatResponse.success && chatResponse.data.toolCalls?.length > 0) {
      // 2. 获取待执行的工具调用
      const pendingResponse = await this.getPendingTools(threadId);
      
      if (pendingResponse.success) {
        // 3. 执行工具调用
        for (const toolCall of pendingResponse.data.pendingToolCalls) {
          try {
            const result = await this.executeToolCall(toolCall);
            
            // 4. 发送工具执行结果
            await this.sendToolResult(threadId, {
              success: true,
              data: result
            });
          } catch (error) {
            // 5. 发送错误结果
            await this.sendToolResult(threadId, {
              success: false,
              error: error.message
            });
          }
        }
      }
    }
    
    return chatResponse;
  }
}

// 使用示例
const executor = new ExternalToolExecutor('http://localhost:3000');
executor.processUserMessage('thread_123', '帮我查询咖啡菜单')
  .then(response => console.log('处理完成:', response))
  .catch(error => console.error('处理失败:', error));
```

这个外部工具执行功能现在已经完全实现，系统会自动管理 tool call ID，外部系统只需要按照 API 接口进行调用即可。
