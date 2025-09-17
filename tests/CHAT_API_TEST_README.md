# Chat API 测试说明

本目录包含用于测试西城咖啡工具通过 Chat API 效果的测试脚本。

## 快速开始

### 1. 启动服务器

```bash
# 启动开发服务器
npm run dev
```

### 2. 运行快速测试

```bash
# 快速测试基本功能
npx tsx tests/test-quick-chat.mts
```

### 3. 运行完整测试

```bash
# 完整测试所有场景
npx tsx tests/test-westore-cafe-api-chat.mts
```

### 4. 运行所有测试

```bash
# 运行所有 Chat API 测试
npx tsx scripts/run-chat-tests.mts
```

## 测试脚本说明

### `test-quick-chat.mts`
- **用途**: 快速验证 Chat API 和西城咖啡工具的基本集成
- **测试内容**: 
  - 加载西城咖啡工具
  - 发送简单对话请求
  - 验证工具调用和响应
- **运行时间**: 约 30 秒

### `test-westore-cafe-api-chat.mts`
- **用途**: 全面测试西城咖啡工具在 Chat API 中的各种场景
- **测试场景**:
  - 商品推荐场景
  - 购物车完整流程
  - 订单管理场景
  - 流式响应测试
  - 错误处理测试
- **运行时间**: 约 2-3 分钟

## 测试场景示例

### 1. 商品推荐
```
用户: "有什么咖啡推荐吗？我想喝点热饮。"
预期: 调用 displayGoods 工具展示商品列表
```

### 2. 购物流程
```
用户: "我要一杯热的美式咖啡，中杯的"
预期: 调用 getGoodsDetail → addToCart 工具
```

### 3. 订单管理
```
用户: "我的订单状态如何？取餐号是多少？"
预期: 调用 getOrderStatus 工具查询订单
```

## 环境要求

### 必需环境变量
```bash
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=your_api_key_here
API_BASE_URL=http://localhost:3000
```

### 依赖检查
- Node.js 18+
- TypeScript
- 服务器正在运行 (npm run dev)

## 预期结果

### 成功响应示例
```json
{
  "success": true,
  "data": {
    "content": "为您推荐以下咖啡：\n1. 经典美式 - ¥25\n2. 生椰拿铁 - ¥28",
    "toolCalls": [
      {
        "toolName": "displayGoods",
        "args": {
          "goodsList": [...]
        }
      }
    ],
    "metadata": {
      "toolsUsed": ["displayGoods"],
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## 故障排除

### 常见问题

1. **服务器未启动**
   ```
   ❌ API 健康检查失败
   💡 请确保服务器正在运行: npm run dev
   ```

2. **API 密钥错误**
   ```
   ❌ HTTP 401: Unauthorized
   💡 检查 OPENAI_API_KEY 环境变量
   ```

3. **工具加载失败**
   ```
   ❌ 加载西城咖啡工具失败
   💡 检查 external-tools/westore-cafe-tools.js 文件
   ```

### 调试技巧

1. **检查服务器状态**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **查看详细日志**
   ```bash
   DEBUG=* npx tsx tests/test-quick-chat.mts
   ```

3. **单独测试工具**
   ```bash
   npx tsx tests/test-westore-cafe-tools.mts
   ```

## 测试数据

测试脚本使用模拟数据，包括：

- 商品信息 (咖啡、甜品等)
- 购物车商品
- 订单状态
- 用户对话场景

## 性能指标

- **响应时间**: < 5 秒
- **工具调用成功率**: > 95%
- **并发处理**: 支持 10+ 并发请求
- **内存使用**: < 100MB

## 贡献

如需添加新的测试场景或改进现有测试：

1. 在 `test-westore-cafe-api-chat.mts` 中添加新的测试用例
2. 更新 `CHAT_API_TESTING.md` 文档
3. 运行测试确保通过
4. 提交 Pull Request

## 相关文档

- [西城咖啡工具文档](docs/WESTORE_CAFE_TOOLS.md)
- [外部工具开发指南](docs/EXTERNAL_TOOL_DEVELOPMENT.md)
- [Chat API 测试指南](docs/CHAT_API_TESTING.md)
