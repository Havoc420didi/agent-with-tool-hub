# 西城咖啡工具集合 (外部工具)

基于 `westore-cafe.json` 中定义的工具，作为外部工具实现的西城咖啡小程序工具集合。该工具集合位于 `external-tools/` 目录下，通过 `ExternalToolAdapter` 集成到 tool-hub 系统中。

## 工具列表

### 1. displayGoods - 展示商品列表
- **功能**: 向用户展示商品列表，最多3个商品
- **权限级别**: PUBLIC
- **安全级别**: AUTO
- **参数**: 
  - `goodsList`: 商品列表数组
- **使用场景**: 用户询问商品推荐时

### 2. getGoodsDetail - 获取商品详情
- **功能**: 获取商品详细的规格信息
- **权限级别**: PUBLIC
- **安全级别**: AUTO
- **参数**:
  - `items`: 需要获取详情的商品ID列表
- **使用场景**: 下单前需要了解商品规格

### 3. displayGoodsDetailToUser - 展示商品规格信息
- **功能**: 通过UI卡片展示商品规格信息
- **权限级别**: PUBLIC
- **安全级别**: HUMAN
- **参数**:
  - `items`: 需要展示详情的商品ID列表
- **使用场景**: 需要用户确认规格信息

### 4. addToCart - 加入购物车
- **功能**: 将商品加入购物车
- **权限级别**: PUBLIC
- **安全级别**: AUTO
- **参数**:
  - `items`: 购物车商品列表（包含skuId和数量）
- **使用场景**: 用户选择商品后加入购物车

### 5. order - 点单
- **功能**: 提交订单
- **权限级别**: PUBLIC
- **安全级别**: HUMAN
- **参数**:
  - `items`: 订单商品列表（包含skuId和数量）
- **使用场景**: 用户确认下单

### 6. clearShopCart - 清空购物车
- **功能**: 清空购物车中的所有商品
- **权限级别**: PUBLIC
- **安全级别**: AUTO
- **参数**: 无
- **使用场景**: 用户需要快速清空购物车

### 7. deleteProduct - 删除购物车商品
- **功能**: 删除购物车中的特定商品
- **权限级别**: PUBLIC
- **安全级别**: AUTO
- **参数**:
  - `skuId`: 需要删除的商品规格ID
  - `num`: 删除后剩余的数量
- **使用场景**: 用户需要删除特定商品

### 8. getOrderStatus - 获取订单状态
- **功能**: 查询订单状态
- **权限级别**: PUBLIC
- **安全级别**: AUTO
- **参数**:
  - `orderOffest`: 订单偏移量（0-4）
- **使用场景**: 用户查询订单进度

### 9. displayShopCart - 展示购物车
- **功能**: 展示购物车内容
- **权限级别**: PUBLIC
- **安全级别**: AUTO
- **参数**: 无
- **使用场景**: 用户查看购物车或下单前确认

## 使用方法

### 1. 基本使用 (外部工具)

```typescript
import { ToolHub } from '../src/tool-hub/core/tool-hub.js';
import { ExternalToolLoader } from '../src/tool-hub/adapters/external-tool-adapter.js';

// 创建 ToolHub 实例
const toolHub = new ToolHub();

// 加载外部西城咖啡工具
const westoreTools = await ExternalToolLoader.loadFromPath('./external-tools/westore-cafe-tools.js');

// 注册工具
toolHub.registerBatch(westoreTools);

// 使用工具
const result = await toolHub.execute('displayGoods', {
  goodsList: [
    {
      goodsId: '001',
      goodsName: '经典美式',
      goodsPrice: 25,
      picture: 'https://example.com/americano.jpg',
      keywords: '咖啡,经典,美式'
    }
  ]
});
```

### 2. 完整购物流程示例

```typescript
// 1. 展示商品
await toolHub.execute('displayGoods', { goodsList: [...] });

// 2. 获取商品详情
await toolHub.execute('getGoodsDetail', { items: [{ goodsId: 1 }] });

// 3. 展示规格信息
await toolHub.execute('displayGoodsDetailToUser', { items: [{ goodsId: 1 }] });

// 4. 加入购物车
await toolHub.execute('addToCart', { items: [{ skuId: 101, num: 1 }] });

// 5. 查看购物车
await toolHub.execute('displayShopCart', {});

// 6. 下单
await toolHub.execute('order', { items: [{ skuId: 101, num: 1 }] });

// 7. 查询订单状态
await toolHub.execute('getOrderStatus', { orderOffest: 0 });
```

## 测试

### 运行所有测试

```bash
# 运行基础功能测试
npx tsx tests/test-westore-cafe-tools.mts

# 运行API接口测试
npx tsx tests/test-westore-cafe-api.mts

# 运行外部工具使用示例
npx tsx examples/external-tool-usage.mts

# 运行所有测试
npx tsx scripts/run-westore-tests.mts
```

### 测试内容

1. **基础功能测试** (`test-westore-cafe-tools.mts`)
   - 测试所有工具的基本功能
   - 验证参数验证和错误处理
   - 测试工具搜索和统计功能

2. **API接口测试** (`test-westore-cafe-api.mts`)
   - 模拟完整的用户购物流程
   - 测试并发执行性能
   - 验证错误处理机制

## 数据结构

### 商品信息 (GoodsItem)
```typescript
interface GoodsItem {
  goodsId: string;      // 商品ID
  goodsName: string;    // 商品名称
  goodsPrice: number;   // 商品价格
  picture: string;      // 商品图片URL
  keywords: string;     // 商品标签
}
```

### 购物车商品 (CartItem)
```typescript
interface CartItem {
  skuId: number;        // 商品规格ID
  num: number;          // 商品数量
}
```

## 权限和安全

- **权限级别**: 所有工具默认为 PUBLIC 权限
- **安全级别**: 
  - 大部分工具为 AUTO（自动执行）
  - `displayGoodsDetailToUser` 和 `order` 为 HUMAN（需要人工确认）

## 标签系统

所有西城咖啡工具都包含以下标签：
- `westore`: 标识为西城咖啡相关工具
- `cafe`: 咖啡相关
- 功能相关标签：`goods`, `cart`, `order`, `display` 等

可以通过标签搜索相关工具：

```typescript
const westoreTools = toolHub.search({ tags: ['westore'] });
```

## 外部工具特性

### 1. 独立部署
- 工具集合位于 `external-tools/` 目录
- 不依赖 tool-hub 内部实现
- 可以独立开发和维护

### 2. 适配器集成
- 通过 `ExternalToolAdapter` 转换为内部格式
- 自动处理类型转换和权限映射
- 支持动态加载和热更新

### 3. 类型安全
- 外部工具定义自己的类型系统
- 适配器确保类型兼容性
- 完整的 TypeScript 支持

## 注意事项

1. 所有工具都包含完整的参数验证
2. 错误处理机制完善，会返回详细的错误信息
3. 支持并发执行，性能良好
4. 包含完整的统计和监控功能
5. 外部工具通过适配器集成到 tool-hub 系统
6. 支持动态加载，无需重启服务
