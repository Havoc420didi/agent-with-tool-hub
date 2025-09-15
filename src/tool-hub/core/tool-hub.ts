// tool-hub.ts - ToolHub 主类

import { ToolRegistry } from './tool-registry';
import { ToolExecutor } from './tool-executor';
import {
  ToolConfig,
  ToolResult,
  ToolExecutionContext,
  ToolExecutionOptions,
  ToolExecutionResult,
  ToolHubConfig,
  ToolHubEvent,
  ToolHubEventType,
  ToolHubEventListener,
  ToolHubStatus,
  ToolSearchOptions,
  ToolSearchResult,
  ToolRegistrationResult,
  BatchToolRegistrationResult,
  ToolStats
} from '../types/index';

/**
 * ToolHub - 集中式工具管理中心
 */
export class ToolHub {
  private registry: ToolRegistry;
  private executor: ToolExecutor;
  private config: ToolHubConfig;
  private eventListeners: Map<ToolHubEventType, Set<ToolHubEventListener>> = new Map();
  private initialized: boolean = false;

  constructor(config: ToolHubConfig = {}) {
    this.config = {
      logging: true,
      logLevel: 'info',
      statistics: true,
      caching: true,
      cacheConfig: {
        ttl: 300000, // 5分钟
        maxSize: 1000
      },
      defaultExecutionOptions: {
        timeout: 30000, // 30秒
        retries: 0
      },
      validators: [],
      ...config
    };

    this.registry = new ToolRegistry(this.config.validators);
    this.executor = new ToolExecutor(this.config.caching ? this.config.cacheConfig : undefined);
    
    this.initialize();
  }

  /**
   * 初始化 ToolHub
   */
  private initialize(): void {
    this.initialized = true;
    this.emit('hub.initialized', { timestamp: new Date() });
    this.log('info', 'ToolHub 已初始化');
  }

  /**
   * 注册工具
   */
  register(config: ToolConfig): ToolRegistrationResult {
    const result = this.registry.register(config);
    
    if (result.success) {
      this.emit('tool.registered', {
        toolName: config.name,
        config,
        timestamp: new Date()
      });
      this.log('info', `工具 "${config.name}" 注册成功`);
    } else {
      this.log('error', `工具 "${config.name}" 注册失败: ${result.error}`);
    }

    return result;
  }

  /**
   * 批量注册工具
   */
  registerBatch(configs: ToolConfig[]): BatchToolRegistrationResult {
    const result = this.registry.registerBatch(configs);
    
    this.log('info', `批量注册完成: 成功 ${result.success} 个，失败 ${result.failed} 个`);
    
    // 为成功注册的工具发送事件
    result.results.forEach(regResult => {
      if (regResult.success) {
        const config = configs.find(c => c.name === regResult.toolName);
        if (config) {
          this.emit('tool.registered', {
            toolName: config.name,
            config,
            timestamp: new Date()
          });
        }
      }
    });

    return result;
  }

  /**
   * 注销工具
   */
  unregister(name: string): boolean {
    const success = this.registry.unregister(name);
    
    if (success) {
      this.emit('tool.unregistered', {
        toolName: name,
        timestamp: new Date()
      });
      this.log('info', `工具 "${name}" 已注销`);
    } else {
      this.log('warn', `工具 "${name}" 不存在`);
    }

    return success;
  }

  /**
   * 执行工具
   */
  async execute(
    name: string, 
    input: any, 
    options: ToolExecutionOptions = {},
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.registry.get(name);
    if (!tool) {
      const result: ToolExecutionResult = {
        success: false,
        error: `工具 "${name}" 不存在`,
        executionTime: 0,
        toolName: name,
        context
      };
      
      this.emit('tool.failed', {
        toolName: name,
        error: result.error,
        timestamp: new Date(),
        context
      });
      
      return result;
    }

    // 合并执行选项
    const executionOptions: ToolExecutionOptions = {
      ...this.config.defaultExecutionOptions,
      ...options,
      context: context || options.context
    };

    try {
      const result = await this.executor.execute(tool, input, executionOptions);
      
      // 更新使用统计
      this.registry.updateUsage(name);
      
      if (result.success) {
        this.emit('tool.executed', {
          toolName: name,
          result,
          timestamp: new Date(),
          context: executionOptions.context
        });
        this.log('debug', `工具 "${name}" 执行成功`);
      } else {
        this.emit('tool.failed', {
          toolName: name,
          error: result.error,
          timestamp: new Date(),
          context: executionOptions.context
        });
        this.log('error', `工具 "${name}" 执行失败: ${result.error}`);
      }

      return result;
    } catch (error) {
      const result: ToolExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
        toolName: name,
        context: executionOptions.context
      };

      this.emit('tool.failed', {
        toolName: name,
        error: result.error,
        timestamp: new Date(),
        context: executionOptions.context
      });

      this.log('error', `工具 "${name}" 执行异常: ${result.error}`);
      return result;
    }
  }

  /**
   * 获取工具配置
   */
  get(name: string): ToolConfig | undefined {
    return this.registry.get(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): ToolConfig[] {
    return this.registry.getAll();
  }

  /**
   * 获取启用的工具
   */
  getEnabled(): ToolConfig[] {
    return this.registry.getEnabled();
  }

  /**
   * 搜索工具
   */
  search(options: ToolSearchOptions = {}): ToolSearchResult {
    return this.registry.search(options);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * 获取工具数量
   */
  size(): number {
    return this.registry.size();
  }

  /**
   * 获取工具统计信息
   */
  getStats(): ToolStats {
    return this.registry.getStats();
  }

  /**
   * 获取 ToolHub 状态
   */
  getStatus(): ToolHubStatus {
    return {
      initialized: this.initialized,
      totalTools: this.registry.size(),
      enabledTools: this.registry.getEnabled().length,
      lastUpdated: new Date(),
      config: this.config
    };
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.registry.clear();
    this.executor.clearCache();
    
    this.emit('hub.cleared', {
      timestamp: new Date()
    });
    
    this.log('info', '所有工具已清空');
  }

  /**
   * 添加事件监听器
   */
  on(eventType: ToolHubEventType, listener: ToolHubEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(eventType: ToolHubEventType, listener: ToolHubEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 发送事件
   */
  private emit(eventType: ToolHubEventType, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const event: ToolHubEvent = {
        type: eventType,
        timestamp: new Date(),
        data
      };

      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          this.log('error', `事件监听器执行失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
  }

  /**
   * 日志记录
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.logging) return;
    
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel || 'info'];
    const messageLevel = levels[level];
    
    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console[level](`[ToolHub ${level.toUpperCase()}] ${timestamp}: ${message}`);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ToolHubConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 更新执行器缓存配置
    if (newConfig.cacheConfig) {
      this.executor.updateCacheConfig(newConfig.cacheConfig);
    }
    
    this.log('info', '配置已更新');
  }

  /**
   * 获取配置
   */
  getConfig(): ToolHubConfig {
    return { ...this.config };
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.executor.getCacheStats();
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.executor.clearCache();
    this.log('info', '缓存已清空');
  }

  /**
   * 获取工具注册表（用于高级操作）
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }

  /**
   * 获取工具执行器（用于高级操作）
   */
  getExecutor(): ToolExecutor {
    return this.executor;
  }
}
