# 工具中心工具函数

这个目录包含了工具中心的各种实用工具函数。

## 日志工具 (logger.ts)

通用的日志工具，支持多种日志级别、上下文信息、颜色输出等功能。

### 基本使用

```typescript
import { createLogger } from '../utils/logger';

// 创建基本日志器
const logger = createLogger({
  prefix: 'MyModule',
  level: 'info',
  colorize: true
});

// 记录日志
logger.info('这是一条信息日志', { userId: 123 });
logger.error('这是一条错误日志', { error: 'something went wrong' });
```

### 预配置的日志器

```typescript
import { 
  createToolHubLogger, 
  createToolRegistryLogger,
  createToolExecutorLogger 
} from '../utils/logger';

// 使用预配置的日志器
const hubLogger = createToolHubLogger({ level: 'info' });
const registryLogger = createToolRegistryLogger({ level: 'debug' });
const executorLogger = createToolExecutorLogger({ level: 'warn' });
```

### 在类中使用

```typescript
import { Logger, createLogger } from '../utils/logger';

class MyService {
  private logger: Logger;

  constructor() {
    this.logger = createLogger({
      prefix: 'MyService',
      level: 'debug'
    });
  }

  async processData(data: any) {
    this.logger.info('开始处理数据', { dataSize: data.length });
    
    try {
      // 处理逻辑
      this.logger.debug('数据处理完成');
    } catch (error) {
      this.logger.error('数据处理失败', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}
```

### 子日志器和上下文

```typescript
// 创建子日志器
const childLogger = logger.child('ChildModule', { moduleId: 'child-001' });
childLogger.info('子模块日志');

// 使用带上下文的日志方法
const contextLogger = logger.withContext({ 
  requestId: 'req-123', 
  userId: 'user-456' 
});

contextLogger.info('带上下文的日志', { action: 'test' });
```

### 配置选项

```typescript
interface LoggerConfig {
  enabled?: boolean;        // 是否启用日志，默认 true
  level?: LogLevel;         // 日志级别，默认 'info'
  prefix?: string;          // 日志前缀，默认 'Logger'
  timestamp?: boolean;      // 是否显示时间戳，默认 true
  colorize?: boolean;       // 是否使用颜色，默认 true
}
```

### 日志级别

- `debug`: 调试信息，用于开发时的详细调试
- `info`: 一般信息，用于记录程序运行状态
- `warn`: 警告信息，用于记录需要注意的情况
- `error`: 错误信息，用于记录错误和异常

### 特性

- ✅ 支持多种日志级别
- ✅ 支持上下文信息
- ✅ 支持颜色输出
- ✅ 支持时间戳
- ✅ 支持日志过滤
- ✅ 支持子日志器
- ✅ 支持禁用日志
- ✅ 支持预配置的专用日志器

## 其他工具

- `validation.ts`: 工具配置验证
- `conversion.ts`: 数据转换工具
- `helpers.ts`: 辅助函数
