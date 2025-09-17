// validation.ts - 工具验证函数

import { ToolConfig } from '../types/tool.types';

/**
 * 验证工具配置（详细版本）
 */
export function validateToolConfigDetailed(config: ToolConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证名称
  if (!config.name || typeof config.name !== 'string') {
    errors.push('工具名称必须是非空字符串');
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.name)) {
    errors.push('工具名称只能包含字母、数字和下划线，且不能以数字开头');
  }

  // 验证描述
  if (!config.description || typeof config.description !== 'string') {
    errors.push('工具描述必须是非空字符串');
  } else if (config.description.length < 10) {
    errors.push('工具描述至少需要10个字符');
  }

  // 验证处理器
  if (!config.handler || typeof config.handler !== 'function') {
    errors.push('工具处理器必须是函数');
  }

  // 验证模式
  if (!config.schema) {
    errors.push('工具模式必须定义');
  }

  // 验证标签
  if (config.tags) {
    if (!Array.isArray(config.tags)) {
      errors.push('工具标签必须是数组');
    } else if (!config.tags.every(tag => typeof tag === 'string')) {
      errors.push('所有标签必须是字符串');
    }
  }

  // 验证配置
  if (config.config && typeof config.config !== 'object') {
    errors.push('工具配置必须是对象');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证工具名称是否唯一
 */
export function validateUniqueName(name: string, existingNames: string[]): boolean {
  return !existingNames.includes(name);
}

/**
 * 验证工具依赖关系
 */
export function validateDependencies(
  config: ToolConfig, 
  availableTools: string[]
): { valid: boolean; missingDeps: string[] } {
  const missingDeps: string[] = [];
  
  // 这里可以添加依赖关系验证逻辑
  // 例如检查工具配置中是否引用了其他工具
  
  return {
    valid: missingDeps.length === 0,
    missingDeps
  };
}

/**
 * 验证工具安全性
 */
export function validateSecurity(config: ToolConfig): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 检查是否使用了危险的函数
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /setTimeout\s*\(/,
    /setInterval\s*\(/,
    /require\s*\(/,
    /import\s*\(/
  ];

  const handlerString = config.handler.toString();
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(handlerString)) {
      warnings.push(`工具处理器中可能包含危险代码: ${pattern.source}`);
    }
  });

  // 检查是否访问了敏感对象
  const sensitiveObjects = ['process', 'global', 'window', 'document'];
  sensitiveObjects.forEach(obj => {
    if (handlerString.includes(obj)) {
      warnings.push(`工具处理器可能访问了敏感对象: ${obj}`);
    }
  });

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * 验证工具性能
 */
export function validatePerformance(config: ToolConfig): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 检查处理器复杂度
  const handlerString = config.handler.toString();
  const lines = handlerString.split('\n').length;
  
  if (lines > 100) {
    warnings.push('工具处理器过于复杂，可能影响性能');
  }

  // 检查是否有循环
  const loopPatterns = [/for\s*\(/, /while\s*\(/, /forEach\s*\(/];
  const loopCount = loopPatterns.reduce((count, pattern) => {
    return count + (handlerString.match(pattern) || []).length;
  }, 0);

  if (loopCount > 3) {
    warnings.push('工具处理器包含多个循环，可能影响性能');
  }

  return {
    valid: true, // 性能问题不阻止注册，只发出警告
    warnings
  };
}

/**
 * 综合验证工具配置
 */
export function validateToolConfigComprehensive(
  config: ToolConfig,
  existingNames: string[] = []
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const basicValidation = validateToolConfigDetailed(config);
  const uniqueValidation = validateUniqueName(config.name, existingNames);
  const dependencyValidation = validateDependencies(config, existingNames);
  const securityValidation = validateSecurity(config);
  const performanceValidation = validatePerformance(config);

  const errors = [...basicValidation.errors];
  const warnings = [
    ...securityValidation.warnings,
    ...performanceValidation.warnings
  ];

  if (!uniqueValidation) {
    errors.push(`工具名称 "${config.name}" 已存在`);
  }

  if (!dependencyValidation.valid) {
    errors.push(`缺少依赖工具: ${dependencyValidation.missingDeps.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
