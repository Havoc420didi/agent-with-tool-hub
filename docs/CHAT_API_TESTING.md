# Chat API 测试指南

本指南介绍如何测试西城咖啡工具通过 Chat API 的效果。

## 测试脚本

### 1. 快速测试 (`test-quick-chat.mts`)

快速验证 Chat API 和西城咖啡工具的基本集成：

```bash
npx tsx tests/test-quick-chat.mts
```

**测试内容:**
- 加载西城咖啡工具
- 发送简单对话请求
- 验证工具调用和响应

### 2. 完整测试 (`test-westore-cafe-api-chat.mts`)

全面测试西城咖啡工具在 Chat API 中的各种场景：

```bash
npx tsx tests/test-westore-cafe-api-chat.mts
```

**测试场景:**
- 商品推荐场景
- 购物车完整流程
- 订单管理场景
- 流式响应测试
- 错误处理测试

### 3. 批量测试 (`run-chat-tests.mts`)

运行所有 Chat API 测试：

```bash
npx tsx scripts/run-chat-tests.mts
```

## 测试场景详解

### 1. 商品推荐场景

测试用户询问商品推荐时的工具调用：

```typescript
// 测试用例
const testCases = [
  {
    name: '咖啡推荐',
    message: '有什么咖啡推荐吗？我想喝点热饮。',
    expectedTools: ['displayGoods']
  },
  {
    name: '甜品推荐',
    message: '推荐一些甜品吧，我想吃点甜的。',
    expectedTools: ['displayGoods']
  },
  {
    name: '具体商品询问',
    message: '我想了解经典美式的详细信息，包括规格和价格。',
    expectedTools: ['getGoodsDetail', 'displayGoodsDetailToUser']
  }
];
```

### 2. 购物车完整流程

测试完整的购物流程：

```typescript
const testFlow = [
  {
    step: 1,
    name: '查看商品',
    message: '我想看看有什么咖啡可以点',
    expectedTools: ['displayGoods']
  },
  {
    step: 2,
    name: '加入购物车',
    message: '我要一杯热的美式咖啡，中杯的',
    expectedTools: ['getGoodsDetail', 'addToCart']
  },
  {
    step: 3,
    name: '查看购物车',
    message: '让我看看购物车里有什么',
    expectedTools: ['displayShopCart']
  },
  {
    step: 4,
    name: '继续购物',
    message: '再给我加一杯生椰拿铁，大杯的',
    expectedTools: ['addToCart']
  },
  {
    step: 5,
    name: '确认下单',
    message: '好的，我要下单了',
    expectedTools: ['displayShopCart', 'order']
  }
];
```

### 3. 订单管理场景

测试订单相关的功能：

```typescript
const testCases = [
  {
    name: '查询订单状态',
    message: '我的订单状态如何？取餐号是多少？',
    expectedTools: ['getOrderStatus']
  },
  {
    name: '修改购物车',
    message: '我想删除购物车中的冰美式',
    expectedTools: ['deleteProduct']
  },
  {
    name: '清空购物车',
    message: '把购物车里的东西都删掉',
    expectedTools: ['clearShopCart']
  }
];
```

## API 配置

### 环境变量

确保以下环境变量已配置：

```bash
# .env 文件
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=your_api_key_here
API_BASE_URL=http://localhost:3000
```

### API 请求格式

```typescript
const requestBody = {
  message: '用户消息',
  threadId: 'optional_thread_id',
  model: {
    name: 'deepseek-chat',
    temperature: 0,
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY
  },
  memory: { enabled: true },
  streaming: false,
  tools: tools, // 西城咖啡工具数组
  toolExecution: {
    mode: 'INTERNAL',
    internalConfig: {
      enableCache: true,
      cacheTtl: 300000,
      maxRetries: 3
    }
  }
};
```

## 预期结果

### 成功响应格式

```typescript
{
  success: true,
  data: {
    content: "助手回复内容",
    toolCalls: [
      {
        toolName: "displayGoods",
        args: { goodsList: [...] }
      }
    ],
    metadata: {
      threadId: "thread_id",
      timestamp: "2024-01-01T00:00:00.000Z",
      toolsUsed: ["displayGoods"]
    }
  }
}
```

### 工具调用验证

测试脚本会验证：

1. **工具调用正确性**: 检查调用的工具是否符合预期
2. **参数传递**: 验证工具参数是否正确传递
3. **响应格式**: 确保 API 响应格式正确
4. **错误处理**: 测试各种错误情况的处理

## 故障排除

### 常见问题

1. **API 连接失败**
   ```
   ❌ API 健康检查失败
   💡 请确保服务器正在运行: npm run dev
   ```

2. **工具加载失败**
   ```
   ❌ 加载西城咖啡工具失败
   💡 检查 external-tools/westore-cafe-tools.js 文件是否存在
   ```

3. **认证失败**
   ```
   ❌ HTTP 401: Unauthorized
   💡 检查 OPENAI_API_KEY 环境变量是否正确
   ```

### 调试技巧

1. **启用详细日志**
   ```typescript
   const toolHub = new ToolHub({
     logging: true,
     logLevel: 'debug'
   });
   ```

2. **检查工具注册**
   ```typescript
   console.log('注册的工具:', toolHub.getAll().map(t => t.name));
   ```

3. **验证 API 端点**
   ```bash
   curl -X GET http://localhost:3000/api/health
   ```

## 测试数据

### 商品数据示例

```typescript
const sampleGoods = [
  {
    goodsId: '001',
    goodsName: '经典美式',
    goodsPrice: 25,
    picture: 'https://example.com/americano.jpg',
    keywords: '咖啡,经典,美式'
  },
  {
    goodsId: '002',
    goodsName: '生椰拿铁',
    goodsPrice: 28,
    picture: 'https://example.com/coconut-latte.jpg',
    keywords: '咖啡,拿铁,椰奶'
  }
];
```

### 购物车数据示例

```typescript
const sampleCartItems = [
  { skuId: 101, num: 2 }, // 2杯冰美式
  { skuId: 102, num: 1 }  // 1杯生椰拿铁
];
```

## 性能测试

### 并发测试

```typescript
// 并发发送多个请求
const promises = Array.from({ length: 10 }, (_, i) => 
  sendChatRequest(`测试消息 ${i}`, `thread_${i}`, tools)
);

const results = await Promise.all(promises);
console.log(`并发测试完成: ${results.length} 个请求`);
```

### 响应时间测试

```typescript
const startTime = Date.now();
const result = await sendChatRequest('测试消息', undefined, tools);
const endTime = Date.now();
console.log(`响应时间: ${endTime - startTime}ms`);
```

## 总结

通过 Chat API 测试，可以验证：

1. ✅ 西城咖啡工具正确集成到 Chat API
2. ✅ 工具调用和参数传递正常工作
3. ✅ 完整的购物流程可以正常执行
4. ✅ 流式响应和错误处理机制正常
5. ✅ 性能和并发处理能力符合预期

这些测试确保了西城咖啡工具在实际应用中的可用性和稳定性。
