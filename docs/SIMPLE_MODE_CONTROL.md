# 简单的模式控制 - 直接通过 mode 字段控制工具执行

本文档介绍如何通过 `toolExecutionConfig.mode` 字段直接控制工具是内部执行还是外部执行。

## 概述

通过设置 `toolExecutionConfig.mode` 字段，您可以简单地控制所有工具的执行方式：

- **`ToolExecutionMode.INTERNAL`**：所有工具在 Agent 内部直接执行
- **`ToolExecutionMode.OUTSIDE`**：所有工具下发到外部执行

## 使用方法

### 内部执行模式

```typescript
import { AgentBuilder } from './src/core/agent-builder';
import { ToolExecutionMode } from './src/core/types';

const agent = new AgentBuilder({
  model: { 
    name: 'deepseek-chat', 
    temperature: 0,
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY
  },
  tools: [
    // 您的工具配置
  ],
  toolExecutionConfig: {
    mode: ToolExecutionMode.INTERNAL, // 所有工具内部执行
    internalConfig: {
      enableCache: true,
      cacheTtl: 300000,
      maxRetries: 3
    }
  }
});
```

### 外部执行模式

```typescript
const agent = new AgentBuilder({
  model: { 
    name: 'deepseek-chat', 
    temperature: 0,
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY
  },
  tools: [
    // 您的工具配置
  ],
  toolExecutionConfig: {
    mode: ToolExecutionMode.OUTSIDE, // 所有工具外部执行
    outsideConfig: {
      waitForResult: true,
      timeout: 60000,
      callbackUrl: 'http://localhost:3000/api/tool-callback'
    }
  }
});
```

## 配置说明

### ToolExecutionConfig 接口

```typescript
interface ToolExecutionConfig {
  /** 执行模式 - 直接控制内部还是外部执行 */
  mode: ToolExecutionMode;
  /** 外部执行模式配置 */
  outsideConfig?: {
    /** 是否等待外部执行结果 */
    waitForResult?: boolean;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 外部回调 URL */
    callbackUrl?: string;
  };
  /** 内部执行模式配置 */
  internalConfig?: {
    /** 是否启用工具缓存 */
    enableCache?: boolean;
    /** 缓存 TTL（毫秒） */
    cacheTtl?: number;
    /** 最大重试次数 */
    maxRetries?: number;
  };
}
```

### ToolExecutionMode 枚举

```typescript
enum ToolExecutionMode {
  /** 内部执行模式：工具在 agent 内部直接执行 */
  INTERNAL = 'internal',
  /** 外部执行模式：agent 只负责下发 tool-call，由外部执行 */
  OUTSIDE = 'outside'
}
```

## 使用示例

### 基础示例

```typescript
async function basicExample() {
  // 创建 Agent
  const agent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'calculator',
        description: '执行数学计算',
        schema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: '数学表达式' }
          },
          required: ['expression']
        },
        handler: async (input: any) => {
          try {
            const result = eval(input.expression);
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        tags: ['math'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.INTERNAL // 内部执行
    }
  });

  agent.initialize();

  // 使用 Agent
  const result = await agent.invoke({
    messages: [{ role: 'user', content: '请计算 2 + 3 * 4 的结果' }],
    metadata: { threadId: 'demo' }
  });

  console.log('计算结果:', result);
}
```

### 外部执行示例

```typescript
async function externalExecutionExample() {
  const agent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'file_upload',
        description: '上传文件',
        schema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: '文件路径' }
          },
          required: ['filePath']
        },
        handler: async (input: any) => {
          return { success: false, error: '需要外部执行' };
        },
        tags: ['file'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      }
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.OUTSIDE, // 外部执行
      outsideConfig: {
        waitForResult: true,
        timeout: 60000
      }
    }
  });

  agent.initialize();

  // 使用 Agent
  const result = await agent.invoke({
    messages: [{ role: 'user', content: '请上传文件 /path/to/document.pdf' }],
    metadata: { threadId: 'demo' }
  });

  console.log('上传结果:', result);

  // 获取待执行的工具调用
  const pendingCalls = agent.getPendingToolCalls();
  console.log('待执行的工具调用:', pendingCalls);

  // 处理外部执行结果
  if (pendingCalls.length > 0) {
    const toolCall = pendingCalls[0].toolCall;
    const mockResult = { 
      success: true, 
      data: { fileId: 'file_12345', fileName: toolCall.args.filePath } 
    };
    await agent.handleOutsideToolResult(toolCall.id, mockResult);
    console.log('外部执行完成');
  }
}
```

### 运行时切换模式

```typescript
async function runtimeSwitchExample() {
  const agent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      // 工具配置
    ],
    toolExecutionConfig: {
      mode: ToolExecutionMode.INTERNAL // 初始为内部执行
    }
  });

  agent.initialize();

  // 内部执行
  console.log('内部执行模式');
  const internalResult = await agent.invoke({
    messages: [{ role: 'user', content: '请执行任务' }],
    metadata: { threadId: 'demo' }
  });

  // 切换到外部执行
  agent.setToolExecutionMode(ToolExecutionMode.OUTSIDE);
  console.log('切换到外部执行模式');
  
  const externalResult = await agent.invoke({
    messages: [{ role: 'user', content: '请执行任务' }],
    metadata: { threadId: 'demo' }
  });

  // 切换回内部执行
  agent.setToolExecutionMode(ToolExecutionMode.INTERNAL);
  console.log('切换回内部执行模式');
}
```

## API 接口

### Agent 管理方法

```typescript
// 设置执行模式
agent.setToolExecutionMode(ToolExecutionMode.OUTSIDE);

// 获取待执行的工具调用（外部执行模式）
const pendingCalls = agent.getPendingToolCalls();

// 处理外部工具执行结果
await agent.handleOutsideToolResult(toolCallId, result);

// 获取工具执行统计
const stats = agent.getToolExecutionStats();

// 清除待执行的工具调用
agent.clearPendingToolCalls();
```

## 执行流程

### 内部执行模式

```
用户输入 → Agent → 工具内部执行 → 返回结果
```

### 外部执行模式

```
用户输入 → Agent → 下发工具调用 → 外部执行 → 返回结果
```

## 运行演示

```bash
# 运行简单模式控制演示
npx tsx examples/simple-mode-control-demo.mts
```

## 总结

通过 `toolExecutionConfig.mode` 字段，您可以：

1. **简单控制**：直接设置 `INTERNAL` 或 `OUTSIDE` 模式
2. **统一执行**：所有工具使用相同的执行方式
3. **灵活切换**：支持运行时动态切换模式
4. **易于理解**：配置简单，逻辑清晰

这种方式完全满足了您「直接由这个字段来控制内部还是外部」的需求，提供了最简单直接的控制方式。
