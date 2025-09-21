// 模型配置管理模块
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

// 模型配置接口
export interface ModelConfig {
  name: string;
  provider: string;
  apiKey: string;
  baseURL: string;
  temperature: number;
  maxTokens?: number;
  description?: string;
}

// 提供商配置接口
export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseURL: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  models: string[];
}

// 配置验证结果
export interface ConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 模型配置管理器
export class ModelConfigManager {
  private models: ModelConfig[] = [];
  private currentModelIndex: number = 0;
  private providers: Map<string, ProviderConfig> = new Map();

  constructor() {
    this.loadProvidersFromEnv();
    this.loadModelsFromProviders();
  }

  /**
   * 从环境变量加载提供商配置
   */
  private loadProvidersFromEnv(): void {
    // DeepSeek 配置
    const deepseekConfig: ProviderConfig = {
      name: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || '',
      defaultTemperature: 0,
      defaultMaxTokens: 4096,
      models: this.parseModelNames(process.env.DEEPSEEK_MODEL_NAMES)
    };

    // Qwen 配置
    const qwenConfig: ProviderConfig = {
      name: 'qwen',
      apiKey: process.env.QWEN_API_KEY || '',
      baseURL: process.env.QWEN_BASE_URL || '',
      defaultTemperature: 0,
      defaultMaxTokens: 4096,
      models: this.parseModelNames(process.env.QWEN_MODEL_NAMES)
    };

    // 只添加有有效配置的提供商
    if (this.validateProviderConfig(deepseekConfig).valid) {
      this.providers.set('deepseek', deepseekConfig);
    }

    if (this.validateProviderConfig(qwenConfig).valid) {
      this.providers.set('qwen', qwenConfig);
    }
  }

  /**
   * 从提供商配置生成模型配置
   */
  private loadModelsFromProviders(): void {
    this.providers.forEach((providerConfig) => {
      providerConfig.models.forEach(modelName => {
        this.models.push({
          name: modelName,
          provider: providerConfig.name,
          apiKey: providerConfig.apiKey,
          baseURL: providerConfig.baseURL,
          temperature: providerConfig.defaultTemperature,
          maxTokens: providerConfig.defaultMaxTokens,
          description: `${providerConfig.name} ${modelName} 模型`
        });
      });
    });

    // 设置默认模型
    if (this.models.length > 0) {
      this.currentModelIndex = 0;
    }
  }

  /**
   * 解析模型名称字符串
   */
  private parseModelNames(envValue?: string): string[] {
    if (!envValue) return [];
    
    try {
      // 处理 JSON 数组格式
      if (envValue.startsWith('[') && envValue.endsWith(']')) {
        return JSON.parse(envValue);
      }
      // 处理逗号分隔格式
      return envValue.split(',').map(name => name.trim()).filter(name => name);
    } catch (error) {
      console.warn(`解析模型名称失败: ${envValue}`);
      return [];
    }
  }

  /**
   * 验证提供商配置
   */
  private validateProviderConfig(provider: ProviderConfig): ConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!provider.name || provider.name.trim() === '') {
      errors.push('提供商名称不能为空');
    }

    if (!provider.apiKey || provider.apiKey.trim() === '') {
      errors.push(`${provider.name} API密钥不能为空`);
    }

    if (!provider.baseURL || provider.baseURL.trim() === '') {
      errors.push(`${provider.name} API地址不能为空`);
    }

    if (provider.models.length === 0) {
      warnings.push(`${provider.name} 没有配置任何模型`);
    }

    if (provider.defaultTemperature < 0 || provider.defaultTemperature > 1) {
      errors.push(`${provider.name} 默认温度值必须在0-1之间`);
    }

    if (provider.defaultMaxTokens <= 0) {
      errors.push(`${provider.name} 默认最大令牌数必须大于0`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取所有模型配置
   */
  getAllModels(): ModelConfig[] {
    return [...this.models];
  }

  /**
   * 获取当前模型
   */
  getCurrentModel(): ModelConfig | null {
    return this.models[this.currentModelIndex] || null;
  }

  /**
   * 按名称切换模型
   */
  switchToModel(modelName: string): boolean {
    const index = this.models.findIndex(model => 
      model.name === modelName || 
      model.name.toLowerCase() === modelName.toLowerCase()
    );
    
    if (index !== -1) {
      this.currentModelIndex = index;
      return true;
    }
    return false;
  }

  /**
   * 按索引切换模型
   */
  switchToModelByIndex(index: number): boolean {
    if (index >= 0 && index < this.models.length) {
      this.currentModelIndex = index;
      return true;
    }
    return false;
  }

  /**
   * 按提供商获取模型
   */
  getModelByProvider(provider: string): ModelConfig[] {
    return this.models.filter(model => model.provider === provider);
  }

  /**
   * 获取所有提供商
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(provider: string): ProviderConfig | null {
    return this.providers.get(provider) || null;
  }

  /**
   * 验证单个模型配置
   */
  validateModelConfig(model: ModelConfig): ConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!model.name || model.name.trim() === '') {
      errors.push('模型名称不能为空');
    }
    
    if (!model.provider || model.provider.trim() === '') {
      errors.push('提供商不能为空');
    }
    
    if (!model.apiKey || model.apiKey.trim() === '') {
      errors.push('API密钥不能为空');
    }
    
    if (!model.baseURL || model.baseURL.trim() === '') {
      errors.push('API地址不能为空');
    }
    
    if (model.temperature < 0 || model.temperature > 1) {
      errors.push('温度值必须在0-1之间');
    }

    if (model.maxTokens && model.maxTokens <= 0) {
      errors.push('最大令牌数必须大于0');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证所有模型配置
   */
  validateAllModels(): { valid: boolean; errors: Record<string, string[]>; warnings: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    let allValid = true;
    
    this.models.forEach((model) => {
      const validation = this.validateModelConfig(model);
      const modelKey = `${model.provider}-${model.name}`;
      
      if (!validation.valid) {
        allValid = false;
        errors[modelKey] = validation.errors;
      }
      
      if (validation.warnings.length > 0) {
        warnings[modelKey] = validation.warnings;
      }
    });
    
    return {
      valid: allValid,
      errors,
      warnings
    };
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): {
    totalModels: number;
    providers: string[];
    currentModel: ModelConfig | null;
    validation: { valid: boolean; errorCount: number; warningCount: number };
  } {
    const validation = this.validateAllModels();
    const errorCount = Object.values(validation.errors).flat().length;
    const warningCount = Object.values(validation.warnings).flat().length;

    return {
      totalModels: this.models.length,
      providers: this.getAvailableProviders(),
      currentModel: this.getCurrentModel(),
      validation: {
        valid: validation.valid,
        errorCount,
        warningCount
      }
    };
  }
}

// 导出单例实例
export const modelConfigManager = new ModelConfigManager();
