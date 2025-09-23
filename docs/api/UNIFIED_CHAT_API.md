# 统一 Chat API 使用指南

本文档介绍如何使用统一的 Chat API 来处理所有类型的消息，包括用户消息、工具执行结果，以及外部工具执行。

## 功能概述

统一的 Chat API 提供以下功能：
- **智能消息类型检测**：自动识别用户消息和工具执行结果
- **外部工具执行支持**：支持将工具调用委托给外部系统执行
- **自动工具调用管理**：系统自动管理 tool call ID 和执行状态
- **统一接口**：所有功能通过一个 `/chat` 接口完成

## API 接口

### 基本接口

```bash
POST /chat
Content-Type: application/json
```

### 请求参数

```typescript
interface ChatRequest {
  message: string;                    // 消息内容（用户消息或工具执行结果）
  threadId?: string;                 // 会话ID
  messageType?: 'user' | 'tool' | 'auto';  // 消息类型
  externalToolExecution?: boolean;   // 是否启用外部工具执行
  chatHistory?: ChatHistoryMessage[]; // 聊天历史
  memoryMode?: 'api' | 'lg';        // 记忆模式
  maxHistory?: number;               // 最大历史消息数
  model?: ModelConfig;               // 模型配置
  memory?: MemoryConfig;             // 记忆配置
  toolExecutionConfig?: ToolExecutionConfig; // 工具执行配置
  systemPrompt?: SystemPromptConfig; // 系统提示词配置
  config?: Record<string, any>;      // 其他配置
}
```

## 使用场景

### 1. 用户消息（内部执行模式）

```bash
POST /chat
Content-Type: application/json

{
  "message": "你好，请介绍一下你自己",
  "threadId": "user_123",
  "messageType": "user",
  "externalToolExecution": false
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "content": "你好！我是一个智能助手，可以帮助您处理各种任务...",
    "toolCalls": [],
    "metadata": {
      "threadId": "user_123",
      "externalToolExecution": false,
      "toolsUsed": []
    }
  }
}
```

### 2. 用户消息（外部执行模式）

```bash
POST /chat
Content-Type: application/json

{
  "message": "帮我查询咖啡菜单",
  "threadId": "user_123",
  "messageType": "user",
  "externalToolExecution": true
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
      "threadId": "user_123",
      "externalToolExecution": true,
      "toolsUsed": ["get_menu"],
      "pendingToolCalls": [
        {
          "id": "tool_call_1234567890_1",
          "name": "get_menu",
          "args": {
            "category": "coffee"
          },
          "description": "获取咖啡菜单",
          "timestamp": "2024-01-01T00:00:00.000Z",
          "threadId": "user_123",
          "status": "pending"
        }
      ]
    }
  }
}
```

### 3. 工具执行结果

```bash
POST /chat
Content-Type: application/json

{
  "message": "{\"success\": true, \"data\": {\"menu\": [{\"name\": \"美式咖啡\", \"price\": 25, \"description\": \"经典美式咖啡\"}, {\"name\": \"拿铁\", \"price\": 30, \"description\": \"香浓拿铁咖啡\"}]}}",
  "threadId": "user_123",
  "messageType": "tool",
  "externalToolExecution": true
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "content": "这是我们的咖啡菜单：\n\n1. 美式咖啡 - ¥25\n   经典美式咖啡\n\n2. 拿铁 - ¥30\n   香浓拿铁咖啡\n\n您想了解哪个产品的更多信息吗？",
    "toolCalls": [],
    "metadata": {
      "threadId": "user_123",
      "externalToolExecution": true,
      "toolsUsed": []
    }
  }
}
```

### 4. 自动消息类型检测

```bash
POST /chat
Content-Type: application/json

{
  "message": "请告诉我今天的天气",
  "threadId": "user_123",
  "messageType": "auto"
}
```

系统会自动检测：
- 如果有非空 `message`，识别为用户消息
- 如果消息为空，返回错误

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

### 消息类型说明

- **`user`**: 用户消息，Agent 会处理并可能生成工具调用
- **`tool`**: 工具执行结果消息，Agent 会处理工具执行结果
- **`auto`**: 自动检测，系统根据参数自动判断消息类型

## 外部工具执行流程

### 基本流程

1. **发送用户消息**：
   ```bash
   POST /chat
   {
     "message": "帮我查询咖啡菜单",
     "threadId": "user_123",
     "externalToolExecution": true
   }
   ```

2. **获取工具调用**：
   响应中的 `metadata.pendingToolCalls` 包含待执行的工具调用

3. **执行工具**：
   外部系统根据工具调用信息执行相应操作

4. **返回结果**：
   ```bash
   POST /chat
   {
     "message": "{\"success\": true, \"data\": {...}}",
     "threadId": "user_123",
     "messageType": "tool",
     "externalToolExecution": true
   }
   ```

5. **获取最终响应**：
   Agent 处理工具结果并生成最终回复

## 错误处理

### 工具执行失败

```json
{
  "message": "{\"success\": false, \"error\": \"数据库连接失败\", \"data\": null}",
  "threadId": "user_123",
  "messageType": "tool",
  "externalToolExecution": true
}
```

### 消息验证错误

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "用户消息不能为空"
  }
}
```

## 最佳实践

### 1. 消息类型选择

- **明确指定**：如果确定消息类型，明确指定 `messageType`
- **自动检测**：如果不确定，使用 `messageType: "auto"`
- **外部执行**：需要外部工具执行时，设置 `externalToolExecution: true`

### 2. 工具调用管理

- **自动匹配**：系统会自动匹配最近的待执行工具调用
- **状态同步**：确保工具执行结果按正确顺序发送
- **错误处理**：实现适当的错误处理和重试机制

### 3. 性能优化

- **缓存配置**：合理配置工具执行缓存
- **超时设置**：根据工具复杂度设置合适的超时时间
- **批量处理**：对于多个工具调用，考虑批量处理

## 示例代码

### Node.js 示例

```javascript
const axios = require('axios');

class UnifiedChatClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async sendMessage(threadId, message, options = {}) {
    const response = await axios.post(`${this.baseURL}/chat`, {
      message,
      threadId,
      messageType: options.messageType || 'auto',
      toolResult: options.toolResult,
      externalToolExecution: options.externalToolExecution || false,
      ...options
    });
    return response.data;
  }

  async processWithExternalTools(threadId, message) {
    // 1. 发送用户消息（外部执行模式）
    const userResponse = await this.sendMessage(threadId, message, {
      externalToolExecution: true
    });

    if (!userResponse.success) {
      throw new Error(`用户消息处理失败: ${userResponse.error?.message}`);
    }

    // 2. 检查是否有待执行的工具调用
    const pendingToolCalls = userResponse.data?.metadata?.pendingToolCalls || [];
    
    if (pendingToolCalls.length > 0) {
      // 3. 执行工具调用
      for (const toolCall of pendingToolCalls) {
        try {
          const result = await this.executeTool(toolCall);
          
          // 4. 发送工具执行结果
          const toolResponse = await this.sendMessage(threadId, '', {
            messageType: 'tool',
            toolResult: { success: true, data: result },
            externalToolExecution: true
          });

          if (!toolResponse.success) {
            console.error('工具执行结果处理失败:', toolResponse.error);
          }
        } catch (error) {
          // 5. 发送错误结果
          await this.sendMessage(threadId, '', {
            messageType: 'tool',
            toolResult: { success: false, error: error.message },
            externalToolExecution: true
          });
        }
      }
    }

    return userResponse;
  }

  async executeTool(toolCall) {
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

  async getMenu(args) {
    // 模拟获取菜单
    return {
      menu: [
        { name: '美式咖啡', price: 25, description: '经典美式咖啡' },
        { name: '拿铁', price: 30, description: '香浓拿铁咖啡' }
      ]
    };
  }

  async placeOrder(args) {
    // 模拟下单
    return {
      orderId: 'ORDER_' + Date.now(),
      status: 'confirmed',
      items: args.items
    };
  }
}

// 使用示例
const client = new UnifiedChatClient('http://localhost:3000');

async function main() {
  try {
    const response = await client.processWithExternalTools('user_123', '帮我查询咖啡菜单');
    console.log('最终响应:', response.data?.content);
  } catch (error) {
    console.error('处理失败:', error);
  }
}

main();
```

### Python 示例

```python
import requests
import json

class UnifiedChatClient:
    def __init__(self, base_url):
        self.base_url = base_url

    def send_message(self, thread_id, message, **options):
        data = {
            'message': message,
            'threadId': thread_id,
            'messageType': options.get('messageType', 'auto'),
            'toolResult': options.get('toolResult'),
            'externalToolExecution': options.get('externalToolExecution', False)
        }
        data.update(options)
        
        response = requests.post(f'{self.base_url}/chat', json=data)
        return response.json()

    def process_with_external_tools(self, thread_id, message):
        # 1. 发送用户消息（外部执行模式）
        user_response = self.send_message(
            thread_id, 
            message, 
            externalToolExecution=True
        )

        if not user_response['success']:
            raise Exception(f"用户消息处理失败: {user_response['error']['message']}")

        # 2. 检查是否有待执行的工具调用
        pending_tool_calls = user_response['data']['metadata'].get('pendingToolCalls', [])
        
        for tool_call in pending_tool_calls:
            try:
                # 3. 执行工具调用
                result = self.execute_tool(tool_call)
                
                # 4. 发送工具执行结果
                tool_response = self.send_message(
                    thread_id,
                    '',
                    messageType='tool',
                    toolResult={'success': True, 'data': result},
                    externalToolExecution=True
                )

                if not tool_response['success']:
                    print(f"工具执行结果处理失败: {tool_response['error']}")
                    
            except Exception as error:
                # 5. 发送错误结果
                self.send_message(
                    thread_id,
                    '',
                    messageType='tool',
                    toolResult={'success': False, 'error': str(error)},
                    externalToolExecution=True
                )

        return user_response

    def execute_tool(self, tool_call):
        # 根据工具名称执行相应的逻辑
        if tool_call['name'] == 'get_menu':
            return self.get_menu(tool_call['args'])
        elif tool_call['name'] == 'place_order':
            return self.place_order(tool_call['args'])
        else:
            raise Exception(f"未知工具: {tool_call['name']}")

    def get_menu(self, args):
        return {
            'menu': [
                {'name': '美式咖啡', 'price': 25, 'description': '经典美式咖啡'},
                {'name': '拿铁', 'price': 30, 'description': '香浓拿铁咖啡'}
            ]
        }

    def place_order(self, args):
        return {
            'orderId': f'ORDER_{int(time.time())}',
            'status': 'confirmed',
            'items': args['items']
        }

# 使用示例
if __name__ == '__main__':
    client = UnifiedChatClient('http://localhost:3000')
    
    try:
        response = client.process_with_external_tools('user_123', '帮我查询咖啡菜单')
        print('最终响应:', response['data']['content'])
    except Exception as error:
        print('处理失败:', error)
```

## 注意事项

1. **Tool Call ID 管理**：系统会自动管理 tool call ID，无需手动指定
2. **消息顺序**：确保工具执行结果按正确顺序发送
3. **状态同步**：外部系统需要维护与 Agent 的状态同步
4. **错误处理**：实现适当的错误处理和重试机制
5. **性能考虑**：合理配置缓存和超时设置

这个统一的 Chat API 现在完全集成了外部工具执行功能，通过一个接口就能处理所有类型的消息和工具执行场景。
