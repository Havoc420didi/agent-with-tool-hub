// westore-cafe-tools.ts - 西城咖啡小程序工具集合

import { z } from 'zod';
import { 
  ToolConfig, 
  ToolResult, 
  ToolSecurityLevel,
  createToolConfig 
} from '../../src/tool-hub/types/tool.types';

// 辅助函数
export class ToolHelpers {
  static createSuccessResult(data: any, metadata?: Record<string, any>): ToolResult {
    return {
      success: true,
      data,
      metadata
    };
  }

  static createErrorResult(error: string, metadata?: Record<string, any>): ToolResult {
    return {
      success: false,
      error,
      metadata
    };
  }
}

/**
 * 商品信息接口
 */
interface GoodsItem {
  goodsId: string;
  goodsName: string;
  goodsPrice: number;
  picture: string;
  keywords: string;
}

/**
 * 商品详情项接口
 */
interface GoodsDetailItem {
  goodsId: number;
}

/**
 * 购物车商品接口
 */
interface CartItem {
  skuId: number;
  num: number;
}

/**
 * Westore Cafe 工具集合
 */
export class WestoreCafeTools {
  /**
   * 展示商品列表
   */
  static displayGoods(): ToolConfig {
    return createToolConfig({
      name: 'displayGoods',
      description: '向用户展示基本的商品列表。如（有什么咖啡推荐、推荐一些吃的...），此时结合页面State中的商品信息，调用此接口向用户展示匹配用户需求的商品列表，此接口会用UI展示商品。最多展示3个商品。如果用户询问的是商品的规格，请调用 getGoodsDetail 获取商品详情。如果用户询问的商品不存在，调用这个方法向用户展示相近的商品',
      schema: z.object({
        goodsList: z.array(z.object({
          goodsId: z.string().describe('商品id'),
          goodsName: z.string().describe('商品名称'),
          goodsPrice: z.number().describe('商品价格'),
          picture: z.string().describe('商品图片url'),
          keywords: z.string().describe('商品标签')
        })).describe('商品列表，最多3个商品')
      }),
      handler: async (input: { goodsList: GoodsItem[] }) => {
        try {
          const { goodsList } = input;
          
          if (!goodsList || goodsList.length === 0) {
            return ToolHelpers.createErrorResult('商品列表不能为空');
          }

          if (goodsList.length > 3) {
            return ToolHelpers.createErrorResult('最多只能展示3个商品');
          }

          // 模拟UI展示商品
          const displayResult = {
            message: '商品展示成功',
            goodsCount: goodsList.length,
            goods: goodsList.map(item => ({
              id: item.goodsId,
              name: item.goodsName,
              price: `¥${item.goodsPrice}`,
              image: item.picture,
              tags: item.keywords.split(',').map(tag => tag.trim())
            }))
          };

          return ToolHelpers.createSuccessResult(displayResult);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'goods', 'display']
    });
  }

  /**
   * 获取商品详情
   */
  static getGoodsDetail(): ToolConfig {
    return createToolConfig({
      name: 'getGoodsDetail',
      description: '获取商品详细的规格信息，调用 order 或 addToCart 之前，需要先调用 getGoodsDetail 获取商品详情，如果用户的需求已包含商品详情中的规格信息，请你向用户再次确认规格后再进行后续操作，如果用户未指定规格信息，调用 displayGoodsDetailToUser 向用户展示规格信息',
      schema: z.object({
        items: z.array(z.object({
          goodsId: z.number().describe('需要获取详情的商品 id')
        })).describe('需要获取详情的商品列表')
      }),
      handler: async (input: { items: GoodsDetailItem[] }) => {
        try {
          const { items } = input;
          
          if (!items || items.length === 0) {
            return ToolHelpers.createErrorResult('商品ID列表不能为空');
          }

          // 模拟获取商品详情
          const goodsDetails = items.map(item => ({
            goodsId: item.goodsId,
            name: `商品${item.goodsId}`,
            specifications: [
              { skuId: item.goodsId * 100 + 1, name: '热饮', price: 25, available: true },
              { skuId: item.goodsId * 100 + 2, name: '冰饮', price: 25, available: true },
              { skuId: item.goodsId * 100 + 3, name: '去冰', price: 25, available: true }
            ],
            sizes: [
              { name: '中杯', price: 0 },
              { name: '大杯', price: 3 },
              { name: '超大杯', price: 6 }
            ],
            addons: [
              { name: '加糖', price: 1 },
              { name: '加奶', price: 2 },
              { name: '加冰', price: 0 }
            ]
          }));

          return ToolHelpers.createSuccessResult({
            message: '商品详情获取成功',
            goodsDetails
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'goods', 'detail']
    });
  }

  /**
   * 展示商品规格信息
   */
  static displayGoodsDetailToUser(): ToolConfig {
    return createToolConfig({
      name: 'displayGoodsDetailToUser',
      description: '通过 UI 卡片向用户展示商品规格信息，如查看经典美式的规格信息等..., 这一步是函数执行的结尾，需要用户再次确认后，再执行order 或其他后续操作',
      schema: z.object({
        items: z.array(z.object({
          goodsId: z.number().describe('需要获取详情的商品 id')
        })).describe('需要展示详情的商品列表')
      }),
      handler: async (input: { items: GoodsDetailItem[] }) => {
        try {
          const { items } = input;
          
          if (!items || items.length === 0) {
            return ToolHelpers.createErrorResult('商品ID列表不能为空');
          }

          // 模拟UI展示商品详情
          const displayResult = {
            message: '商品规格信息展示成功',
            items: items.map(item => ({
              goodsId: item.goodsId,
              displayCard: {
                title: `商品${item.goodsId}规格信息`,
                specifications: ['热饮', '冰饮', '去冰'],
                sizes: ['中杯', '大杯', '超大杯'],
                addons: ['加糖', '加奶', '加冰'],
                note: '请确认规格后继续操作'
              }
            }))
          };

          return ToolHelpers.createSuccessResult(displayResult);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'goods', 'display', 'specification'],
    });
  }

  /**
   * 加入购物车
   */
  static addToCart(): ToolConfig {
    return createToolConfig({
      name: 'addToCart',
      description: 'wxcafe小程序加入购物车服务，支持一次加入多个商品。用户可能这样问：要一杯鲜榨橙汁吧、购物车中加入两杯冰美式和一杯生椰拿铁、我想喝生椰拿铁和芒果奶冻。通常向用户展示完商品后下一步就是加入购物车。加入购物车后可提醒用户确认下单。如果用户描述不明确（比如没有说明 温度、糖度、是否加料等信息），用户输入的商品没有严格匹配成功，请你先调用 getGoodsDetail 获取商品详情，然后根据用户描述，从商品详情中选取一个 skuid，再调用此函数加入购物车。执行这个函数后，UI 组件会展示当前购物车的状态。',
      schema: z.object({
        items: z.array(z.object({
          skuId: z.number().describe('需要加入购物车的商品规格 id'),
          num: z.number().describe('需要加入购物车的商品数量')
        })).describe('需要加入购物车的商品列表')
      }),
      handler: async (input: { items: CartItem[] }) => {
        try {
          const { items } = input;
          
          if (!items || items.length === 0) {
            return ToolHelpers.createErrorResult('购物车商品列表不能为空');
          }

          // 模拟加入购物车
          const cartResult = {
            message: '商品已加入购物车',
            addedItems: items.map(item => ({
              skuId: item.skuId,
              quantity: item.num,
              status: 'success'
            })),
            cartSummary: {
              totalItems: items.reduce((sum, item) => sum + item.num, 0),
              totalPrice: items.reduce((sum, item) => sum + (item.num * 25), 0) // 假设每个商品25元
            }
          };

          return ToolHelpers.createSuccessResult(cartResult);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'cart', 'add'],
    });
  }

  /**
   * 点单
   */
  static order(): ToolConfig {
    return createToolConfig({
      name: 'order',
      description: 'wxcafe小程序点单函数，点单前先调用 getGoodsDetail 获取商品详情。1. 如果用户描述不明确（比如没有说明 温度、糖度、是否加料等信息），先向用户确认具体的规格信息， 再选取正确的 skuid调用此函数进行点单。2. 如果用户描述明确，请在下单前向用户确认即将下单的商品，再进行下单。3.确认目标商品之后，必须先执行 displayShopCart 工具给用户查看接下来会下单哪些商品。4. 例句：来一杯生椰拿铁，帮我点一杯冰美式，帮我买个吃的',
      schema: z.object({
        items: z.array(z.object({
          skuId: z.number().describe('需要点的商品规格 id'),
          num: z.number().describe('需要点的商品数量')
        })).describe('需要下单的商品列表')
      }),
      handler: async (input: { items: CartItem[] }) => {
        try {
          const { items } = input;
          
          if (!items || items.length === 0) {
            return ToolHelpers.createErrorResult('订单商品列表不能为空');
          }

          // 模拟下单
          const orderId = `ORDER_${Date.now()}`;
          const orderResult = {
            message: '订单提交成功',
            orderId,
            orderItems: items.map(item => ({
              skuId: item.skuId,
              quantity: item.num,
              price: 25 // 假设每个商品25元
            })),
            totalAmount: items.reduce((sum, item) => sum + (item.num * 25), 0),
            status: 'pending',
            estimatedTime: '15-20分钟',
            pickupNumber: Math.floor(Math.random() * 100) + 1
          };

          return ToolHelpers.createSuccessResult(orderResult);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'order', 'purchase'],
      securityLevel: ToolSecurityLevel.HUMAN,
    });
  }

  /**
   * 清空购物车
   */
  static clearShopCart(): ToolConfig {
    return createToolConfig({
      name: 'clearShopCart',
      description: '将购物车中的所有商品一次性全部移除，适用于用户需要快速清空购物车的场景。例如：用户说"清空购物车"、"把购物车里的东西都删掉"。',
      schema: z.object({}),
      handler: async () => {
        try {
          // 模拟清空购物车
          const clearResult = {
            message: '购物车已清空',
            clearedItems: 0, // 实际应该返回清空的商品数量
            cartStatus: 'empty'
          };

          return ToolHelpers.createSuccessResult(clearResult);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'cart', 'clear']
    });
  }

  /**
   * 删除购物车商品
   */
  static deleteProduct(): ToolConfig {
    return createToolConfig({
      name: 'deleteProduct',
      description: 'wxcafe小程序删除购物车中的某个商品，商品名必须严格匹配，否则直接回复用户无该商品。例如：删除购物车中的冰美式，删除一杯购物车中的生椰拿铁；然后这个工具会展示删除后的购物车状态。',
      schema: z.object({
        skuId: z.number().describe('需要删除的商品规格 id'),
        num: z.number().describe('删除后剩余的数量')
      }),
      handler: async (input: { skuId: number; num: number }) => {
        try {
          const { skuId, num } = input;
          
          // 模拟删除商品
          const deleteResult = {
            message: '商品删除成功',
            deletedSkuId: skuId,
            remainingQuantity: num,
            cartStatus: num > 0 ? 'has_items' : 'empty'
          };

          return ToolHelpers.createSuccessResult(deleteResult);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'cart', 'delete'],
    });
  }

  /**
   * 获取订单状态
   */
  static getOrderStatus(): ToolConfig {
    return createToolConfig({
      name: 'getOrderStatus',
      description: 'wxcafe 获取订单状态服务，用户可能会这样询问：我的取餐号是多少，我的订单做好了吗',
      schema: z.object({
        orderOffest: z.number().min(0).max(4).describe('订单偏移量，用于告诉用户订单状态，0 表示最新订单，1 表示第二新订单，以此类推。min 0， max 4。')
      }),
      handler: async (input: { orderOffest: number }) => {
        try {
          const { orderOffest } = input;
          
          // 模拟获取订单状态
          const orderStatuses = [
            { orderId: 'ORDER_001', status: 'ready', pickupNumber: 15, estimatedTime: '已完成' },
            { orderId: 'ORDER_002', status: 'preparing', pickupNumber: 16, estimatedTime: '5分钟' },
            { orderId: 'ORDER_003', status: 'pending', pickupNumber: 17, estimatedTime: '10分钟' },
            { orderId: 'ORDER_004', status: 'pending', pickupNumber: 18, estimatedTime: '15分钟' },
            { orderId: 'ORDER_005', status: 'pending', pickupNumber: 19, estimatedTime: '20分钟' }
          ];

          const order = orderStatuses[orderOffest];
          if (!order) {
            return ToolHelpers.createErrorResult('订单不存在');
          }

          const statusResult = {
            message: '订单状态获取成功',
            order: {
              orderId: order.orderId,
              status: order.status,
              pickupNumber: order.pickupNumber,
              estimatedTime: order.estimatedTime,
              statusText: this.getStatusText(order.status)
            }
          };

          return ToolHelpers.createSuccessResult(statusResult);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'order', 'status']
    });
  }

  /**
   * 展示购物车
   */
  static displayShopCart(): ToolConfig {
    return createToolConfig({
      name: 'displayShopCart',
      description: '通过 UI 组件的方式展示购物车，通常在用户询问购物车时调用；以及在 order 点单之前必须先调用 displayShopCart 或之前调用过 addShopCart 展示购物车，等待用户确认后再执行 order 下单。',
      schema: z.object({}),
      handler: async () => {
        try {
          // 模拟展示购物车
          const cartDisplay = {
            message: '购物车展示成功',
            cartItems: [
              { skuId: 101, name: '冰美式', quantity: 2, price: 25, total: 50 },
              { skuId: 102, name: '生椰拿铁', quantity: 1, price: 28, total: 28 }
            ],
            summary: {
              totalItems: 3,
              totalAmount: 78,
              isEmpty: false
            }
          };

          return ToolHelpers.createSuccessResult(cartDisplay);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      tags: ['westore', 'cafe', 'cart', 'display']
    });
  }

  /**
   * 获取状态文本
   */
  private static getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'ready': '订单已完成，请取餐',
      'preparing': '正在制作中',
      'pending': '等待制作'
    };
    return statusMap[status] || '未知状态';
  }

  /**
   * 获取所有 Westore Cafe 工具
   */
  static getAll(): ToolConfig[] {
    return [
      this.displayGoods(),
      this.getGoodsDetail(),
      this.displayGoodsDetailToUser(),
      this.addToCart(),
      this.order(),
      this.clearShopCart(),
      this.deleteProduct(),
      this.getOrderStatus(),
      this.displayShopCart()
    ];
  }

  /**
   * 按标签获取工具
   */
  static getByTag(tag: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.tags?.includes(tag));
  }
}
