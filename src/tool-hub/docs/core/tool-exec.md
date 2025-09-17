我来分析一下 `tool-executor.ts` 中的缓存机制的作用和实现。

基于对代码的分析，`tool-executor.ts` 中的缓存机制有以下几个重要作用：

## 缓存机制的主要作用

### 1. **性能优化**
- **避免重复计算**：当相同的工具使用相同的输入参数和上下文被多次调用时，直接返回缓存的结果，避免重复执行
- **减少执行时间**：特别是对于计算密集型或网络请求类的工具，缓存可以显著提升响应速度

### 2. **资源节约**
- **减少外部API调用**：对于调用外部服务的工具，缓存可以避免重复的网络请求
- **降低系统负载**：减少不必要的计算和I/O操作

### 3. **缓存配置**
```typescript
// 默认配置：5分钟TTL，最大1000条缓存
this.cacheConfig = cacheConfig || { ttl: 300000, maxSize: 1000 };
```

### 4. **缓存键生成**
```typescript
private getCacheKey(toolName: string, input: any, context?: ToolExecutionContext): string {
  const inputStr = JSON.stringify(input);
  const contextStr = context ? JSON.stringify(context) : '';
  return `${toolName}_${Buffer.from(inputStr + contextStr).toString('base64')}`;
}
```
- 基于工具名称、输入参数和执行上下文生成唯一缓存键
- 确保不同参数或上下文的结果不会互相覆盖

### 5. **缓存管理**
- **TTL机制**：缓存有过期时间（默认5分钟），过期后自动失效
- **大小限制**：最大缓存1000条，超出时删除最旧的缓存项
- **手动清理**：提供 `clearCache()` 方法清空所有缓存

### 6. **缓存命中检测**
```typescript
if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
  return {
    ...cached.result,
    executionTime: Date.now() - startTime,
    toolName: config.name,
    context: options.context,
    fromCache: true  // 标记结果来自缓存
  };
}
```

### 7. **使用场景**
- **API调用工具**：避免重复调用相同的外部API
- **计算密集型工具**：缓存复杂计算结果
- **数据查询工具**：缓存数据库查询结果
- **文件处理工具**：缓存文件读取或处理结果

### 8. **缓存统计**
```typescript
getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
  return {
    size: this.cache.size,
    maxSize: this.cacheConfig.maxSize
  };
}
```

这个缓存机制特别适合在AI Agent系统中，因为Agent可能会在对话过程中多次调用相同的工具来处理相似的任务，缓存可以显著提升整体性能和用户体验。