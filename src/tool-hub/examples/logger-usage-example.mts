// logger-usage-example.mts - 日志工具使用示例

import { 
  createLogger, 
  createToolHubLogger, 
  createToolRegistryLogger,
  Logger 
} from '../utils/logger';

/**
 * 示例：如何在不同的模块中使用日志工具
 */

// 1. 基本使用 - 创建自定义日志器
const myLogger = createLogger({
  prefix: 'MyModule',
  level: 'info',
  colorize: true
});

// 2. 在类中使用日志器
class MyService {
  private logger: Logger;

  constructor() {
    // 使用专用日志器
    this.logger = createLogger({
      prefix: 'MyService',
      level: 'debug'
    });
  }

  async processData(data: any) {
    this.logger.info('开始处理数据', { dataSize: JSON.stringify(data).length });
    
    try {
      // 模拟处理逻辑
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.debug('数据处理完成', { 
        processedAt: new Date().toISOString() 
      });
      
      return { success: true, data };
    } catch (error) {
      this.logger.error('数据处理失败', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}

// 3. 在工具中心相关模块中使用
class ToolManager {
  private hubLogger: Logger;
  private registryLogger: Logger;

  constructor() {
    // 使用预配置的日志器
    this.hubLogger = createToolHubLogger({ level: 'info' });
    this.registryLogger = createToolRegistryLogger({ level: 'debug' });
  }

  async registerTool(toolName: string) {
    this.registryLogger.debug('开始注册工具', { toolName });
    
    try {
      // 模拟注册逻辑
      await new Promise(resolve => setTimeout(resolve, 50));
      
      this.registryLogger.info('工具注册成功', { toolName });
      this.hubLogger.info('工具已添加到中心', { toolName });
      
    } catch (error) {
      this.registryLogger.error('工具注册失败', { 
        toolName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}

// 4. 使用子日志器和上下文
class RequestHandler {
  private logger: Logger;

  constructor() {
    this.logger = createLogger({
      prefix: 'RequestHandler',
      level: 'info'
    });
  }

  async handleRequest(requestId: string, userId: string) {
    // 创建带上下文的子日志器
    const contextLogger = this.logger.withContext({
      requestId,
      userId,
      timestamp: new Date().toISOString()
    });

    contextLogger.info('开始处理请求');
    
    try {
      // 模拟请求处理
      await new Promise(resolve => setTimeout(resolve, 200));
      
      contextLogger.info('请求处理完成', { 
        status: 'success',
        duration: '200ms'
      });
      
    } catch (error) {
      contextLogger.error('请求处理失败', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}

// 5. 演示不同的日志级别
function demonstrateLogLevels() {
  const logger = createLogger({
    prefix: 'LogLevelDemo',
    level: 'debug', // 显示所有级别的日志
    colorize: true
  });

  console.log('\n=== 日志级别演示 ===');
  
  logger.debug('这是调试信息 - 用于开发时的详细调试');
  logger.info('这是信息日志 - 用于记录一般信息');
  logger.warn('这是警告日志 - 用于记录需要注意的情况');
  logger.error('这是错误日志 - 用于记录错误信息');
}

// 6. 演示日志过滤
function demonstrateLogFiltering() {
  console.log('\n=== 日志过滤演示 ===');
  
  // 只显示 warn 及以上级别的日志
  const filteredLogger = createLogger({
    prefix: 'FilteredLogger',
    level: 'warn',
    colorize: true
  });

  console.log('设置日志级别为 warn，以下 debug 和 info 日志不会显示:');
  filteredLogger.debug('这条调试日志不会显示');
  filteredLogger.info('这条信息日志不会显示');
  filteredLogger.warn('这条警告日志会显示');
  filteredLogger.error('这条错误日志会显示');
}

// 7. 演示禁用日志
function demonstrateDisabledLogging() {
  console.log('\n=== 禁用日志演示 ===');
  
  const disabledLogger = createLogger({
    prefix: 'DisabledLogger',
    enabled: false,
    colorize: true
  });

  console.log('日志已禁用，以下所有日志都不会显示:');
  disabledLogger.debug('调试日志');
  disabledLogger.info('信息日志');
  disabledLogger.warn('警告日志');
  disabledLogger.error('错误日志');
}

// 运行示例
async function runExamples() {
  console.log('=== 日志工具使用示例 ===\n');

  // 基本使用
  myLogger.info('基本日志使用示例', { example: 'basic' });

  // 类中使用
  const service = new MyService();
  await service.processData({ test: 'data' });

  // 工具管理
  const toolManager = new ToolManager();
  await toolManager.registerTool('example-tool');

  // 请求处理
  const requestHandler = new RequestHandler();
  await requestHandler.handleRequest('req-123', 'user-456');

  // 演示不同功能
  demonstrateLogLevels();
  demonstrateLogFiltering();
  demonstrateDisabledLogging();

  console.log('\n=== 示例完成 ===');
}

// 如果直接运行此文件，则执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export {
  MyService,
  ToolManager,
  RequestHandler,
  demonstrateLogLevels,
  demonstrateLogFiltering,
  demonstrateDisabledLogging
};
