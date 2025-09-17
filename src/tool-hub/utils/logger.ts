// logger.ts - 通用日志工具

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  enabled?: boolean;
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colorize?: boolean;
}

export interface LogContext {
  [key: string]: any;
}

/**
 * 通用日志工具类
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private context: LogContext = {};

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enabled: true,
      level: 'info',
      prefix: 'Logger',
      timestamp: true,
      colorize: true,
      ...config
    };
  }

  /**
   * 设置日志上下文
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 清除日志上下文
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 记录调试日志
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * 记录信息日志
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * 记录错误日志
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * 记录日志的核心方法
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.config.enabled) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.level];
    const messageLevel = levels[level];

    if (messageLevel < configLevel) return;

    const timestamp = this.config.timestamp ? new Date().toISOString() : '';
    const prefix = this.config.prefix;
    const mergedContext = { ...this.context, ...context };

    let logMessage = this.formatMessage(level, prefix, timestamp, message, mergedContext);

    // 输出到控制台
    console[level](logMessage);
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(
    level: LogLevel,
    prefix: string,
    timestamp: string,
    message: string,
    context: LogContext
  ): string {
    const parts: string[] = [];

    // 添加时间戳
    if (timestamp) {
      parts.push(`[${timestamp}]`);
    }

    // 添加前缀和级别
    const levelStr = level.toUpperCase();
    if (this.config.colorize) {
      const colors = {
        debug: '\x1b[36m', // 青色
        info: '\x1b[32m',  // 绿色
        warn: '\x1b[33m',  // 黄色
        error: '\x1b[31m'  // 红色
      };
      const reset = '\x1b[0m';
      parts.push(`${colors[level]}[${prefix} ${levelStr}]${reset}`);
    } else {
      parts.push(`[${prefix} ${levelStr}]`);
    }

    // 添加消息
    parts.push(message);

    // 添加上下文信息
    if (Object.keys(context).length > 0) {
      parts.push(`\n  Context: ${JSON.stringify(context, null, 2)}`);
    }

    return parts.join(' ');
  }

  /**
   * 创建子日志器（继承配置和上下文）
   */
  child(prefix: string, context?: LogContext): Logger {
    const childLogger = new Logger({
      ...this.config,
      prefix: `${this.config.prefix}:${prefix}`
    });
    
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  /**
   * 创建带上下文的日志方法
   */
  withContext(context: LogContext) {
    return {
      debug: (message: string, extraContext?: LogContext) => 
        this.debug(message, { ...context, ...extraContext }),
      info: (message: string, extraContext?: LogContext) => 
        this.info(message, { ...context, ...extraContext }),
      warn: (message: string, extraContext?: LogContext) => 
        this.warn(message, { ...context, ...extraContext }),
      error: (message: string, extraContext?: LogContext) => 
        this.error(message, { ...context, ...extraContext })
    };
  }
}

/**
 * 创建默认日志器
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * 创建工具中心专用日志器
 */
export function createToolHubLogger(config?: LoggerConfig): Logger {
  return new Logger({
    prefix: 'ToolHub',
    level: 'info',
    ...config
  });
}

/**
 * 创建工具注册表专用日志器
 */
export function createToolRegistryLogger(config?: LoggerConfig): Logger {
  return new Logger({
    prefix: 'ToolRegistry',
    level: 'info',
    ...config
  });
}

/**
 * 创建工具执行器专用日志器
 */
export function createToolExecutorLogger(config?: LoggerConfig): Logger {
  return new Logger({
    prefix: 'ToolExecutor',
    level: 'info',
    ...config
  });
}

/**
 * 默认日志器实例
 */
export const defaultLogger = createLogger();
