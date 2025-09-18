# 记忆服务架构说明

## 概述

本文档说明了记忆功能的重构，将记忆相关的功能从 `AgentService` 中独立出来，创建了专门的 `MemoryService` 类。

## 架构变更

### 重构前
```
AgentService
├── 基本Agent管理方法
├── 聊天方法
├── 工具管理方法
└── 记忆管理方法 (混合在一起)
```

### 重构后
```
AgentService
├── 基本Agent管理方法
├── 聊天方法
├── 工具管理方法
└── 记忆管理方法 (委托给MemoryService)

MemoryService (独立)
├── 聊天历史管理
├── 会话管理
├── 记忆模式管理
├── 统计信息管理
└── 扩展功能 (导入/导出等)
```

## 文件结构

### 新增文件
- `src/services/memory.service.ts` - 独立的记忆服务
- `tests/test-memory-service.mts` - 记忆服务测试
- `docs/MEMORY_SERVICE_ARCHITECTURE.md` - 架构说明文档

### 修改文件
- `src/services/agent.service.ts` - 移除记忆方法，添加委托
- `src/routes/index.ts` - 更新API路由使用新的记忆服务

## 核心组件

### MemoryService 类

```typescript
export class MemoryService {
  private agents: Map<string, AgentBuilder>;

  constructor(agents: Map<string, AgentBuilder>) {
    this.agents = agents;
  }

  // 基本记忆管理
  async getChatHistory(agentId: string, threadId: string, limit?: number)
  async clearChatHistory(agentId: string, threadId: string)
  async getThreads(agentId: string)
  async setMemoryMode(agentId: string, mode: 'api' | 'lg')
  async getMemoryStats(agentId: string)

  // 扩展功能
  async deleteMessage(agentId: string, threadId: string, messageId: string)
  async getAllMemoryStats()
  async clearAllMemory()
  async exportChatHistory(agentId: string, threadId: string, format: 'json' | 'txt')
  async importChatHistory(agentId: string, threadId: string, historyData: ChatHistoryMessage[])
}
```

### AgentService 集成

```typescript
export class AgentService {
  private agents: Map<string, AgentBuilder> = new Map();
  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService(this.agents);
  }

  // 委托给记忆服务
  async getChatHistory(agentId: string, threadId: string, limit?: number) {
    return await this.memoryService.getChatHistory(agentId, threadId, limit);
  }

  // 其他记忆方法...
}
```

## API 路由更新

### 基本记忆管理 API
```http
GET    /api/memory/{agentId}/history/{threadId}?limit=10
DELETE /api/memory/{agentId}/history/{threadId}
GET    /api/memory/{agentId}/threads
POST   /api/memory/{agentId}/mode
GET    /api/memory/{agentId}/stats
```

### 扩展记忆管理 API
```http
DELETE /api/memory/{agentId}/history/{threadId}/message/{messageId}
GET    /api/memory/stats/all
DELETE /api/memory/clear-all
GET    /api/memory/{agentId}/history/{threadId}/export?format=json
POST   /api/memory/{agentId}/history/{threadId}/import
```

## 使用方式

### 直接使用 MemoryService

```typescript
import { MemoryService } from './services/memory.service';
import { AgentService } from './services/agent.service';

const agentService = new AgentService();
const memoryService = agentService.getMemoryService();

// 直接使用记忆服务
const history = await memoryService.getChatHistory('agent1', 'thread1');
const stats = await memoryService.getMemoryStats('agent1');
```

### 通过 AgentService 使用

```typescript
import { AgentService } from './services/agent.service';

const agentService = new AgentService();

// 通过AgentService委托
const history = await agentService.getChatHistory('agent1', 'thread1');
const stats = await agentService.getMemoryStats('agent1');
```

## 优势

### 1. 职责分离
- `AgentService` 专注于Agent的基本管理
- `MemoryService` 专注于记忆功能
- 代码更清晰，易于维护

### 2. 可扩展性
- 记忆服务可以独立扩展新功能
- 不影响Agent的基本功能
- 支持多种记忆策略

### 3. 可测试性
- 记忆功能可以独立测试
- 更容易进行单元测试
- 测试覆盖更全面

### 4. 可复用性
- 记忆服务可以被其他服务使用
- 支持多Agent实例管理
- 提供统一的记忆接口

## 扩展功能

### 新增的记忆管理功能

1. **消息删除**
   - 删除特定消息
   - 支持按消息ID删除

2. **批量操作**
   - 获取所有Agent的统计信息
   - 清空所有记忆

3. **导入导出**
   - 导出聊天历史为JSON或TXT格式
   - 导入聊天历史数据
   - 支持数据迁移

4. **统计信息**
   - 详细的记忆使用统计
   - 多Agent统计汇总

## 测试

### 运行测试

```bash
# 运行记忆服务测试
npx tsx tests/test-memory-service.mts

# 运行所有记忆功能测试
npx tsx tests/test-memory.mts
```

### 测试覆盖

- 基本记忆功能测试
- 错误处理测试
- 扩展功能测试
- API端点测试

## 迁移指南

### 从旧版本迁移

1. **代码更新**
   ```typescript
   // 旧方式
   const history = await agentService.getChatHistory(agentId, threadId);
   
   // 新方式 (仍然有效)
   const history = await agentService.getChatHistory(agentId, threadId);
   
   // 或者直接使用记忆服务
   const memoryService = agentService.getMemoryService();
   const history = await memoryService.getChatHistory(agentId, threadId);
   ```

2. **API调用**
   - 现有API保持不变
   - 新增了扩展API
   - 向后兼容

3. **配置更新**
   - 无需更改配置
   - 保持现有功能

## 最佳实践

### 1. 服务使用
- 优先使用 `AgentService` 的委托方法
- 需要高级功能时直接使用 `MemoryService`
- 保持API的一致性

### 2. 错误处理
- 所有方法都返回统一的响应格式
- 包含详细的错误信息
- 支持错误码分类

### 3. 性能优化
- 合理设置历史记录限制
- 定期清理不需要的记忆
- 使用批量操作提高效率

### 4. 监控和调试
- 使用统计API监控使用情况
- 记录详细的日志信息
- 支持导出数据进行分析

## 未来规划

### 短期目标
- 添加记忆压缩功能
- 实现记忆搜索
- 支持记忆分类

### 长期目标
- 支持分布式记忆存储
- 实现记忆同步
- 添加记忆分析功能

## 总结

通过将记忆功能独立为专门的服务，我们实现了：

1. **更好的代码组织** - 职责清晰，易于维护
2. **更强的扩展性** - 支持更多记忆相关功能
3. **更高的可测试性** - 独立的测试和验证
4. **更好的复用性** - 可以被其他组件使用

这种架构设计为未来的功能扩展和系统优化奠定了良好的基础。
