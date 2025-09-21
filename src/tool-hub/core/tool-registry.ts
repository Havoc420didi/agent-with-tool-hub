// tool-registry.ts - 工具注册表（集成依赖管理）

import { 
  ToolConfig, 
  ToolRegistration, 
  ToolSearchOptions, 
  ToolSearchResult, 
  ToolRegistrationResult,
  BatchToolRegistrationResult,
  ToolExecutionContext,
  ToolDependencyGroup,
  BaseToolDependency
} from '../types/index';
import { Logger, createToolRegistryLogger } from '../utils/logger';

/**
 * 工具描述信息
 */
export interface ToolDescription {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具参数模式 */
  parameters: any;
  /** 工具标签 */
  tags?: string[];
  /** 是否可用 */
  available: boolean;
  /** 可用性原因 */
  availabilityReason?: string;
  /** 依赖的工具 */
  dependencies: string[];
  /** 依赖此工具的其他工具 */
  dependents: string[];
}

/**
 * 依赖关系描述
 */
export interface DependencyDescription {
  /** 工具名称 */
  toolName: string;
  /** 依赖的工具列表 */
  dependsOn: string[];
  /** 被依赖的工具列表 */
  dependedBy: string[];
  /** 依赖组信息 */
  dependencyGroups?: Array<{
    type: string;
    description?: string;
    dependencies: string[];
  }>;
}

/**
 * 工具能力概览
 */
export interface ToolCapabilityOverview {
  /** 工具描述列表 */
  tools: ToolDescription[];
  /** 依赖关系列表 */
  dependencies: DependencyDescription[];
  /** 统计信息 */
  statistics: {
    totalTools: number;
    availableTools: number;
    rootTools: number;
    leafTools: number;
  };
}

/**
 * 导出格式选项
 */
export interface ExportOptions {
  /** 输出格式 */
  format?: 'markdown' | 'json' | 'text';
  /** 是否包含不可用工具 */
  includeUnavailable?: boolean;
  /** 是否包含依赖关系 */
  includeDependencies?: boolean;
  /** 是否包含统计信息 */
  includeStatistics?: boolean;
  /** 是否包含参数详情 */
  includeParameters?: boolean;
}


/**
 * 增强的工具注册信息 // TODO 或许重构一下
 */
export interface EnhancedToolRegistration extends ToolRegistration {
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
export class ToolRegistry {
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
  private checkDependency(dep: BaseToolDependency, context: ToolExecutionContext): boolean {
    const hasExecuted = this.hasToolExecuted(dep.toolName);
    
    if (!hasExecuted) {
      return dep.type === 'optional';
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

      // 创建增强的注册信息
      const registration: EnhancedToolRegistration = {
        config: { ...config, enabled: config.enabled !== false },
        registeredAt: new Date(),
        usageCount: 0,
        dependents: [],
        available: this.isRootNode(config),
        availabilityReason: this.isRootNode(config) ? '无依赖，立即可用' : '等待依赖满足',
        lastExecuted: undefined,
        executionCount: 0
      };

      // 注册工具
      this.tools.set(config.name, registration);
      this.dependencyGraph.nodes.set(config.name, registration);

      // 更新依赖关系
      this.updateDependencyEdges(config.name, config);

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

      this.logger.info(`工具 "${config.name}" 已注册`);

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

    this.logger.debug(`🧰 获取工具可用性状态: ${toolName}`, { dependencyGroups: registration.config.dependencyGroups });

    // 检查复杂依赖组
    if (registration.config.dependencyGroups) {
      const context = this.createMockContext();
      
      for (const group of registration.config.dependencyGroups) {
        if (!this.checkDependencyGroup(group, context)) {
          // 根据依赖组类型，只添加未满足的依赖
          const unsatisfiedDeps = this.getUnsatisfiedDependencies(group, context);
          missingDependencies.push(...unsatisfiedDeps);
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
   * 获取依赖组中未满足的依赖
   */
  private getUnsatisfiedDependencies(group: ToolDependencyGroup, context: ToolExecutionContext): string[] {
    const { type, dependencies } = group;
    const unsatisfiedDeps: string[] = [];

    switch (type) {
      case 'any':
        // 对于 any 类型，如果整个组不满足，说明所有依赖都不满足
        // 但为了更精确的错误信息，我们检查每个依赖
        for (const dep of dependencies) {
          if (!this.checkDependency(dep, context)) {
            unsatisfiedDeps.push(dep.toolName);
          }
        }
        break;
        
      case 'all':
        // 对于 all 类型，添加所有未满足的依赖
        for (const dep of dependencies) {
          if (!this.checkDependency(dep, context)) {
            unsatisfiedDeps.push(dep.toolName);
          }
        }
        break;
        
      case 'sequence':
        // 对于 sequence 类型，从第一个未满足的依赖开始添加
        for (const dep of dependencies) {
          if (!this.checkDependency(dep, context)) {
            unsatisfiedDeps.push(dep.toolName);
            break; // 序列中第一个未满足的依赖
          }
        }
        break;
        
      default:
        // 默认情况，添加所有依赖
        unsatisfiedDeps.push(...dependencies.map(dep => dep.toolName));
    }

    return unsatisfiedDeps;
  }

  /**
   * 获取所有工具可用性状态
   */
  getAllToolAvailabilityStatus(): ToolAvailabilityStatus[] {
    const statuses: ToolAvailabilityStatus[] = [];
    
    for (const toolName of this.tools.keys()) {
      // TODO: 这里需要优化，避免重复获取可用性状态；如何比较好的缓存，而不是每次都重复检查。
      statuses.push(this.getToolAvailabilityStatus(toolName));
    }
    
    return statuses;
  }

  // ==================== 依赖图管理 ====================

  /**
   * 更新依赖关系边
   */
  private updateDependencyEdges(toolName: string, config: ToolConfig): void {
    // 处理依赖组中的依赖关系
    if (config.dependencyGroups) {
      config.dependencyGroups.forEach(group => {
        group.dependencies.forEach(dep => {
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
      });
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
      // 无依赖组的是根节点
      if (!registration.config.dependencyGroups || registration.config.dependencyGroups.length === 0) {
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
  private isRootNode(config: ToolConfig): boolean {
    return !config.dependencyGroups || config.dependencyGroups.length === 0;
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
    this.logger.debug(`🧰 更新工具可用性: ${toolName}`, { availabilityStatus });
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
      
      // 检查依赖组中的依赖
      if (registration.config.dependencyGroups) {
        for (const group of registration.config.dependencyGroups) {
          for (const dep of group.dependencies) {
            if (dfs(dep.toolName)) {
              path.unshift(dep.toolName);
              return true;
            }
          }
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
      registration.available = this.isRootNode(registration.config);
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

  // ==================== 工具描述导出 ====================

  // BASE FUNC * 2
  /**
   * 获取工具描述列表
   */
  getToolDescriptions(options: ExportOptions = {}): ToolDescription[] {
    const { includeUnavailable = true } = options;
    const descriptions: ToolDescription[] = [];

    for (const [toolName, registration] of this.tools) {
      if (!includeUnavailable && !registration.available) {
        continue;
      }

      const dependencies: string[] = [];
      if (registration.config.dependencyGroups) {
        registration.config.dependencyGroups.forEach(group => {
          group.dependencies.forEach(dep => {
            if (!dependencies.includes(dep.toolName)) {
              dependencies.push(dep.toolName);
            }
          });
        });
      }

      descriptions.push({
        name: registration.config.name,
        description: registration.config.description,
        parameters: registration.config.schema,
        tags: registration.config.tags,
        available: registration.available,
        availabilityReason: registration.availabilityReason,
        dependencies,
        dependents: [...registration.dependents]
      });
    }

    return descriptions;
  }

  /**
   * 获取依赖关系描述
   */
  getDependencyDescriptions(): DependencyDescription[] {
    const descriptions: DependencyDescription[] = [];

    for (const [toolName, registration] of this.tools) {
      const dependsOn: string[] = [];
      const dependencyGroups: Array<{
        type: string;
        description?: string;
        dependencies: string[];
      }> = [];

      if (registration.config.dependencyGroups) {
        registration.config.dependencyGroups.forEach(group => {
          const groupDeps = group.dependencies.map(dep => dep.toolName);
          dependsOn.push(...groupDeps);
          
          dependencyGroups.push({
            type: group.type,
            description: group.description,
            dependencies: groupDeps
          });
        });
      }

      const dependedBy = this.dependencyGraph.edges.get(toolName) 
        ? Array.from(this.dependencyGraph.edges.get(toolName)!)
        : [];

      descriptions.push({
        toolName,
        dependsOn: [...new Set(dependsOn)],
        dependedBy,
        dependencyGroups: dependencyGroups.length > 0 ? dependencyGroups : undefined
      });
    }

    return descriptions;
  }

  // EXPORT WAY * 3
  /**
   * 获取工具能力概览
   */
  getToolCapabilityOverview(options: ExportOptions = {}): ToolCapabilityOverview {
    const tools = this.getToolDescriptions(options);
    const dependencies = options.includeDependencies !== false 
      ? this.getDependencyDescriptions() 
      : [];
    
    const stats = this.getToolStatistics();

    return {
      tools,
      dependencies,
      statistics: {
        totalTools: stats.totalTools,
        availableTools: stats.availableTools,
        rootTools: stats.rootTools,
        leafTools: stats.leafTools
      }
    };
  }

  /**
   * 生成 Markdown 格式的工具描述
   */
  generateMarkdownDescription(options: ExportOptions = {}): string {
    const overview = this.getToolCapabilityOverview(options);
    const { tools, dependencies, statistics } = overview;
    
    let markdown = '# 可用工具列表\n\n';
    
    // 统计信息
    if (options.includeStatistics !== false) {
      markdown += `## 统计信息\n\n`;
      markdown += `- 总工具数: ${statistics.totalTools}\n`;
      markdown += `- 可用工具数: ${statistics.availableTools}\n`;
      markdown += `- 根工具数: ${statistics.rootTools}\n`;
      markdown += `- 叶子工具数: ${statistics.leafTools}\n\n`;
    }

    // 工具列表
    markdown += `## 工具列表\n\n`;
    
    for (const tool of tools) {
      markdown += `### ${tool.name}\n\n`;
      markdown += `**描述**: ${tool.description}\n\n`;
      
      if (tool.tags && tool.tags.length > 0) {
        markdown += `**标签**: ${tool.tags.join(', ')}\n\n`;
      }
      
      markdown += `**状态**: ${tool.available ? '✅ 可用' : '❌ 不可用'}\n`;
      if (tool.availabilityReason) {
        markdown += `**原因**: ${tool.availabilityReason}\n`;
      }
      markdown += '\n';
      
      if (tool.dependencies.length > 0) {
        markdown += `**依赖**: ${tool.dependencies.join(', ')}\n\n`;
      }
      
      if (tool.dependents.length > 0) {
        markdown += `**被依赖**: ${tool.dependents.join(', ')}\n\n`;
      }
      
      if (options.includeParameters !== false && tool.parameters) {
        markdown += `**参数**:\n\`\`\`json\n${JSON.stringify(tool.parameters, null, 2)}\n\`\`\`\n\n`;
      }
      
      markdown += '---\n\n';
    }

    // 依赖关系图
    if (options.includeDependencies !== false && dependencies.length > 0) {
      markdown += `## 依赖关系\n\n`;
      
      for (const dep of dependencies) {
        if (dep.dependsOn.length > 0 || dep.dependedBy.length > 0) {
          markdown += `### ${dep.toolName}\n\n`;
          
          if (dep.dependsOn.length > 0) {
            markdown += `**依赖**: ${dep.dependsOn.join(', ')}\n\n`;
          }
          
          if (dep.dependedBy.length > 0) {
            markdown += `**被依赖**: ${dep.dependedBy.join(', ')}\n\n`;
          }
          
          if (dep.dependencyGroups && dep.dependencyGroups.length > 0) {
            markdown += `**依赖组**:\n`;
            dep.dependencyGroups.forEach(group => {
              markdown += `- ${group.type}: ${group.dependencies.join(', ')}`;
              if (group.description) {
                markdown += ` (${group.description})`;
              }
              markdown += '\n';
            });
            markdown += '\n';
          }
        }
      }
    }

    return markdown;
  }

  /**
   * 生成系统提示词
   */
  generateSystemPrompt(options: ExportOptions = {}): string {
    const overview = this.getToolCapabilityOverview(options);
    const { tools, statistics } = overview;
    
    let prompt = `你是一个智能助手，可以使用以下工具来帮助用户完成任务。\n\n`;
    
    // 统计信息
    if (options.includeStatistics !== false) {
      prompt += `当前共有 ${statistics.totalTools} 个工具，其中 ${statistics.availableTools} 个可用。\n\n`;
    }
    
    prompt += `## 可用工具\n\n`;
    
    for (const tool of tools) {
      if (!tool.available) continue;
      
      prompt += `### ${tool.name}\n`;
      prompt += `- 描述: ${tool.description}\n`;
      
      if (tool.dependencies.length > 0) {
        prompt += `- 依赖: ${tool.dependencies.join(', ')}\n`;
      }
      
      prompt += '\n';
    }
    
    prompt += `\n## 使用说明\n\n`;
    prompt += `1. 工具之间存在依赖关系，请确保先执行依赖的工具\n`;
    prompt += `2. 只有标记为"可用"的工具才能被调用，对于不可用的工具，其原因在于需要满足设定的依赖条件关系，而非真的不可用\n`;
    prompt += `3. 调用工具时请提供正确的参数格式\n`;
    prompt += `4. 如果工具不可用，请检查其依赖是否已满足；如果有依赖，请先执行依赖的工具\n\n`;
    
    return prompt;
  }
}
