// tool-registry.ts - 工具注册表（集成依赖管理）

import { 
  ToolConfig, 
  ToolRegistration, 
  ToolSearchOptions, 
  ToolSearchResult, 
  ToolRegistrationResult,
  BatchToolRegistrationResult,
  ToolDependency,
  ToolExecutionContext,
  ToolDependencyGroup
} from '../types/index';
import { Logger, createToolRegistryLogger } from '../utils/logger';


/**
 * 增强的工具注册信息 // TODO 或许重构一下
 */
export interface EnhancedToolRegistration extends ToolRegistration {
  /** 工具依赖关系 */
  dependencies: ToolDependency[];
  /** 依赖此工具的其他工具 */
  dependents: string[];
  /** 是否可用（基于依赖关系） */
  available: boolean;
  /** 可用性原因 */
  availabilityReason?: string;
  /** 最后执行时间 */
  lastExecuted?: Date;
  /** 执行次数 */
  executionCount: number;
}

/**
 * 工具依赖图
 */
export interface ToolDependencyGraph {
  /** 所有工具节点 */
  nodes: Map<string, EnhancedToolRegistration>;
  /** 依赖关系边 */
  edges: Map<string, Set<string>>;
  /** 根节点（无依赖的工具） */
  rootNodes: Set<string>;
  /** 叶子节点（无被依赖的工具） */
  leafNodes: Set<string>;
}

/**
 * 工具可用性状态
 */
export interface ToolAvailabilityStatus {
  /** 工具名称 */
  toolName: string;
  /** 是否可用 */
  available: boolean;
  /** 可用性原因 */
  reason: string;
  /** 缺失的依赖 */
  missingDependencies: string[];
  /** 建议的下一步操作 */
  suggestedActions: string[];
}

/**
 * 工具注册表 - 集成依赖管理功能
 */
export class EnhancedToolRegistry {
  private tools: Map<string, EnhancedToolRegistration> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private validators: Array<(config: ToolConfig) => boolean | string> = [];
  private logger: Logger;
  private executionHistory: Map<string, ToolExecutionContext[]> = new Map();

  // 依赖图结构
  private dependencyGraph: ToolDependencyGraph = {
    nodes: new Map(),
    edges: new Map(),
    rootNodes: new Set(),
    leafNodes: new Set()
  };

  constructor(validators?: Array<(config: ToolConfig) => boolean | string>) {
    this.validators = validators || [];
    this.logger = createToolRegistryLogger({
      enabled: true,
      level: 'info'
    });
  }

  // ==================== 依赖关系处理 ====================

  /**
   * 提取工具依赖关系
   */
  private extractDependencies(config: ToolConfig): ToolDependency[] {
    const deps: ToolDependency[] = [];
    
    // 处理依赖组
    if (config.dependencyGroups) {
      config.dependencyGroups.forEach(group => {
        deps.push(...group.dependencies);
      });
    }
    
    return deps;
  }

  /**
   * 检查工具依赖组是否满足
   */
  private checkDependencyGroup(group: ToolDependencyGroup, context: ToolExecutionContext): boolean {
    const { type, dependencies, condition } = group;
    
    // 检查组条件
    if (condition && !condition(context)) {
      return false;
    }
    
    switch (type) {
      case 'any':
        // 任意一个依赖满足即可
        return dependencies.some(dep => this.checkDependency(dep, context));
        
      case 'all':
        // 所有依赖都必须满足
        return dependencies.every(dep => this.checkDependency(dep, context));
        
      case 'sequence':
        // 按顺序检查依赖，前面的依赖必须满足才能检查后面的
        for (const dep of dependencies) {
          if (!this.checkDependency(dep, context)) {
            return false;
          }
        }
        return true;
        
      default:
        return false;
    }
  }

  /**
   * 检查单个依赖是否满足
   */
  private checkDependency(dep: ToolDependency, context: ToolExecutionContext): boolean {
    const hasExecuted = this.hasToolExecuted(dep.toolName);
    
    if (!hasExecuted) {
      return dep.type === 'optional';
    }
    
    // 检查依赖条件
    if (dep.condition) {
      const lastContext = this.getLastExecutionContext(dep.toolName);
      if (lastContext && !dep.condition(lastContext)) {
        return dep.type === 'optional';
      }
    }
    
    return true;
  }

  // ==================== 基础工具管理 ====================

  /**
   * 注册工具（支持依赖关系）
   */
  register(config: ToolConfig): ToolRegistrationResult {
    try {
      // 验证工具配置
      const validationResult = this.validateTool(config);
      if (validationResult !== true) {
        return {
          success: false,
          toolName: config.name,
          error: validationResult as string
        };
      }

      // 检查工具是否已存在
      if (this.tools.has(config.name)) {
        return {
          success: false,
          toolName: config.name,
          error: `工具 "${config.name}" 已存在`
        };
      }

      // 获取依赖关系（支持新的依赖配置）
      const dependencies = this.extractDependencies(config);

      // 创建增强的注册信息
      const registration: EnhancedToolRegistration = {
        config: { ...config, enabled: config.enabled !== false },
        registeredAt: new Date(),
        usageCount: 0,
        dependencies,
        dependents: [],
        available: this.isRootNode(dependencies),
        availabilityReason: this.isRootNode(dependencies) ? '无依赖，立即可用' : '等待依赖满足',
        lastExecuted: undefined,
        executionCount: 0
      };

      // 注册工具
      this.tools.set(config.name, registration);
      this.dependencyGraph.nodes.set(config.name, registration);

      // 更新依赖关系
      this.updateDependencyEdges(config.name, dependencies);

      // 更新标签索引
      if (config.tags) {
        config.tags.forEach(tag => {
          if (!this.tags.has(tag)) {
            this.tags.set(tag, new Set());
          }
          this.tags.get(tag)!.add(config.name);
        });
      }

      // 更新可用性
      this.updateToolAvailability(config.name);

      this.logger.info(`工具 "${config.name}" 已注册，依赖: ${dependencies.map(d => d.toolName).join(', ')}`);

      return {
        success: true,
        toolName: config.name
      };
    } catch (error) {
      this.logger.error(`工具 "${config.name}" 注册失败: ${error instanceof Error ? error.message : String(error)}`, {
        toolName: config.name,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        toolName: config.name,
        error: error instanceof Error ? error.message : String(error) as string
      };
    }
  }

  /**
   * 批量注册工具
   */
  registerBatch(configs: ToolConfig[]): BatchToolRegistrationResult {
    const results: ToolRegistrationResult[] = [];
    let success = 0;
    let failed = 0;

    configs.forEach(config => {
      const result = this.register(config);
      results.push(result);
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    });

    return {
      success,
      failed,
      results,
      total: configs.length
    };
  }

  /**
   * 注销工具
   */
  unregister(name: string): boolean {
    const registration = this.tools.get(name);
    if (!registration) {
      this.logger.warn(`尝试注销不存在的工具: "${name}"`);
      return false;
    }

    // 从标签索引中移除
    if (registration.config.tags) {
      registration.config.tags.forEach(tag => {
        const tagSet = this.tags.get(tag);
        if (tagSet) {
          tagSet.delete(name);
          if (tagSet.size === 0) {
            this.tags.delete(tag);
          }
        }
      });
    }

    // 从依赖图中移除
    this.removeFromDependencyGraph(name);

    // 从工具映射中移除
    this.tools.delete(name);
    this.dependencyGraph.nodes.delete(name);

    return true;
  }

  // ==================== 工具检索 ====================

  /**
   * 获取工具配置
   */
  get(name: string): ToolConfig | undefined {
    const registration = this.tools.get(name);
    return registration?.config;
  }

  /**
   * 获取增强的注册信息
   */
  getRegistration(name: string): EnhancedToolRegistration | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具配置
   */
  getAll(): ToolConfig[] {
    return Array.from(this.tools.values())
      .map(reg => reg.config);
  }

  /**
   * 获取启用的工具配置
   */
  getEnabled(): ToolConfig[] {
    return Array.from(this.tools.values())
      .filter(reg => reg.config.enabled !== false)
      .map(reg => reg.config);
  }

  /**
   * 获取当前可用的工具（基于依赖关系）
   */
  getAvailableTools(): ToolConfig[] {
    const availableTools: ToolConfig[] = [];
    
    for (const [toolName, registration] of this.tools) {
      if (registration.available) {
        availableTools.push(registration.config);
      }
    }
    
    return availableTools;
  }

  // ==================== 依赖管理 ====================

  /**
   * 记录工具执行
   */
  recordToolExecution(toolName: string, context: ToolExecutionContext): void {
    const registration = this.tools.get(toolName);
    if (!registration) {
      this.logger.warn(`工具 "${toolName}" 未注册`);
      return;
    }

    // 更新执行信息
    registration.lastExecuted = new Date();
    registration.executionCount++;
    
    // 记录执行历史
    if (!this.executionHistory.has(toolName)) {
      this.executionHistory.set(toolName, []);
    }
    this.executionHistory.get(toolName)!.push(context);
    
    // 更新依赖此工具的其他工具的可用性
    this.updateDependentToolsAvailability(toolName);
    
    this.logger.info(`工具 "${toolName}" 执行完成，执行次数: ${registration.executionCount}`);
  }

  /**
   * 获取工具可用性状态
   */
  getToolAvailabilityStatus(toolName: string): ToolAvailabilityStatus {
    const registration = this.tools.get(toolName);
    if (!registration) {
      return {
        toolName,
        available: false,
        reason: '工具未注册',
        missingDependencies: [],
        suggestedActions: ['注册工具']
      };
    }

    const missingDependencies: string[] = [];
    const suggestedActions: string[] = [];

    // 检查简单依赖关系
    for (const dep of registration.dependencies) {
      const depRegistration = this.tools.get(dep.toolName);
      if (!depRegistration) {
        missingDependencies.push(dep.toolName);
        suggestedActions.push(`注册工具 "${dep.toolName}"`);
        continue;
      }

      // 检查依赖是否已执行
      const hasExecuted = this.hasToolExecuted(dep.toolName);
      if (!hasExecuted) {
        missingDependencies.push(dep.toolName);
        suggestedActions.push(`执行工具 "${dep.toolName}"`);
      }

      // 检查可选条件
      if (dep.condition && hasExecuted) {
        const lastContext = this.getLastExecutionContext(dep.toolName);
        if (lastContext && !dep.condition(lastContext)) {
          missingDependencies.push(dep.toolName);
          suggestedActions.push(`重新执行工具 "${dep.toolName}" 以满足条件`);
        }
      }
    }

    // 检查复杂依赖组
    if (registration.config.dependencyGroups) {
      const context = this.createMockContext();
      
      for (const group of registration.config.dependencyGroups) {
        if (!this.checkDependencyGroup(group, context)) {
          const groupDeps = group.dependencies.map(dep => dep.toolName);
          missingDependencies.push(...groupDeps);
          suggestedActions.push(`满足依赖组 "${group.description || group.type}"`);
        }
      }
    }


    const available = missingDependencies.length === 0;
    const reason = available 
      ? '所有依赖已满足' 
      : `缺少依赖: ${missingDependencies.join(', ')}`;

    return {
      toolName,
      available,
      reason,
      missingDependencies,
      suggestedActions
    };
  }

  /**
   * 创建模拟上下文用于依赖检查
   */
  private createMockContext(): ToolExecutionContext {
    return {
      executionId: 'mock_context',
      sessionId: 'mock_session',
      threadId: 'mock_thread',
      metadata: {}
    };
  }

  /**
   * 获取所有工具可用性状态
   */
  getAllToolAvailabilityStatus(): ToolAvailabilityStatus[] {
    const statuses: ToolAvailabilityStatus[] = [];
    
    for (const toolName of this.tools.keys()) {
      statuses.push(this.getToolAvailabilityStatus(toolName));
    }
    
    return statuses;
  }

  // ==================== 依赖图管理 ====================

  /**
   * 更新依赖关系边
   */
  private updateDependencyEdges(toolName: string, dependencies: ToolDependency[]): void {
    // 添加依赖边
    dependencies.forEach(dep => {
      if (!this.dependencyGraph.edges.has(dep.toolName)) {
        this.dependencyGraph.edges.set(dep.toolName, new Set());
      }
      this.dependencyGraph.edges.get(dep.toolName)!.add(toolName);
      
      // 更新被依赖工具的 dependents
      const depRegistration = this.tools.get(dep.toolName);
      if (depRegistration) {
        depRegistration.dependents.push(toolName);
      }
    });

    // 更新根节点和叶子节点
    this.updateRootAndLeafNodes();
  }

  /**
   * 从依赖图中移除工具
   */
  private removeFromDependencyGraph(toolName: string): void {
    // 移除依赖边
    this.dependencyGraph.edges.delete(toolName);
    
    // 从其他工具的依赖中移除
    for (const [from, toSet] of this.dependencyGraph.edges) {
      toSet.delete(toolName);
    }
    
    // 更新根节点和叶子节点
    this.updateRootAndLeafNodes();
  }

  /**
   * 更新根节点和叶子节点
   */
  private updateRootAndLeafNodes(): void {
    this.dependencyGraph.rootNodes.clear();
    this.dependencyGraph.leafNodes.clear();

    for (const [toolName, registration] of this.tools) {
      // 无依赖的是根节点
      if (registration.dependencies.length === 0) {
        this.dependencyGraph.rootNodes.add(toolName);
      }
      
      // 无被依赖的是叶子节点
      if (registration.dependents.length === 0) {
        this.dependencyGraph.leafNodes.add(toolName);
      }
    }
  }

  /**
   * 检查是否为根节点
   */
  private isRootNode(dependencies: ToolDependency[]): boolean {
    return dependencies.length === 0;
  }

  /**
   * 更新依赖此工具的其他工具的可用性
   */
  private updateDependentToolsAvailability(executedToolName: string): void {
    const dependents = this.dependencyGraph.edges.get(executedToolName);
    if (dependents) {
      dependents.forEach(dependentName => {
        this.updateToolAvailability(dependentName);
      });
    }
  }

  /**
   * 更新工具可用性
   */
  private updateToolAvailability(toolName: string): void {
    const registration = this.tools.get(toolName);
    if (!registration) return;

    const availabilityStatus = this.getToolAvailabilityStatus(toolName);
    registration.available = availabilityStatus.available;
    registration.availabilityReason = availabilityStatus.reason;
  }

  /**
   * 检查工具是否已执行
   */
  private hasToolExecuted(toolName: string): boolean {
    const registration = this.tools.get(toolName);
    return registration ? registration.executionCount > 0 : false;
  }

  /**
   * 获取最后执行上下文
   */
  private getLastExecutionContext(toolName: string): ToolExecutionContext | undefined {
    const history = this.executionHistory.get(toolName);
    return history && history.length > 0 ? history[history.length - 1] : undefined;
  }

  // ==================== 搜索和过滤 ====================

  /**
   * 搜索工具
   */
  search(options: ToolSearchOptions = {}): ToolSearchResult {
    let tools = Array.from(this.tools.values()).map(reg => reg.config);

    // 按名称过滤
    if (options.name) {
      const namePattern = new RegExp(options.name, 'i');
      tools = tools.filter(tool => namePattern.test(tool.name));
    }

    // 按描述过滤
    if (options.description) {
      const descPattern = new RegExp(options.description, 'i');
      tools = tools.filter(tool => descPattern.test(tool.description));
    }

    // 按标签过滤
    if (options.tags && options.tags.length > 0) {
      tools = tools.filter(tool => 
        tool.tags && options.tags!.some(tag => tool.tags!.includes(tag))
      );
    }

    // 按可用性过滤
    if (options.available !== undefined) {
      tools = tools.filter(tool => {
        const registration = this.tools.get(tool.name);
        return registration ? registration.available === options.available : false;
      });
    }

    const total = tools.length;
    const offset = options.offset || 0;
    const limit = options.limit || total;

    // 分页
    const paginatedTools = tools.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      tools: paginatedTools,
      total,
      hasMore
    };
  }

  // ==================== 统计和监控 ====================

  /**
   * 获取工具统计信息
   */
  getToolStatistics(): {
    totalTools: number;
    availableTools: number;
    executedTools: number;
    rootTools: number;
    leafTools: number;
    averageExecutionCount: number;
  } {
    const registrations = Array.from(this.tools.values());
    const totalTools = registrations.length;
    const availableTools = registrations.filter(r => r.available).length;
    const executedTools = registrations.filter(r => r.executionCount > 0).length;
    const rootTools = this.dependencyGraph.rootNodes.size;
    const leafTools = this.dependencyGraph.leafNodes.size;
    const averageExecutionCount = registrations.reduce((sum, r) => sum + r.executionCount, 0) / totalTools;

    return {
      totalTools,
      availableTools,
      executedTools,
      rootTools,
      leafTools,
      averageExecutionCount: Math.round(averageExecutionCount * 100) / 100
    };
  }

  /**
   * 获取依赖图
   */
  getDependencyGraph(): ToolDependencyGraph {
    return {
      nodes: new Map(this.dependencyGraph.nodes),
      edges: new Map(this.dependencyGraph.edges),
      rootNodes: new Set(this.dependencyGraph.rootNodes),
      leafNodes: new Set(this.dependencyGraph.leafNodes)
    };
  }

  /**
   * 获取工具执行路径建议
   */
  getExecutionPathSuggestion(targetTool: string): string[] {
    const visited = new Set<string>();
    const path: string[] = [];
    
    const dfs = (toolName: string): boolean => {
      if (visited.has(toolName)) return false;
      if (toolName === targetTool) return true;
      
      visited.add(toolName);
      const registration = this.tools.get(toolName);
      if (!registration) return false;
      
      for (const dep of registration.dependencies) {
        if (dfs(dep.toolName)) {
          path.unshift(dep.toolName);
          return true;
        }
      }
      
      return false;
    };
    
    // 从根节点开始搜索
    for (const rootNode of this.dependencyGraph.rootNodes) {
      if (dfs(rootNode)) {
        path.push(targetTool);
        break;
      }
    }
    
    return path;
  }

  // ==================== 重置功能 ====================

  /**
   * 重置工具执行状态
   */
  resetToolExecution(toolName: string): void {
    const registration = this.tools.get(toolName);
    if (registration) {
      registration.executionCount = 0;
      registration.lastExecuted = undefined;
      this.executionHistory.delete(toolName);
      
      // 更新依赖此工具的其他工具
      this.updateDependentToolsAvailability(toolName);
      
      this.logger.info(`工具 "${toolName}" 执行状态已重置`);
    }
  }

  /**
   * 重置所有工具执行状态
   */
  resetAllToolExecution(): void {
    for (const [toolName, registration] of this.tools) {
      registration.executionCount = 0;
      registration.lastExecuted = undefined;
      registration.available = this.isRootNode(registration.dependencies);
      registration.availabilityReason = registration.available ? '无依赖，立即可用' : '等待依赖满足';
    }
    
    this.executionHistory.clear();
    this.logger.info('所有工具执行状态已重置');
  }

  // ==================== 基础功能 ====================

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取工具数量
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
    this.tags.clear();
    this.dependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
      rootNodes: new Set(),
      leafNodes: new Set()
    };
    this.executionHistory.clear();
  }

  /**
   * 更新工具使用统计
   */
  updateUsage(name: string): void {
    const registration = this.tools.get(name);
    if (registration) {
      registration.usageCount++;
      registration.lastUsed = new Date();
    }
  }

  /**
   * 验证工具配置
   */
  private validateTool(config: ToolConfig): boolean | string {
    // 基本验证
    if (!config.name || typeof config.name !== 'string') {
      return '工具名称必须是非空字符串';
    }

    if (!config.description || typeof config.description !== 'string') {
      return '工具描述必须是非空字符串';
    }

    if (!config.handler || typeof config.handler !== 'function') {
      return '工具处理器必须是函数';
    }

    if (!config.schema) {
      return '工具模式必须定义';
    }

    // 自定义验证器
    for (const validator of this.validators) {
      const result = validator(config);
      if (result !== true) {
        return result as string;
      }
    }

    return true;
  }

  /**
   * 添加验证器
   */
  addValidator(validator: (config: ToolConfig) => boolean | string): void {
    this.validators.push(validator);
  }

  /**
   * 移除验证器
   */
  removeValidator(validator: (config: ToolConfig) => boolean | string): void {
    const index = this.validators.indexOf(validator);
    if (index > -1) {
      this.validators.splice(index, 1);
    }
  }

  /**
   * 获取所有标签
   */
  getTags(): string[] {
    return Array.from(this.tags.keys());
  }

  /**
   * 获取标签下的工具
   */
  getToolsByTag(tag: string): ToolConfig[] {
    const toolNames = this.tags.get(tag);
    if (!toolNames) {
      return [];
    }
    return Array.from(toolNames)
      .map(name => this.tools.get(name)?.config)
      .filter((config): config is ToolConfig => config !== undefined);
  }
}
