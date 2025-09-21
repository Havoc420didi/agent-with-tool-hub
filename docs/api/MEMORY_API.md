# 记忆API文档

## 概述

记忆API提供了根据 `threadId` 获取完整上下文历史记录的功能。这些API允许您管理和查询Agent的记忆状态。

## API端点

### 1. 获取特定Thread的记忆信息

**GET** `/api/memory/:threadId`

根据 `threadId` 获取完整的上下文历史记录。

#### 参数

- `threadId` (路径参数): 线程ID
- `format` (查询参数, 可选): 返回格式，默认为 `json`
- `limit` (查询参数, 可选): 限制返回的消息数量

#### 响应示例

```json
{
  "success": true,
  "data": {
    "threadId": "thread_1234567890",
    "memoryStats": {
      "memoryMode": "lg",
      "memoryEnabled": true,
      "maxHistory": 50
    },
    "history": {
      "threadId": "thread_1234567890",
      "memoryStats": {
        "memoryMode": "lg",
        "memoryEnabled": true,
        "maxHistory": 50
      },
      "message": "当前使用LangGraph MemorySaver，历史记录由LangGraph内部管理",
      "note": "如需获取详细历史记录，请使用API模式或实现历史记录导出功能"
    },
    "timestamp": "2025-01-20T10:30:00.000Z"
  }
}
```

### 2. 获取所有活跃的Thread列表

**GET** `/api/memory/threads`

获取所有活跃的thread列表及其记忆状态。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "totalThreads": 2,
    "threads": [
      {
        "threadId": "thread_1234567890",
        "status": "active",
        "memoryStats": {
          "memoryMode": "lg",
          "memoryEnabled": true,
          "maxHistory": 50
        }
      },
      {
        "threadId": "thread_0987654321",
        "status": "active",
        "memoryStats": {
          "memoryMode": "api",
          "memoryEnabled": true,
          "maxHistory": 30
        }
      }
    ]
  }
}
```

### 3. 清空特定Thread的记忆

**DELETE** `/api/memory/:threadId`

清空指定thread的所有记忆数据。

#### 参数

- `threadId` (路径参数): 要清空记忆的线程ID

#### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "Thread thread_1234567890 的记忆已清空"
  }
}
```

### 4. 获取记忆统计信息

**GET** `/api/memory/stats`

获取所有Agent的记忆统计信息。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "totalThreads": 2,
    "memoryStats": [
      {
        "threadId": "thread_1234567890",
        "memoryMode": "lg",
        "memoryEnabled": true,
        "maxHistory": 50
      },
      {
        "threadId": "thread_0987654321",
        "memoryMode": "api",
        "memoryEnabled": true,
        "maxHistory": 30
      }
    ]
  }
}
```

## 错误响应

所有API在出错时都会返回统一的错误格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 常见错误代码

- `INVALID_REQUEST`: 请求参数无效
- `AGENT_NOT_FOUND`: 指定的Agent不存在
- `MEMORY_ERROR`: 记忆相关操作失败
- `INTERNAL_ERROR`: 服务器内部错误

## 使用示例

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

// 获取特定thread的记忆
async function getThreadMemory(threadId: string) {
  try {
    const response = await axios.get(`${BASE_URL}/memory/${threadId}`);
    return response.data;
  } catch (error) {
    console.error('获取记忆失败:', error);
    throw error;
  }
}

// 获取所有thread列表
async function getAllThreads() {
  try {
    const response = await axios.get(`${BASE_URL}/memory/threads`);
    return response.data;
  } catch (error) {
    console.error('获取thread列表失败:', error);
    throw error;
  }
}

// 清空特定thread的记忆
async function clearThreadMemory(threadId: string) {
  try {
    const response = await axios.delete(`${BASE_URL}/memory/${threadId}`);
    return response.data;
  } catch (error) {
    console.error('清空记忆失败:', error);
    throw error;
  }
}
```

### cURL

```bash
# 获取特定thread的记忆
curl -X GET "http://localhost:3000/api/memory/thread_1234567890"

# 获取所有thread列表
curl -X GET "http://localhost:3000/api/memory/threads"

# 清空特定thread的记忆
curl -X DELETE "http://localhost:3000/api/memory/thread_1234567890"

# 获取记忆统计信息
curl -X GET "http://localhost:3000/api/memory/stats"
```

## 注意事项

1. **记忆模式**: 当前系统支持两种记忆模式：
   - `lg`: 使用LangGraph内置的MemorySaver
   - `api`: 通过API传递历史记录

2. **历史记录获取**: 由于当前使用LangGraph的MemorySaver，详细的历史记录由LangGraph内部管理。如需获取详细历史记录，建议使用API模式或实现历史记录导出功能。

3. **线程管理**: 每个thread对应一个独立的Agent实例，记忆数据在Agent实例中维护。

4. **错误处理**: 建议在客户端实现适当的错误处理机制，根据返回的错误代码进行相应处理。

## 测试

可以使用提供的测试脚本进行API测试：

```bash
npx tsx test-memory-api.mts
```

这将测试所有记忆API的基本功能。
