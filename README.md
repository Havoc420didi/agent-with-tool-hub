# LangGraph Agent 框架

🚀 基于 Koa.js + TypeScript + Rspack 构建的简洁 LangGraph Agent 框架

## 特性

- 🚀 **简洁架构**: 基于 Koa.js 的轻量级框架
- ⚡ **快速构建**: Rspack 提供极速的构建体验
- 🎯 **类型安全**: 完整的 TypeScript 支持
- 🔧 **动态工具管理**: 运行时添加、移除和修改工具
- 📡 **流式处理**: 支持实时流式响应
- 🧠 **内存支持**: 支持对话记忆和上下文保持
- 📚 **自动文档**: 简洁的 API 文档

## 快速开始

### 安装依赖

```bash
npm install
```

### 环境配置

创建 `config.env` 文件：

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.deepseek.com
```

### 开发模式

```bash
# 启动开发服务器（热重载）
npm run dev

# 运行演示
npm run demo
```

### 生产模式

```bash
# 构建应用
npm run build

# 启动生产服务器
npm run start
```

## 基本使用

### 1. 直接使用框架

```typescript
import { createDefaultAgent } from './src/index.js';

// 创建默认 Agent
const agent = createDefaultAgent();

// 发送消息
const response = await agent.invoke("你好，请介绍一下你自己", "thread-1");
console.log(response.content);
```

### 2. 使用 HTTP API

```bash
# 启动服务器
npm run dev

# 创建 Agent
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "my-agent",
    "model": {
      "name": "deepseek-chat",
      "temperature": 0.1
    },
    "memory": {
      "enabled": true
    }
  }'

# 聊天
curl -X POST http://localhost:3000/api/agents/my-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，请介绍一下你自己",
    "threadId": "thread-1"
  }'
```

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/agents` | 创建 Agent |
| GET | `/api/agents` | 获取所有 Agent |
| GET | `/api/agents/:id/status` | 获取 Agent 状态 |
| POST | `/api/agents/:id/chat` | 普通聊天 |
| POST | `/api/agents/:id/chat/stream` | 流式聊天 |
| POST | `/api/agents/:id/tools` | 添加工具 |
| GET | `/api/agents/:id/tools` | 获取工具列表 |
| DELETE | `/api/agents/:id` | 删除 Agent |

## 核心概念

### 1. Agent 构建器

```typescript
import { createAgent } from './src/index.js';

const agent = createAgent({
  model: {
    name: "deepseek-chat",
    temperature: 0.1
  },
  memory: {
    enabled: true
  },
  tools: []
});
```

### 2. 动态工具管理

```typescript
import { tool, z } from './src/index.js';

// 添加工具
agent.addTool({
  name: 'calculator',
  description: '数学计算器',
  schema: z.object({
    expression: z.string().describe("数学表达式")
  }),
  handler: (input) => {
    return `计算结果: ${eval(input.expression)}`;
  }
});

// 移除工具
agent.removeTool('calculator');
```

### 3. 流式处理

```typescript
const stream = agent.stream("请详细解释人工智能", "thread-1");

for await (const chunk of stream) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
}
```

## 项目结构

```
src/
├── main.ts              # Koa.js 应用入口
├── index.ts             # 框架主入口
├── agent-builder.ts     # Agent 构建器
├── tool-manager.ts      # 工具管理器
├── types.ts             # 类型定义
├── routes/
│   └── index.ts         # 路由定义
└── services/
    └── agent.service.ts # Agent 服务
```

## 技术栈

- **Koa.js**: 轻量级 Web 框架
- **TypeScript**: 类型安全的 JavaScript
- **Rspack**: 极速的构建工具
- **LangGraph**: 智能体工作流引擎
- **LangChain**: 大语言模型集成

## 开发

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 运行演示
npm run demo

# 运行测试
npm run test
```

## 许可证

MIT License