# 系统提示词构建器 API 文档

## 概述

系统提示词构建器是一个灵活的组件，用于构建结构化的系统提示词。它支持自定义身份、任务、上下文信息，并集成了工具系统提示词功能。

## 核心特性

- 🎭 **身份配置**: 定义AI助手的身份、专业领域和行为准则
- 📋 **任务配置**: 设置任务描述、目标、执行步骤和注意事项
- 🌐 **上下文信息**: 支持用户信息、记忆摘要、开发者上下文等
- 🔧 **工具集成**: 自动集成工具系统提示词
- ⚙️ **灵活配置**: 支持多种选项组合和自定义前缀

## 基本用法

### 1. 创建系统提示词构建器

```typescript
import { SystemPromptBuilder } from '../core/system-prompt-builder';
import { ToolRegistry } from '../tool-hub/core/tool-registry';

// 创建工具注册表
const registry = new ToolRegistry();

// 创建系统提示词构建器
const promptBuilder = new SystemPromptBuilder(registry);
```

### 2. 构建微信小程序AI助手提示词

```typescript
const wechatPrompt = promptBuilder.buildWechatMiniProgramPrompt(
  '用户是25岁的程序员，喜欢喝咖啡',
  '用户之前询问过拿铁咖啡的价格',
  '当前页面显示咖啡菜单，包含各种咖啡选项',
  {
    includeStatistics: true,
    includeParameters: true,
    includeDependencies: false
  }
);
```

### 3. 构建自定义系统提示词

```typescript
import { IdentityConfig, TaskConfig, ContextConfig } from '../core/system-prompt-builder';

const identity: IdentityConfig = {
  description: '专业的咖啡顾问AI助手',
  expertise: ['咖啡知识', '口味推荐', '价格分析'],
  guidelines: [
    '根据用户喜好推荐合适的咖啡',
    '提供详细的咖啡信息',
    '考虑用户的预算和口味偏好'
  ],
  responseFormat: '以专业但友好的语调回答，包含具体的推荐理由'
};

const task: TaskConfig = {
  description: '帮助用户选择合适的咖啡产品',
  objectives: [
    '了解用户的口味偏好',
    '推荐合适的咖啡产品',
    '提供价格和品质信息'
  ],
  steps: [
    '询问用户的口味偏好',
    '分析可用的咖啡选项',
    '推荐最合适的产品',
    '解释推荐理由'
  ],
  notes: [
    '考虑用户的预算限制',
    '提供多种选择供用户参考',
    '确保推荐的产品符合用户需求'
  ]
};

const context: ContextConfig = {
  userInfo: '用户是咖啡爱好者，预算在30-50元之间',
  memorySummary: '用户之前购买过拿铁咖啡，对口感满意',
  developerContext: '当前显示咖啡菜单页面，包含各种咖啡的价格和描述',
  additionalContext: {
    'currentTime': '下午3点，适合喝咖啡的时间',
    'weather': '阴天，适合喝热咖啡'
  }
};

const customPrompt = promptBuilder.buildSystemPrompt(identity, task, context, {
  includeStatistics: true,
  includeParameters: true,
  includeDependencies: true
});
```

## AgentBuilder 集成

### 1. 使用默认系统提示词

```typescript
import { createDefaultAgent } from '../core/agent-builder';

const agent = createDefaultAgent();
agent.initialize();

// 获取默认系统提示词
const defaultPrompt = agent.getSystemPrompt();
```

### 2. 构建微信小程序AI助手

```typescript
const wechatPrompt = agent.buildWechatMiniProgramPrompt(
  userInfo,
  memorySummary,
  developerContext,
  {
    includeStatistics: true,
    includeParameters: true,
    includeDependencies: false
  }
);
```

### 3. 构建自定义系统提示词

```typescript
const customPrompt = agent.buildCustomSystemPrompt(
  identity,
  task,
  context,
  {
    includeStatistics: true,
    includeParameters: true,
    includeDependencies: true
  }
);
```

### 4. 配置系统提示词选项

```typescript
// 更新系统提示词配置
agent.setSystemPromptConfig({
  enabled: true,
  includeUnavailable: false,
  includeParameters: true,
  includeStatistics: true,
  includeDependencies: false,
  customPrefix: '【重要】请特别注意以下要求：'
});

// 获取当前配置
const config = agent.getSystemPromptConfig();

// 预览系统提示词
const preview = agent.previewSystemPrompt({
  includeStatistics: false,
  includeParameters: true,
  includeDependencies: false
});
```

## 配置选项

### SystemPromptOptions

```typescript
interface SystemPromptOptions {
  /** 是否包含不可用工具 */
  includeUnavailable?: boolean;
  /** 是否包含参数详情 */
  includeParameters?: boolean;
  /** 是否包含统计信息 */
  includeStatistics?: boolean;
  /** 是否包含依赖关系 */
  includeDependencies?: boolean;
  /** 自定义前缀 */
  customPrefix?: string;
}
```

### IdentityConfig

```typescript
interface IdentityConfig {
  /** 身份描述 */
  description: string;
  /** 专业领域 */
  expertise?: string[];
  /** 行为准则 */
  guidelines?: string[];
  /** 回答格式要求 */
  responseFormat?: string;
}
```

### TaskConfig

```typescript
interface TaskConfig {
  /** 任务描述 */
  description: string;
  /** 任务目标 */
  objectives?: string[];
  /** 执行步骤 */
  steps?: string[];
  /** 注意事项 */
  notes?: string[];
}
```

### ContextConfig

```typescript
interface ContextConfig {
  /** 用户信息 */
  userInfo?: string;
  /** 记忆摘要 */
  memorySummary?: string;
  /** 开发者上下文 */
  developerContext?: string;
  /** 其他上下文信息 */
  additionalContext?: Record<string, string>;
}
```

## 输出格式

系统提示词构建器会生成结构化的提示词，包含以下部分：

1. **身份部分** (`<Identity>`): 定义AI助手的身份和行为准则
2. **任务部分** (`<Task>`): 描述任务目标、步骤和注意事项
3. **上下文信息部分**: 包含用户信息、记忆摘要、开发者上下文等
4. **工具部分**: 自动集成的工具系统提示词

## 示例输出

```
<Identity>
你是微信小程序AI助手
你擅长根据contextInfo内容回答用户的问题
你正在和用户对话，注意回答需要简洁准确
用户的历史会话中会携带会话时间，不要直接告诉用户会话时间，除非用户主动询问会话时间，才告知用户会话时间
</Identity>

<Task>
请根据用户意图，并结合contextInfo数据，准确的回答用户的问题。
任务目标:
- 准确理解用户意图
- 结合上下文信息提供准确回答
- 使用微信对话格式回复
注意事项:
- 不要使用markdown格式
- 不要直接告知用户你正在执行什么操作
- 除非用户主动询问，否则不要提及会话时间
</Task>

以下 <userInfo> 是用户的用户画像信息，用户画像只作为辅助回答使用，一定不要直接告知用户你知道这些信息
<userInfo>用户是25岁的程序员，喜欢喝咖啡，经常在下午工作间隙购买咖啡</userInfo>
以下 <contextInfo> 是开发者的上下文信息，回答用户问题需要依赖这些数据，这些数据包含了小程序页面的 data, 页面的 innerText(页面中包含的文本内容)，开发者的智能体人设定义 。
<contextInfo>当前页面显示咖啡菜单，包含拿铁、美式、卡布奇诺等选项，页面数据包含价格和描述信息</contextInfo>
以下 <memorySummary> 是记忆库中存储的信息摘要。
<memorySummary>用户之前询问过拿铁咖啡的价格和口味，对咖啡品质有较高要求</memorySummary>

## 可用工具

[工具系统提示词内容...]
```

## 最佳实践

1. **身份定义**: 明确描述AI助手的角色和专业领域
2. **任务清晰**: 提供具体的任务目标和执行步骤
3. **上下文丰富**: 包含足够的上下文信息帮助AI理解场景
4. **工具集成**: 合理配置工具选项，避免信息过载
5. **格式一致**: 保持提示词格式的一致性和可读性

## 注意事项

- 上下文信息会自动截断到200字符，避免提示词过长
- 工具系统提示词会根据依赖关系动态生成
- 自定义前缀会添加到整个提示词的开头
- 建议根据实际需求调整各个配置选项
