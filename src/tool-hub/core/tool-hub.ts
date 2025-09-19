// tool-hub.ts - ToolHub 主类

import { EnhancedToolRegistry } from './tool-registry';
import { ToolExecutor } from './tool-executor';
import { createToolHubLogger, Logger } from '../utils/logger';
import { LangChainToolDefineAdapter } from '../adapters/tool-define/langchain-adapter';
import { GenericToolDefineAdapter, OpenAIToolDefineAdapter } from '../adapters/tool-define/generic-adapter';
import { ToolExecutorFactory } from '../adapters/tool-exec';
import {
  ToolConfig,
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
  AdapterConfig,
  ToolDefineFrameworkAdapter,
  ToolConversionOptions,
  ToolExecutorConfig,
  ToolExecutionContext,
} from '../types/index';

/**
 * ToolHub - 集中式工具管理中心
 */
export class ToolHub {
  private registry: EnhancedToolRegistry;  // 增强的工具注册表（集成依赖管理）
  private executor: ToolExecutor;  // 工具执行器；internal 模式下可用
  private config: ToolHubConfig;
  private eventListeners: Map<ToolHubEventType, Set<ToolHubEventListener>> = new Map();
  private initialized: boolean = false;
  private logger: Logger;
  
  // 适配器管理
  private adapters: Map<string, ToolDefineFrameworkAdapter> = new Map();
  private defaultAdapter: string = 'langchain';

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

    // 初始化日志器
    this.logger = createToolHubLogger({
      enabled: this.config.logging,
      level: this.config.logLevel
    });

    this.registry = new EnhancedToolRegistry(this.config.validators);
    this.executor = new ToolExecutor(this.config.caching ? this.config.cacheConfig : undefined);
    
    // 初始化默认适配器
    this.initializeAdapters();
    
    this.initialize();
  }

  /**
   * 初始化适配器
   */
  private initializeAdapters(): void {
    // 注册默认适配器
    this.registerAdapter('langchain', new LangChainToolDefineAdapter());
    this.registerAdapter('generic', new GenericToolDefineAdapter());
    this.registerAdapter('openai', new OpenAIToolDefineAdapter());
  }

  /**
   * 初始化 ToolHub
   */
  private initialize(): void {
    this.initialized = true;
    this.emit('hub.initialized', { timestamp: new Date() });
    this.logger.info('ToolHub 已初始化');
  }

  /**
   * 注册工具（支持依赖关系）
   */
  register(config: ToolConfig): ToolRegistrationResult {
    const result = this.registry.register(config);
    
    if (result.success) {
      this.emit('tool.registered', {
        toolName: config.name,
        config,
        dependencyGroups: config.dependencyGroups || [],
        timestamp: new Date()
      });
      this.logger.info(`工具 "${config.name}" 注册成功`, { toolName: config.name });
    } else {
      this.logger.error(`工具 "${config.name}" 注册失败: ${result.error}`, { 
        toolName: config.name, 
        error: result.error 
      });
    }

    return result;
  }

  /**
   * 批量注册工具（支持依赖关系）
   */
  registerBatch(configs: ToolConfig[]): BatchToolRegistrationResult {
    const result = this.registry.registerBatch(configs);
    
    this.logger.info(`批量注册完成: 成功 ${result.success} 个，失败 ${result.failed} 个`, {
      success: result.success,
      failed: result.failed,
      total: result.total
    });
    
    // 输出失败的工具详细信息
    if (result.failed > 0) {
      this.logger.error('部分工具注册失败', { failedCount: result.failed });
      result.results.forEach(regResult => {
        if (!regResult.success) {
          this.logger.error(`工具注册失败: ${regResult.toolName}`, {
            toolName: regResult.toolName,
            error: regResult.error
          });
        }
      });
    }

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
      this.logger.info(`工具 "${name}" 已注销`, { toolName: name });
    } else {
      this.logger.warn(`工具 "${name}" 不存在`, { toolName: name });
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
      
      // 记录工具执行到注册表
      if (result.success && executionOptions.context) {
        this.registry.recordToolExecution(name, executionOptions.context);
      }
      
      if (result.success) {
        this.emit('tool.executed', {
          toolName: name,
          result,
          timestamp: new Date(),
          context: executionOptions.context
        });
        this.logger.debug(`工具 "${name}" 执行成功`, { 
          toolName: name, 
          executionTime: result.executionTime 
        });
      } else {
        this.emit('tool.failed', {
          toolName: name,
          error: result.error,
          timestamp: new Date(),
          context: executionOptions.context
        });
        this.logger.error(`工具 "${name}" 执行失败: ${result.error}`, { 
          toolName: name, 
          error: result.error 
        });
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

      this.logger.error(`工具 "${name}" 执行异常: ${result.error}`, { 
        toolName: name, 
        error: result.error 
      });
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
   * 搜索工具（支持可用性过滤）
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
    
    this.logger.info('所有工具已清空');
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
          this.logger.error(`事件监听器执行失败: ${error instanceof Error ? error.message : String(error)}`, {
            eventType,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
    }
  }

  /**
   * 对外发布事件（公开方法）
   */
  public publish(eventType: ToolHubEventType, data: any): void {
    this.emit(eventType, data);
  }


  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ToolHubConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 更新日志器配置
    if (newConfig.logging !== undefined || newConfig.logLevel !== undefined) {
      this.logger.updateConfig({
        enabled: newConfig.logging,
        level: newConfig.logLevel
      });
    }
    
    // 更新执行器缓存配置
    if (newConfig.cacheConfig) {
      this.executor.updateCacheConfig(newConfig.cacheConfig);
    }
    
    this.logger.info('配置已更新', { updatedFields: Object.keys(newConfig) });
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
    this.logger.info('缓存已清空');
  }

  /**
   * 获取工具注册表（用于高级操作）
   */
  getRegistry(): EnhancedToolRegistry {
    return this.registry;
  }

  /**
   * 获取工具执行器（用于高级操作）
   */
  getExecutor(): ToolExecutor {
    return this.executor;
  }

  // ==================== 适配器管理 ====================

  /**
   * 注册适配器
   */
  registerAdapter(name: string, adapter: ToolDefineFrameworkAdapter): void {
    this.adapters.set(name, adapter);
    this.logger.info(`适配器 "${name}" 已注册`);
  }

  /**
   * 获取适配器
   */
  getAdapter(name: string): ToolDefineFrameworkAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * 获取所有适配器
   */
  getAdapters(): Map<string, ToolDefineFrameworkAdapter> {
    return new Map(this.adapters);
  }

  /**
   * 设置默认适配器
   */
  setDefaultAdapter(name: string): boolean {
    if (this.adapters.has(name)) {
      this.defaultAdapter = name;
      this.logger.info(`默认适配器已设置为 "${name}"`, { adapterName: name });
      return true;
    }
    this.logger.warn(`适配器 "${name}" 不存在`, { adapterName: name });
    return false;
  }

  /**
   * 获取默认适配器
   */
  getDefaultAdapter(): ToolDefineFrameworkAdapter | undefined {
    return this.adapters.get(this.defaultAdapter);
  }

  // ==================== 工具导出功能 ====================

  /**
   * 导出工具为指定格式
   */
  exportTools(format: string = 'langchain', options: ToolConversionOptions = {}): any[] {
    const adapter = this.adapters.get(format);
    if (!adapter) {
      throw new Error(`不支持的导出格式: ${format}`);
    }

    const tools = this.registry.getEnabled();
    const convertedTools = adapter.convertTools(tools);
    
    return convertedTools;
  }

  /**
   * 导出单个工具为指定格式
   */
  exportTool(toolName: string, format: string = 'langchain', options: ToolConversionOptions = {}): any | null {
    const tool = this.registry.get(toolName);
    if (!tool) {
      this.logger.warn(`工具 "${toolName}" 不存在`, { toolName });
      return null;
    }

    const adapter = this.adapters.get(format);
    if (!adapter) {
      throw new Error(`不支持的导出格式: ${format}`);
    }

    const convertedTool = adapter.convertTool(tool);

    return convertedTool;
  }

  /**
   * 获取支持的导出格式
   */
  getSupportedFormats(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 验证导出格式
   */
  isFormatSupported(format: string): boolean {
    return this.adapters.has(format);
  }

  // ==================== 「工具执行器」导出功能 ====================

  /**
   * 导出工具执行器
   */
  exportToolExecutor(framework: string = 'langchain', config?: ToolExecutorConfig): any {
    try {
      // 获取启用的工具并转换为指定框架格式
      const tools = this.exportTools(framework);
      
      if (tools.length === 0) {
        this.logger.warn('没有可用的工具来创建执行器', { framework });
        return null;
      }

      // 创建执行器
      const executor = ToolExecutorFactory.createExecutor(framework, this, tools, config);
      
      this.logger.info(`工具执行器已导出: ${framework}`, { 
        framework, 
        toolCount: tools.length 
      });
      
      this.emit('tool.executor.exported', {
        framework,
        toolCount: tools.length,
        timestamp: new Date()
      });

      return executor;
    } catch (error) {
      this.logger.error(`导出工具执行器失败: ${error instanceof Error ? error.message : String(error)}`, {
        framework,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 获取支持的工具执行器框架
   */
  getSupportedExecutorFrameworks(): string[] {
    try {
      return ToolExecutorFactory.getSupportedFrameworks();
    } catch (error) {
      this.logger.warn('无法获取支持的执行器框架', { error });
      return [];
    }
  }

  /**
   * 检查执行器框架是否支持
   */
  isExecutorFrameworkSupported(framework: string): boolean {
    try {
      return ToolExecutorFactory.isFrameworkSupported(framework);
    } catch (error) {
      this.logger.warn('无法检查执行器框架支持', { error });
      return false;
    }
  }

  // ==================== 工具依赖管理 ====================

  /**
   * 获取当前可用的工具（基于依赖关系）
   */
  getAvailableTools(): ToolConfig[] {
    return this.registry.getAvailableTools();
  }

  /**
   * 获取工具可用性状态
   */
  getToolAvailabilityStatus(toolName: string) {
    return this.registry.getToolAvailabilityStatus(toolName);
  }

  /**
   * 获取所有工具可用性状态
   */
  getAllToolAvailabilityStatus() {
    return this.registry.getAllToolAvailabilityStatus();
  }

  /**
   * 获取工具依赖图
   */
  getDependencyGraph() {
    return this.registry.getDependencyGraph();
  }

  /**
   * 获取工具执行路径建议
   */
  getExecutionPathSuggestion(targetTool: string): string[] {
    return this.registry.getExecutionPathSuggestion(targetTool);
  }

  /**
   * 重置工具执行状态
   */
  resetToolExecution(toolName: string): void {
    this.registry.resetToolExecution(toolName);
    this.logger.info(`工具 "${toolName}" 执行状态已重置`);
  }

  /**
   * 重置所有工具执行状态
   */
  resetAllToolExecution(): void {
    this.registry.resetAllToolExecution();
    this.logger.info('所有工具执行状态已重置');
  }

  /**
   * 获取工具统计信息
   */
  getToolStatistics() {
    return this.registry.getToolStatistics();
  }

  /**
   * 导出可用工具为指定格式（基于依赖关系）
   */
  exportAvailableTools(format: string = 'langchain', options: ToolConversionOptions = {}): any[] {
    const adapter = this.adapters.get(format);
    if (!adapter) {
      throw new Error(`不支持的导出格式: ${format}`);
    }

    const availableTools = this.getAvailableTools();
    const convertedTools = adapter.convertTools(availableTools);
    
    this.logger.info(`导出可用工具: ${format}`, { 
      format, 
      toolCount: availableTools.length 
    });
    
    return convertedTools;
  }

  /**
   * 导出可用工具执行器（基于依赖关系）
   */
  exportAvailableToolExecutor(framework: string = 'langchain', config?: ToolExecutorConfig): any {
    try {
      // 获取可用的工具并转换为指定框架格式
      const tools = this.exportAvailableTools(framework);
      
      if (tools.length === 0) {
        this.logger.warn('没有可用的工具来创建执行器', { framework });
        return null;
      }

      // 创建执行器
      const executor = ToolExecutorFactory.createExecutor(framework, this, tools, config);
      
      this.logger.info(`可用工具执行器已导出: ${framework}`, { 
        framework, 
        toolCount: tools.length 
      });
      
      this.emit('tool.executor.exported', {
        framework,
        toolCount: tools.length,
        timestamp: new Date(),
        type: 'available_tools'
      });

      return executor;
    } catch (error) {
      this.logger.error(`导出可用工具执行器失败: ${error instanceof Error ? error.message : String(error)}`, {
        framework,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
