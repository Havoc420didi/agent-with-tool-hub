# 模型配置指南

## 概述

本项目支持多模型配置，可以通过 `config.env` 文件轻松配置不同的 AI 模型提供商和模型。

## 配置文件格式

### config.env 文件结构

```env
# API 配置

## deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL_NAMES=deepseek-chat

## qwen
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_API_KEY=your-qwen-api-key
QWEN_MODEL_NAMES=qwen-plus,qwen3-coder-plus,qwen3-coder-flash

# Tavily
TAVILY_API_KEY=your-tavily-api-key

# 服务器配置
API_BASE_URL=http://localhost:3000
```

### 配置说明

#### 模型配置格式

每个提供商需要以下配置：

- `{PROVIDER}_API_KEY`: API 密钥
- `{PROVIDER}_BASE_URL`: API 基础地址
- `{PROVIDER}_MODEL_NAMES`: 模型名称列表（逗号分隔）

#### 支持的提供商

1. **DeepSeek**
   - API 地址: `https://api.deepseek.com`
   - 模型示例: `deepseek-chat`

2. **Qwen (通义千问)**
   - API 地址: `https://dashscope.aliyuncs.com/compatible-mode/v1`
   - 模型示例: `qwen-plus`, `qwen3-coder-plus`, `qwen3-coder-flash`

3. **OpenAI** (可选)
   - API 地址: `https://api.openai.com/v1`
   - 模型示例: `gpt-4`, `gpt-3.5-turbo`

## 使用方法

### 1. 配置环境变量

编辑 `config.env` 文件，添加你的 API 密钥和模型配置。

### 2. 运行测试

```bash
# 测试配置加载
npm run test:config

# 运行交互式聊天测试
npm run test:chat
```

### 3. CLI 命令

在交互式聊天中，你可以使用以下命令管理模型：

#### 模型相关命令

- `/models` - 显示所有可用模型
- `/model-switch <名称或编号>` - 切换模型
- `/model-validate` - 验证模型配置
- `/config` - 显示当前配置

#### 示例

```bash
# 查看所有模型
/models

# 切换到 qwen-plus 模型
/model-switch qwen-plus

# 或使用编号切换
/model-switch 2

# 验证配置
/model-validate
```

## 配置验证

系统会自动验证配置的正确性：

### 验证规则

1. **API 密钥**: 不能为空
2. **API 地址**: 必须是有效的 URL
3. **模型名称**: 不能为空
4. **温度值**: 必须在 0-1 之间
5. **最大令牌数**: 必须大于 0

### 错误处理

如果配置有错误，系统会显示详细的错误信息：

```
❌ 发现配置错误:
  deepseek-deepseek-chat:
    - API密钥不能为空
    - API地址不能为空
```

## 扩展配置

### 添加新的提供商

1. 在 `config.env` 中添加提供商配置
2. 在 `src/config/model-config.ts` 中添加提供商加载逻辑
3. 重新启动应用

### 示例：添加 OpenAI 支持

```env
# config.env
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_NAMES=gpt-4,gpt-3.5-turbo
```

## 故障排除

### 常见问题

1. **模型加载失败**
   - 检查 API 密钥是否正确
   - 检查 API 地址是否可访问
   - 检查模型名称是否正确

2. **配置验证失败**
   - 运行 `/model-validate` 查看详细错误
   - 检查环境变量格式是否正确

3. **模型切换失败**
   - 确认模型名称或编号正确
   - 使用 `/models` 查看可用模型列表

### 调试模式

启用详细日志输出：

```bash
DEBUG=model-config npm run test:chat
```

## 最佳实践

1. **安全性**
   - 不要将 API 密钥提交到版本控制
   - 使用环境变量或配置文件管理密钥

2. **性能**
   - 根据需求选择合适的模型
   - 调整温度和最大令牌数参数

3. **维护性**
   - 定期验证配置
   - 保持配置文件整洁有序

## API 参考

### ModelConfigManager

```typescript
// 获取所有模型
const models = modelConfigManager.getAllModels();

// 获取当前模型
const current = modelConfigManager.getCurrentModel();

// 切换模型
modelConfigManager.switchToModel('qwen-plus');

// 验证配置
const validation = modelConfigManager.validateAllModels();
```

### ModelConfig 接口

```typescript
interface ModelConfig {
  name: string;           // 模型名称
  provider: string;       // 提供商
  apiKey: string;         // API 密钥
  baseURL: string;        // API 地址
  temperature: number;    // 温度值
  maxTokens?: number;     // 最大令牌数
  description?: string;   // 描述
}
```
