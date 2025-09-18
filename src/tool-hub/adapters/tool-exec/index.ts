// index.ts - 工具执行器模块导出

// 工厂函数
import { ToolHub } from '../../core/tool-hub';
import { ToolExecutor, ToolExecutorConfig } from './types';
import { LangChainToolExecutor } from './langchain-executor';

/**
 * 创建 LangChain 工具执行器
 */
export function createLangChainExecutor(
  toolHub: ToolHub, 
  langchainTools: any[], 
  config?: ToolExecutorConfig
): LangChainToolExecutor {
  return new LangChainToolExecutor(toolHub, langchainTools, config);
}

/**
 * 工具执行器工厂
 */
export class ToolExecutorFactory {
  /**
   * 创建工具执行器
   */
  static createExecutor(
    framework: string,
    toolHub: ToolHub,
    tools: any[],
    config?: ToolExecutorConfig
  ): ToolExecutor {
    switch (framework.toLowerCase()) {
      case 'langchain':
      case 'langgraph':
        return new LangChainToolExecutor(toolHub, tools, config);
      
      default:
        throw new Error(`不支持的框架: ${framework}`);
    }
  }
  
  /**
   * 获取支持的框架列表
   */
  static getSupportedFrameworks(): string[] {
    return ['langchain', 'langgraph'];
  }
  
  /**
   * 检查框架是否支持
   */
  static isFrameworkSupported(framework: string): boolean {
    return this.getSupportedFrameworks().includes(framework.toLowerCase());
  }
}
