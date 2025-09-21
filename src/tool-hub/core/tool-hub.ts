// tool-hub.ts - ToolHub 主类

import { ToolRegistry } from './tool-registry';
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
  ToolDefineFrameworkAdapter,
  ToolConversionOptions,
  ToolExecutorConfig,
  ToolExecutionContext,
  ToolStatus,
  ToolStatusInfo,
  ToolStatusManagementConfig,
} from '../types/index';

/**
 * ToolHub - 集中式工具管理中心
 */
export class ToolHub {
  private registry: ToolRegistry;  // 增强的工具注册表（集成依赖管理）
  private executor: ToolExecutor;  // 工具执行器；internal 模式下可用
  private config: ToolHubConfig;
  private eventListeners: Map<ToolHubEventType, Set<ToolHubEventListener>> = new Map();
  private initialized: boolean = false;
  private logger: Logger;
  
  // 适配器管理
  private adapters: Map<string, ToolDefineFrameworkAdapter> = new Map();
  private defaultAdapter: string = 'langchain';
  
  // 工具状态管理
  private toolStatuses: Map<string, ToolStatusInfo> = new Map();
  private statusManagementConfig: ToolStatusManagementConfig;

  constructor(config: ToolHubConfig = {}) {
    this.config = {
      logging: true,
      logLevel: 'debug',
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

    // 初始化状态管理配置
    this.statusManagementConfig = {
      enabled: true,
      failureThreshold: 3,
      failureDuration: 300000, // 5分钟
      autoRebind: true,
      rebindDelay: 10000 // 10秒
    };

    // 初始化日志器
    this.logger = createToolHubLogger({
      enabled: this.config.logging,
      level: this.config.logLevel
    });

    this.registry = new ToolRegistry(this.config.validators);
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
      // 移除了冗余的工具注册事件发送
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
    
    this.logger.info(`批量注册完成: 成功 ${result.success} 个，失败 ${result.failed} 个`);
    
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
   * 获取所有工具
   */
  getAll(): ToolConfig[] {
    return this.registry.getAll();
  }

  /**
   * 获取启用的工具（已废弃，请使用 getAvailableTools）
   * @deprecated 使用 getAvailableTools() 替代，该方法只返回配置中启用的工具，不考虑依赖关系
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
      availableTools: this.registry.getAvailableTools().length,
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
  getRegistry(): ToolRegistry {
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
   * 导出工具为指定格式（基于依赖关系的可用工具）
   */
  exportTools(format: string = 'langchain', options: ToolConversionOptions = {}): any[] {
    const adapter = this.adapters.get(format);
    if (!adapter) {
      throw new Error(`不支持的导出格式: ${format}`);
    }

    const tools = this.registry.getAvailableTools();
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
   * 导出工具执行器（基于依赖关系的可用工具）
   */
  exportToolExecutor(framework: string = 'langchain', config?: ToolExecutorConfig): any {
    try {
      // 获取可用的工具并转换为指定框架格式
      const tools = this.exportTools(framework);
      
      if (tools.length === 0) {
        this.logger.warn('没有可用的工具来创建执行器', { framework });
        return null;
      }

      // 创建执行器
      const executor = ToolExecutorFactory.createExecutor(framework, this, tools, config);
      
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
   * 这是推荐的工具获取方法，只返回依赖关系满足的工具
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

  // ==================== 工具状态管理 ====================

  /**
   * 更新工具状态
   * @TODO 后面这里 success 或许会适配为更多状态的枚举值
   */
  public updateToolStatus(toolName: string, success: boolean, resultOrError?: any, context?: ToolExecutionContext): void {
    if (!this.statusManagementConfig.enabled) return;

    const currentStatus = this.toolStatuses.get(toolName);
    const now = new Date();

    if (success) {
      // 执行成功，重置状态
      const newStatus: ToolStatusInfo = {
        toolName,
        status: ToolStatus.AVAILABLE,
        lastUpdated: now,
        consecutiveFailures: 0,
        lastSuccessTime: now,
        shouldRebind: false,
        reason: '执行成功'
      };
      
      this.toolStatuses.set(toolName, newStatus);
      
      // 记录工具执行到注册表，这会更新依赖工具的可用性
      const executionContext = context || {
        executionId: `exec_${Date.now()}`,
        sessionId: 'system',
        threadId: 'system',
        metadata: { source: 'status_manager' }
      };
      this.registry.recordToolExecution(toolName, executionContext);
      
      this.logger.debug(`工具 "${toolName}" 状态重置为可用，依赖工具可用性已更新`);
      
    } else {
      // 执行失败，更新失败计数
      const newConsecutiveFailures = (currentStatus?.consecutiveFailures || 0) + 1;
      const failureThreshold = this.statusManagementConfig.failureThreshold;
      
      let newStatus: ToolStatusInfo;
      
      if (newConsecutiveFailures >= failureThreshold) {
        // 超过失败阈值，标记为失败状态
        newStatus = {
          toolName,
          status: ToolStatus.FAILED,
          lastUpdated: now,
          consecutiveFailures: newConsecutiveFailures,
          lastFailureTime: now,
          shouldRebind: true,
          reason: `连续失败 ${newConsecutiveFailures} 次`
        };
        
        this.logger.warn(`工具 "${toolName}" 标记为失败状态，连续失败 ${newConsecutiveFailures} 次`);
        
        // 如果需要自动重新绑定，安排重新绑定
        if (this.statusManagementConfig.autoRebind) {
          this.scheduleToolRebind();
        }
        
      } else {
        // 未超过阈值，保持可用状态但增加失败计数
        newStatus = {
          toolName,
          status: ToolStatus.AVAILABLE,
          lastUpdated: now,
          consecutiveFailures: newConsecutiveFailures,
          lastFailureTime: now,
          shouldRebind: false,
          reason: `失败 ${newConsecutiveFailures}/${failureThreshold} 次`
        };
        
        this.logger.debug(`工具 "${toolName}" 失败计数增加: ${newConsecutiveFailures}/${failureThreshold}`);
      }
      
      this.toolStatuses.set(toolName, newStatus);
    }

    // 更新工具注册表中的可用性状态
    this.updateToolAvailabilityInRegistry(toolName);
  }

  /**
   * 更新工具注册表中的可用性状态
   */
  private updateToolAvailabilityInRegistry(toolName: string): void {
    const status = this.toolStatuses.get(toolName);
    if (status) {
      // 根据工具状态更新注册表中的可用性
      const isAvailable = status.status === ToolStatus.AVAILABLE;
      
      // 这里可以调用 registry 的方法来更新工具可用性
      // 由于 registry 目前没有直接的状态更新方法，我们通过事件通知
      this.emit('tool.availability.changed', {
        toolName,
        available: isAvailable,
        reason: status.reason,
        timestamp: new Date()
      });
    }
  }

  /**
   * 安排工具重新绑定
   */
  private scheduleToolRebind(): void {
    // 延迟重新绑定，避免频繁操作
    setTimeout(() => {
      this.performToolRebind();
    }, this.statusManagementConfig.rebindDelay);
  }

  /**
   * 执行工具重新绑定
   */
  private performToolRebind(): void {
    try {
      // 重置失败状态的工具
      this.resetFailedTools();
      
      // 发送重新绑定事件
      this.emit('tool.rebind.required', {
        timestamp: new Date(),
        reason: '工具状态变化需要重新绑定'
      });
      
      this.logger.info('工具重新绑定已安排');
      
    } catch (error) {
      this.logger.error(`工具重新绑定失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 重置失败状态的工具
   */
  private resetFailedTools(): void {
    const now = new Date();
    const failureDuration = this.statusManagementConfig.failureDuration;
    
    for (const [toolName, status] of this.toolStatuses.entries()) {
      if (status.status === ToolStatus.FAILED && status.lastFailureTime) {
        const timeSinceFailure = now.getTime() - status.lastFailureTime.getTime();
        
        if (timeSinceFailure >= failureDuration) {
          // 重置为可用状态
          this.toolStatuses.set(toolName, {
            ...status,
            status: ToolStatus.AVAILABLE,
            lastUpdated: now,
            consecutiveFailures: 0,
            shouldRebind: false,
            reason: '失败持续时间已过，自动重置'
          });
          
          this.logger.info(`工具 "${toolName}" 自动重置为可用状态`);
        }
      }
    }
  }

  /**
   * 获取工具状态
   */
  getToolStatus(toolName: string): ToolStatusInfo | undefined {
    return this.toolStatuses.get(toolName);
  }

  /**
   * 获取所有工具状态
   */
  getAllToolStatuses(): Map<string, ToolStatusInfo> {
    return new Map(this.toolStatuses);
  }

  /**
   * 获取可用工具列表（基于状态和依赖关系）
   */
  getAvailableToolsByStatus(): string[] {
    const availableTools: string[] = [];
    
    // 获取所有注册的工具
    const allTools = this.registry.getAll();
    
    for (const tool of allTools) {
      const toolName = tool.name;
      
      // 检查工具状态
      const status = this.toolStatuses.get(toolName);
      if (status && status.status !== ToolStatus.AVAILABLE) {
        continue; // 工具状态不可用
      }
      
      // 检查依赖关系
      const availabilityStatus = this.registry.getToolAvailabilityStatus(toolName);
      if (!availabilityStatus.available) {
        continue; // 依赖关系不满足
      }
      
      availableTools.push(toolName);
    }
    
    return availableTools;
  }

  /**
   * 手动重置工具状态
   */
  resetToolStatus(toolName: string): boolean {
    const status = this.toolStatuses.get(toolName);
    if (status) {
      this.toolStatuses.set(toolName, {
        ...status,
        status: ToolStatus.AVAILABLE,
        lastUpdated: new Date(),
        consecutiveFailures: 0,
        shouldRebind: false,
        reason: '手动重置'
      });
      
      this.updateToolAvailabilityInRegistry(toolName);
      return true;
    }
    return false;
  }

  /**
   * 手动设置工具状态
   */
  setToolStatus(toolName: string, status: ToolStatus, reason?: string): boolean {
    const currentStatus = this.toolStatuses.get(toolName);
    if (currentStatus) {
      this.toolStatuses.set(toolName, {
        ...currentStatus,
        status,
        lastUpdated: new Date(),
        reason: reason || `手动设置为 ${status}`,
        shouldRebind: status === ToolStatus.FAILED
      });
      
      this.updateToolAvailabilityInRegistry(toolName);
      return true;
    }
    return false;
  }

  /**
   * 更新状态管理配置
   */
  updateStatusManagementConfig(config: Partial<typeof this.statusManagementConfig>): void {
    this.statusManagementConfig = { ...this.statusManagementConfig, ...config };
    this.logger.info('工具状态管理配置已更新', { config });
  }

  /**
   * 获取状态管理配置
   */
  getStatusManagementConfig() {
    return { ...this.statusManagementConfig };
  }

  /**
   * 序列化工具状态（用于持久化）
   */
  serializeToolStates(): string {
    const states = Array.from(this.toolStatuses.entries()).map(([toolName, status]) => ({
      toolName,
      status: status.status,
      reason: status.reason,
      lastUpdated: status.lastUpdated.toISOString(),
      consecutiveFailures: status.consecutiveFailures,
      lastSuccessTime: status.lastSuccessTime?.toISOString(),
      lastFailureTime: status.lastFailureTime?.toISOString(),
      shouldRebind: status.shouldRebind
    }));
    
    return JSON.stringify({
      states,
      config: this.statusManagementConfig,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 反序列化工具状态（用于恢复）
   */
  deserializeToolStates(serializedData: string): boolean {
    try {
      const data = JSON.parse(serializedData);
      
      // 恢复状态管理配置
      if (data.config) {
        this.statusManagementConfig = { ...this.statusManagementConfig, ...data.config };
      }
      
      // 恢复工具状态
      if (data.states && Array.isArray(data.states)) {
        this.toolStatuses.clear();
        
        for (const stateData of data.states) {
          this.toolStatuses.set(stateData.toolName, {
            toolName: stateData.toolName,
            status: stateData.status,
            reason: stateData.reason,
            lastUpdated: new Date(stateData.lastUpdated),
            consecutiveFailures: stateData.consecutiveFailures,
            lastSuccessTime: stateData.lastSuccessTime ? new Date(stateData.lastSuccessTime) : undefined,
            lastFailureTime: stateData.lastFailureTime ? new Date(stateData.lastFailureTime) : undefined,
            shouldRebind: stateData.shouldRebind
          });
        }
      }
      
      this.logger.info(`工具状态已恢复: ${this.toolStatuses.size} 个工具状态`);
      return true;
    } catch (error) {
      this.logger.error('反序列化工具状态失败:', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * 获取工具状态摘要（用于调试）
   */
  getToolStatesSummary(): { [toolName: string]: { status: string; reason?: string; lastUpdated: string } } {
    const summary: { [toolName: string]: { status: string; reason?: string; lastUpdated: string } } = {};
    
    for (const [toolName, status] of this.toolStatuses.entries()) {
      summary[toolName] = {
        status: status.status,
        reason: status.reason,
        lastUpdated: status.lastUpdated.toISOString()
      };
    }
    
    return summary;
  }
}
