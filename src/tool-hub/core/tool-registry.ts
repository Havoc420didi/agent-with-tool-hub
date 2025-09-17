// tool-registry.ts - 工具注册表实现

import { 
  ToolConfig, 
  ToolRegistration, 
  ToolSearchOptions, 
  ToolSearchResult, 
  ToolRegistrationResult,
  BatchToolRegistrationResult
} from '../types/index';
import { Logger, createToolRegistryLogger } from '../utils/logger';

/**
 * 工具注册表 - 管理所有注册的工具
 */
export class ToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private validators: Array<(config: ToolConfig) => boolean | string> = [];
  private logger: Logger;

  constructor(validators?: Array<(config: ToolConfig) => boolean | string>) {
    this.validators = validators || [];
    this.logger = createToolRegistryLogger({
      enabled: true,
      level: 'info'
    });
  }

  /**
   * 注册工具
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

      // 创建注册信息
      const registration: ToolRegistration = {
        config: { ...config, enabled: config.enabled !== false },
        registeredAt: new Date(),
        usageCount: 0
      };

      // 注册工具
      this.tools.set(config.name, registration);

      // 更新标签索引
      if (config.tags) {
        config.tags.forEach(tag => {
          if (!this.tags.has(tag)) {
            this.tags.set(tag, new Set());
          }
          this.tags.get(tag)!.add(config.name);
        });
      }

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

    // 从工具映射中移除
    this.tools.delete(name);
    return true;
  }

  /**
   * 获取工具配置
   */
  get(name: string): ToolConfig | undefined {
    const registration = this.tools.get(name);
    return registration?.config;
  }

  /**
   * 获取工具注册信息
   */
  getRegistration(name: string): ToolRegistration | undefined {
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
