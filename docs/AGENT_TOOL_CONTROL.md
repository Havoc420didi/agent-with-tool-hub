# Agent 自主控制 Tool-Call 执行

本文档介绍了如何让 Agent 能够自主控制 tool-call 的执行方式，实现「将 tool-call 下发到请求端，而不是 agent 内部执行」的需求。

## 概述

通过增强的 Agent 架构，您现在可以让 Agent 根据具体情况智能决定工具的执行方式：

- **内部执行模式 (INTERNAL)**：工具在 Agent 内部直接执行
- **外部执行模式 (OUTSIDE)**：Agent 只负责下发 tool-call，由外部执行

## 核心特性

### 1. 智能决策系统

Agent 可以根据以下因素自动决定工具的执行方式：

- **工具名称**：基于工具名称模式匹配
- **用户消息**：分析用户消息中的关键词
- **会话上下文**：根据会话状态和元数据
- **历史决策**：学习历史决策模式
- **自定义规则**：支持自定义决策函数

### 2. 动态执行模式切换

- 运行时动态切换执行模式
- 支持配置热更新
- 保持状态一致性

### 3. 增强的工具节点

- 支持智能决策的工具节点
- 自动处理内部和外部执行
- 提供详细的执行统计

## 使用方法

### 基础配置

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
    mode: ToolExecutionMode.INTERNAL, // 默认模式
    dynamicControl: {
      enabled: true, // 启用动态控制
      defaultMode: ToolExecutionMode.INTERNAL
    }
  }
});
```

### 内部执行模式

```typescript
// 工具在 Agent 内部直接执行
const agent = new AgentBuilder({
  // ... 其他配置
  toolExecutionConfig: {
    mode: ToolExecutionMode.INTERNAL,
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
// Agent 只负责下发 tool-call
const agent = new AgentBuilder({
  // ... 其他配置
  toolExecutionConfig: {
    mode: ToolExecutionMode.OUTSIDE,
    outsideConfig: {
      waitForResult: true,
      timeout: 60000,
      callbackUrl: 'http://localhost:3000/api/tool-callback'
    }
  }
});
```

### 智能决策控制

```typescript
const agent = new AgentBuilder({
  // ... 其他配置
  toolExecutionConfig: {
    mode: ToolExecutionMode.INTERNAL,
    dynamicControl: {
      enabled: true,
      decisionFunction: (toolName: string, args: any, context?: any) => {
        // 自定义决策逻辑
        if (toolName.includes('file') || toolName.includes('upload')) {
          return ToolExecutionMode.OUTSIDE;
        }
        if (toolName.includes('database') || toolName.includes('calculate')) {
          return ToolExecutionMode.INTERNAL;
        }
        
        // 基于用户消息决策
        const userMessage = context?.userMessage?.toLowerCase() || '';
        if (userMessage.includes('上传') || userMessage.includes('点击')) {
          return ToolExecutionMode.OUTSIDE;
        }
        
        return ToolExecutionMode.INTERNAL;
      },
      defaultMode: ToolExecutionMode.INTERNAL
    }
  }
});
```

## API 接口

### Agent 管理方法

```typescript
// 获取待执行的工具调用
const pendingCalls = agent.getPendingToolCalls();

// 处理外部工具执行结果
await agent.handleOutsideToolResult(toolCallId, result);

// 获取工具执行统计
const stats = agent.getToolExecutionStats();

// 获取决策历史
const history = agent.getDecisionHistory();

// 手动设置执行模式
agent.setToolExecutionMode(ToolExecutionMode.OUTSIDE);

// 启用/禁用动态控制
agent.setDynamicControl(true, customDecisionFunction);

// 清除待执行的工具调用
agent.clearPendingToolCalls();
```

### 工具执行决策上下文

```typescript
interface ToolExecutionDecisionContext {
  toolName: string;           // 工具名称
  args: Record<string, any>;  // 工具参数
  userMessage?: string;       // 用户消息
  sessionContext?: Record<string, any>; // 会话上下文
  requestMetadata?: Record<string, any>; // 请求元数据
  currentMode?: ToolExecutionMode; // 当前执行模式
}
```

## 决策规则

### 基于工具名称的决策

系统内置了以下规则：

**外部执行工具**：
- `file_upload` - 文件上传
- `user_interface_action` - 用户界面操作
- `browser_operation` - 浏览器操作
- `mobile_app_action` - 移动应用操作
- `hardware_control` - 硬件控制

**内部执行工具**：
- `database_query` - 数据库查询
- `api_call` - API 调用
- `calculation` - 计算
- `data_processing` - 数据处理
- `text_analysis` - 文本分析

### 基于用户消息的决策

**外部执行关键词**：
- 上传、选择文件、点击、选择、操作

**内部执行关键词**：
- 计算、查询、分析、处理

### 基于会话上下文的决策

```typescript
// 强制外部执行
const sessionContext = {
  requireExternalExecution: true,
  waitForResult: true,
  timeout: 30000
};

// 强制内部执行
const sessionContext = {
  requireInternalExecution: true
};
```

## 示例代码

### 完整示例

```typescript
import { AgentBuilder } from './src/core/agent-builder';
import { ToolExecutionMode } from './src/core/types';

async function demonstrateToolControl() {
  const agent = new AgentBuilder({
    model: { 
      name: 'deepseek-chat', 
      temperature: 0,
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [
      {
        name: 'database_query',
        description: '查询数据库',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL 查询语句' }
          },
          required: ['query']
        },
        handler: async (input: any) => {
          return { success: true, data: `查询结果: ${input.query}` };
        },
        tags: ['database'],
        permissionLevel: 'PUBLIC' as any,
        securityLevel: 'AUTO' as any
      },
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
      mode: ToolExecutionMode.INTERNAL,
      dynamicControl: {
        enabled: true,
        defaultMode: ToolExecutionMode.INTERNAL
      }
    }
  });

  agent.initialize();

  // 内部执行 - 数据库查询
  const dbResult = await agent.invoke({
    messages: [{ role: 'user', content: '请查询用户表' }],
    metadata: { threadId: 'demo-1' }
  });
  console.log('数据库查询结果:', dbResult);

  // 外部执行 - 文件上传
  const uploadResult = await agent.invoke({
    messages: [{ role: 'user', content: '请上传文件' }],
    metadata: { threadId: 'demo-2' }
  });
  console.log('文件上传结果:', uploadResult);

  // 获取待执行的工具调用
  const pendingCalls = agent.getPendingToolCalls();
  console.log('待执行的工具调用:', pendingCalls);

  // 处理外部执行结果
  if (pendingCalls.length > 0) {
    const toolCall = pendingCalls[0];
    const mockResult = { success: true, data: '文件上传成功' };
    await agent.handleOutsideToolResult(toolCall.toolCall.id, mockResult);
  }
}

demonstrateToolControl().catch(console.error);
```

## 运行演示

```bash
# 运行基础演示
npx tsx examples/agent-tool-control-demo.mts

# 运行完整演示
npx tsx examples/complete-tool-control-demo.mts
```

## 架构图

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│   Agent Builder  │───▶│  Decision Mgr   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Enhanced Tool    │    │ Execution Mode  │
                       │ Node             │    │ Decision        │
                       └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Tool Execution   │
                       │ (Internal/Outside)│
                       └──────────────────┘
```

## 总结

通过这个增强的 Agent 架构，您可以：

1. **智能决策**：Agent 根据多种因素自动决定工具的执行方式
2. **灵活控制**：支持运行时动态切换执行模式
3. **外部集成**：轻松将 tool-call 下发到请求端执行
4. **历史学习**：基于历史决策优化执行策略
5. **详细统计**：提供完整的执行统计和监控

这完全满足了您「将 tool-call 下发到请求端，而不是 agent 内部执行」的需求，同时保持了系统的灵活性和可扩展性。
