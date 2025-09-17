// index.ts - 预设工具导出

export { BuiltinTools } from './builtin-tools';
export { SystemTools } from './system-tools';

// 便捷的预设工具获取函数
export async function getAllPresetTools() {
  try {
    const { BuiltinTools } = await import('./builtin-tools');
    const { SystemTools } = await import('./system-tools');
    
    return [
      ...BuiltinTools.getAll(),
      ...SystemTools.getAll()
    ];
  } catch (error) {
    console.error('获取预设工具时出错:', error);
    return [];
  }
}
