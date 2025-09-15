// index.ts - ToolHub 主入口

// 核心模块
export * from './core/index';

// 类型定义
export * from './types/index';

// 适配器
export * from './adapters/index';

// 工具函数
export * from './utils/index';

// 预设工具
export * from './presets/index';

// 便捷的工厂函数
import { ToolHub } from './core/tool-hub';
import { ToolHubConfig } from './types/hub.types';
import { getAllPresetTools } from './presets/index';

/**
 * 创建 ToolHub 实例
 */
export function createToolHub(config?: ToolHubConfig): ToolHub {
  return new ToolHub(config);
}

/**
 * 创建带有预设工具的 ToolHub 实例
 */
export async function createToolHubWithPresets(config?: ToolHubConfig): Promise<ToolHub> {
  const hub = new ToolHub(config);
  const presetTools = await getAllPresetTools();
  hub.registerBatch(presetTools);
  return hub;
}

/**
 * 创建轻量级 ToolHub 实例（仅包含核心功能）
 */
export function createLightweightToolHub(config?: ToolHubConfig): ToolHub {
  return new ToolHub({
    ...config,
    caching: false,
    statistics: false,
    logging: false
  });
}

// 默认导出
export default ToolHub;
