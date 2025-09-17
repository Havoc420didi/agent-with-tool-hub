// tool-executor.ts - 工具执行器

import { 
  ToolConfig, 
  ToolResult, 
  ToolExecutionContext, 
  ToolExecutionOptions,
  ToolExecutionResult
} from '../types/index';

/**
 * 工具执行器 - 负责执行工具并处理结果
 */
export class ToolExecutor {
  private cache: Map<string, { result: ToolResult; timestamp: number }> = new Map();
  private cacheConfig: { ttl: number; maxSize: number };

  constructor(cacheConfig?: { ttl: number; maxSize: number }) {
    this.cacheConfig = cacheConfig || { ttl: 300000, maxSize: 1000 }; // 默认5分钟TTL，最大1000条
  }

  /**
   * 执行工具
   */
  async execute(
    config: ToolConfig, 
    input: any, 
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    try {
      // 检查缓存
      if (options.context?.executionId && this.cacheConfig.ttl > 0) {
        const cacheKey = this.getCacheKey(config.name, input, options.context);
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
          return {
            ...cached.result,
            executionTime: Date.now() - startTime,
            toolName: config.name,
            context: options.context,
            fromCache: true
          };
        }
      }

      // 验证输入
      const validationResult = this.validateInput(input, config.schema);
      if (!validationResult.valid) {
        const result: ToolResult = {
          success: false,
          error: `输入验证失败: ${validationResult.error}`
        };
        
        return {
          ...result,
          executionTime: Date.now() - startTime,
          toolName: config.name,
          context: options.context
        };
      }

      // 执行工具
      const result = await this.executeWithRetry(config, input, options);
      
      // 缓存结果
      if (options.context?.executionId && this.cacheConfig.ttl > 0) {
        this.setCache(config.name, input, options.context, result);
      }

      return {
        ...result,
        executionTime: Date.now() - startTime,
        toolName: config.name,
        context: options.context
      };

    } catch (error) {
      const result: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      return {
        ...result,
        executionTime: Date.now() - startTime,
        toolName: config.name,
        context: options.context
      };
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    config: ToolConfig, 
    input: any, 
    options: ToolExecutionOptions
  ): Promise<ToolResult> {
    const maxRetries = options.retries || 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 设置超时
        if (options.timeout) {
          return await this.executeWithTimeout(config, input, options.timeout);
        } else {
          return await config.handler(input);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // 等待后重试
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || '执行失败'
    };
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout(
    config: ToolConfig, 
    input: any, 
    timeout: number
  ): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`工具执行超时 (${timeout}ms)`));
      }, timeout);

      Promise.resolve(config.handler(input))
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 验证输入
   */
  private validateInput(input: any, schema: any): { valid: boolean; error?: string } {
    try {
      if (schema && typeof schema.parse === 'function') {
        schema.parse(input);
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(toolName: string, input: any, context?: ToolExecutionContext): string {
    const inputStr = JSON.stringify(input);
    const contextStr = context ? JSON.stringify(context) : '';
    return `${toolName}_${Buffer.from(inputStr + contextStr).toString('base64')}`;
  }

  /**
   * 设置缓存
   */
  private setCache(toolName: string, input: any, context: ToolExecutionContext, result: ToolResult): void {
    const cacheKey = this.getCacheKey(toolName, input, context);
    
    // 检查缓存大小限制
    if (this.cache.size >= this.cacheConfig.maxSize) {
      // 删除最旧的缓存项
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize
    };
  }

  /**
   * 更新缓存配置
   */
  updateCacheConfig(config: { ttl: number; maxSize: number }): void {
    this.cacheConfig = config;
  }
}
