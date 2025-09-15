// index.ts - 预设工具导出

export { CommonTools } from './common-tools';
export { ApiTools } from './api-tools';
export { SystemTools } from './system-tools';

// 便捷的预设工具获取函数
export async function getAllPresetTools() {
  try {
    const { CommonTools } = await import('./common-tools');
    const { ApiTools } = await import('./api-tools');
    const { SystemTools } = await import('./system-tools');
    
    return [
      ...CommonTools.getAll(),
      ...ApiTools.getAll(),
      ...SystemTools.getAll()
    ];
  } catch (error) {
    console.error('获取预设工具时出错:', error);
    return [];
  }
}

export async function getPresetToolsByCategory(category: string) {
  try {
    const { CommonTools } = await import('./common-tools');
    const { ApiTools } = await import('./api-tools');
    const { SystemTools } = await import('./system-tools');
    
    return [
      ...CommonTools.getByCategory(category),
      ...ApiTools.getByCategory(category),
      ...SystemTools.getByCategory(category)
    ];
  } catch (error) {
    console.error('按分类获取预设工具时出错:', error);
    return [];
  }
}

export async function getPresetToolsByTag(tag: string) {
  try {
    const { CommonTools } = await import('./common-tools');
    const { ApiTools } = await import('./api-tools');
    const { SystemTools } = await import('./system-tools');
    
    return [
      ...CommonTools.getByTag(tag),
      ...ApiTools.getByTag(tag),
      ...SystemTools.getByTag(tag)
    ];
  } catch (error) {
    console.error('按标签获取预设工具时出错:', error);
    return [];
  }
}
