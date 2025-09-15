# 测试文件说明

本目录包含 langgraph-agent 项目的所有测试文件。

## 测试文件列表

### 1. test-tool-hub.mts
**ToolHub 基础功能测试**
- 测试 ToolHub 的核心功能
- 包括工具注册、搜索、执行等基础功能
- 测试与 Agent 的集成

### 2. test-simple-tool-hub.mts
**ToolHub 简化功能测试**
- 测试 ToolHub 的完整功能
- 包括所有预设工具（常用、API、系统工具）
- 测试工具搜索、执行、统计、事件监听等功能

### 3. test-agent-integration.mts
**Agent 集成测试**
- 测试 ToolHub 与 Agent 的集成功能
- 验证 Agent 能够正确使用 ToolHub 提供的工具

### 4. run-tests.mts
**测试运行脚本**
- 自动运行所有测试文件
- 提供测试结果汇总

### 5. TOOL_HUB_TEST_REPORT.md
**测试报告**
- 详细的测试结果报告
- 包含性能数据和功能验证结果

## 运行测试

### 运行单个测试
```bash
# 在项目根目录运行
npx tsx tests/test-simple-tool-hub.mts
npx tsx tests/test-tool-hub.mts
npx tsx tests/test-agent-integration.mts
```

### 运行所有测试
```bash
# 在项目根目录运行
npx tsx tests/run-tests.mts
```

### 使用 npm 脚本
```bash
# 在项目根目录运行
npm run test
```

## 测试环境要求

- Node.js 环境
- 已安装项目依赖 (`npm install`)
- 环境变量配置 (config.env)

## 测试覆盖范围

### ToolHub 功能测试
- ✅ 工具注册和注销
- ✅ 工具搜索（按分类、标签、描述）
- ✅ 工具执行
- ✅ 工具统计和监控
- ✅ 缓存功能
- ✅ 事件监听

### 预设工具测试
- ✅ 常用工具（5个）：时间、计算、字符串、随机数、验证
- ✅ API 工具（5个）：HTTP请求、天气、翻译、新闻、股票
- ✅ 系统工具（5个）：系统信息、文件操作、环境变量、日志、进程管理

### Agent 集成测试
- ✅ Agent 创建和配置
- ✅ 工具集成
- ✅ 聊天功能
- ✅ 流式处理

## 测试结果

所有测试均通过，ToolHub 在没有 `tool-call-relation` 的情况下能够完美地全量提供工具给 Agent 使用。

详细测试结果请参考 [TOOL_HUB_TEST_REPORT.md](./TOOL_HUB_TEST_REPORT.md)。
