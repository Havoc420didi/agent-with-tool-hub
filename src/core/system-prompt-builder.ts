// system-prompt-builder.ts - 系统提示词构建器组件

import { ToolRegistry } from '../tool-hub/core/tool-registry';
import Logger from '../utils/logger';

/**
 * 系统提示词配置选项
 */
export interface SystemPromptOptions {
  /** 是否包含不可用工具 */
  includeUnavailable?: boolean;
  /** 是否包含参数详情 */
  includeParameters?: boolean;
  /** 是否包含统计信息 */
  includeStatistics?: boolean;
  /** 是否包含依赖关系 */
  includeDependencies?: boolean;
  /** 自定义前缀 */
  customPrefix?: string;
}

/**
 * 标签内容配置
 */
export interface TagConfig {
  /** 标签名称 */
  name: string;
  /** 标签内容 */
  content: string | string[];
}

/**
 * 上下文信息配置
 */
export interface ContextConfig {
  /** 用户信息 */
  userInfo?: string;
  /** 记忆摘要 */
  memorySummary?: string;
  /** 开发者上下文 */
  developerContext?: string;
  /** 其他上下文信息 */
  additionalContext?: Record<string, string>;
}

/**
 * 系统提示词构建配置
 */
export interface SystemPromptBuildConfig {
  /** 系统提示词类型 */
  kind: 'generic' | 'wechat' | 'custom';
  /** 配置参数 */
  config: any;
  /** 工具选项 */
  options?: SystemPromptOptions;
}

/**
 * 系统提示词构建器
 */
export class SystemPromptBuilder {
  private toolRegistry?: ToolRegistry;
  private logger: typeof Logger;

  constructor(toolRegistry?: ToolRegistry) {
    this.toolRegistry = toolRegistry;
    this.logger = Logger;
  }

  /**
   * 设置工具注册表
   */
  setToolRegistry(toolRegistry: ToolRegistry): void {
    this.toolRegistry = toolRegistry;
  }

  /**
   * 构建完整的系统提示词
   */
  buildSystemPrompt(
    tags: TagConfig[],
    context?: ContextConfig,
    toolOptions?: SystemPromptOptions
  ): string {
    const sections: string[] = [];

    // 1. 标签部分
    tags.forEach(tag => {
      sections.push(this.buildTagSection(tag));
    });

    // 2. 工具部分
    // if (this.toolRegistry) {
    //   const toolPrompt = this.buildToolSection(toolOptions);
    //   if (toolPrompt) {
    //     sections.push(toolPrompt);
    //   }
    // }

    // 3. 自定义前缀 // TODO
    if (toolOptions?.customPrefix) {
      sections.unshift(toolOptions.customPrefix);
    }

    return sections.join('\n');
  }

  /**
   * 构建标签部分
   */
  private buildTagSection(tag: TagConfig): string {
    const lines: string[] = [];
    
    lines.push(`<${tag.name}>`);
    
    if (Array.isArray(tag.content)) {
      tag.content.forEach(item => {
        lines.push(item);
      });
    } else {
      lines.push(tag.content);
    }
    
    lines.push(`</${tag.name}>`);
    
    return lines.join('\n');
  }

  /**
   * 构建工具部分
   */
  private buildToolSection(options?: SystemPromptOptions): string {
    if (!this.toolRegistry) {
      return '';
    }

    try {
      const toolPrompt = this.toolRegistry.generateSystemPrompt({
        includeUnavailable: options?.includeUnavailable || false,
        includeParameters: options?.includeParameters !== false,
        includeStatistics: options?.includeStatistics !== false,
        includeDependencies: options?.includeDependencies || false
      });

      // return ''; // TEST no <toolcall-rules>
      return `<toolcall-rules>\n${toolPrompt}</toolcall-rules>`;
    } catch (error) {
      this.logger.warn('获取工具系统提示词失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
    }
  }

  /**
   * 截断文本
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.substring(0, maxLength)}...`;
  }

  /**
   * 构建微信小程序AI助手的系统提示词
   */
  buildWechatMiniProgramPrompt(
    userInfo: string,
    memorySummary: string,
    developerContext: string,
    toolOptions?: SystemPromptOptions
  ): string {
    const tags: TagConfig[] = [
      {
        name: 'Identity',
        content: [
          '你是微信小程序AI助手。支持外部工具调用的助手。你正在和用户对话，注意回答需要简洁准确。',
          '你擅长规划并使用工具，可以结合用户的提问，根据上下文的回答，选择恰当的工具组合使用。',
          '用户的历史会话中会携带会话时间，不要直接告诉用户会话时间，除非用户主动询问会话时间，才告知用户会话时间。',
          '间隔十分钟的会话视为新会话，对于新会话之前的记录不要进行强关联',
        ]
      },
      {
        name: 'Task',
        content: [
          '请根据用户意图，并结合contextInfo数据，调用合适的工具为用户提供服务。',
          '当需要调用工具时，必须严格按照以下流程操作：',
          '1. 先用简洁自然的语言向用户说明：',
          '  - 将要使用的工具名称，描述的文字使用中文回复，不要直接告知用户具体工具的名字，也不要太详细的描述工具的函数，要简短易懂一些（如：正在为你推荐适合夏天喝的饮品，请稍等哦）',
          '2. 只在解释后使用工具调用',
          '3. 工具执行后，总结的语言也要简洁，不要直接读出原始的函数执行结果，用自然的语言去总结',
        ]
      },
      {
        name: 'contextInfo',
        content: [
          `"userData": "{\"categories\":[{\"categoryId\":133,\"categoryName\":\"咖啡\",\"goodsList\":[{\"goodsId\":289,\"goodsName\":\"经典美式\",\"goodsPrice\":15},{\"goodsId\":295,\"goodsName\":\"油柑美式\",\"goodsPrice\":18},{\"goodsId\":353,\"goodsName\":\"凤梨美式\",\"goodsPrice\":18,\"keywords\":\"推荐\"},{\"goodsId\":362,\"goodsName\":\"葡萄冰美式\",\"goodsPrice\":18,\"keywords\":\"新品\"},{\"goodsId\":294,\"goodsName\":\"爆柠美式\",\"goodsPrice\":18},{\"goodsId\":296,\"goodsName\":\"鲜橙美式\",\"goodsPrice\":20},{\"goodsId\":297,\"goodsName\":\"橘皮拿铁\",\"goodsPrice\":20},{\"goodsId\":298,\"goodsName\":\"榛果拿铁\",\"goodsPrice\":20},{\"goodsId\":299,\"goodsName\":\"生椰拿铁\",\"goodsPrice\":20},{\"goodsId\":359,\"goodsName\":\"红茶拿铁\",\"goodsPrice\":20,\"keywords\":\"推荐\"},{\"goodsId\":195,\"goodsName\":\"拿铁\",\"goodsPrice\":18},{\"goodsId\":208,\"goodsName\":\"燕麦拿铁\",\"goodsPrice\":22},{\"goodsId\":293,\"goodsName\":\"白桃美式\",\"goodsPrice\":16,\"keywords\":\"茶咖\",\"state\":2}]},{\"categoryId\":135,\"categoryName\":\"果茶\",\"goodsList\":[{\"goodsId\":300,\"goodsName\":\"海盐柠檬\",\"goodsPrice\":13,\"keywords\":\"补充电解质\"},{\"goodsId\":301,\"goodsName\":\"白桃乌龙柠檬茶\",\"goodsPrice\":13},{\"goodsId\":302,\"goodsName\":\"鸭屎香柠檬茶\",\"goodsPrice\":13},{\"goodsId\":303,\"goodsName\":\"油柑柠檬茶\",\"goodsPrice\":16},{\"goodsId\":305,\"goodsName\":\"满杯百香果\",\"goodsPrice\":13},{\"goodsId\":306,\"goodsName\":\"百香益力多\",\"goodsPrice\":16},{\"goodsId\":307,\"goodsName\":\"柠檬益力多\",\"goodsPrice\":16},{\"goodsId\":315,\"goodsName\":\"蜂蜜柚子茶\",\"goodsPrice\":12},{\"goodsId\":364,\"goodsName\":\"黑加仑柠檬茶\",\"goodsPrice\":16,\"keywords\":\"新品\",\"state\":2}]},{\"categoryId\":136,\"categoryName\":\"果汁\",\"goodsList\":[{\"goodsId\":365,\"goodsName\":\"鲜榨西瓜汁\",\"goodsPrice\":13,\"keywords\":\"夏日限定\"},{\"goodsId\":308,\"goodsName\":\"轻体小绿瓶\",\"goodsPrice\":20,\"keywords\":\"现榨纤体果蔬汁\"},{\"goodsId\":312,\"goodsName\":\"鲜榨橙汁\",\"goodsPrice\":25,\"keywords\":\"现榨无糖0负担\"},{\"goodsId\":313,\"goodsName\":\"苹果胡萝卜汁\",\"goodsPrice\":20,\"keywords\":\"现榨无糖0负担\"},{\"goodsId\":309,\"goodsName\":\"杨枝甘露\",\"goodsPrice\":20,\"keywords\":\"推荐\"},{\"goodsId\":314,\"goodsName\":\"芒果奶昔\",\"goodsPrice\":20}]},{\"categoryId\":139,\"categoryName\":\"奶茶\",\"goodsList\":[{\"goodsId\":316,\"goodsName\":\"黑糖姜母茶\",\"goodsPrice\":12},{\"goodsId\":317,\"goodsName\":\"黑糖姜母奶\",\"goodsPrice\":15},{\"goodsId\":318,\"goodsName\":\"鸭屎香珍珠奶茶\",\"goodsPrice\":12},{\"goodsId\":319,\"goodsName\":\"茉莉奶白\",\"goodsPrice\":16},{\"goodsId\":320,\"goodsName\":\"白桃牛乳茶\",\"goodsPrice\":16},{\"goodsId\":321,\"goodsName\":\"抹茶鲜奶\",\"goodsPrice\":18},{\"goodsId\":322,\"goodsName\":\"生椰抹茶\",\"goodsPrice\":18},{\"goodsId\":323,\"goodsName\":\"燕麦抹茶\",\"goodsPrice\":22}]},{\"categoryId\":134,\"categoryName\":\"休闲零品\",\"goodsList\":[{\"goodsId\":271,\"goodsName\":\"蔓越莓麻薯\",\"goodsPrice\":2.5},{\"goodsId\":354,\"goodsName\":\"芒果奶冻\",\"goodsPrice\":3.5},{\"goodsId\":355,\"goodsName\":\"提拉米苏奶冻\",\"goodsPrice\":3.5},{\"goodsId\":244,\"goodsName\":\"葡挞\",\"goodsPrice\":2.5},{\"goodsId\":246,\"goodsName\":\"麻薯\",\"goodsPrice\":2.5}]}],\"goodsList\":[],\"histories\":[{\"goodsId\":362,\"goodsName\":\"葡萄冰美式\",\"skuId\":6877,\"skuName\":\"冰\",\"price\":\"18.00\",\"historyPicture\":\"\"},{\"goodsId\":365,\"goodsName\":\"鲜榨西瓜汁\",\"skuId\":6974,\"skuName\":\"冰/无糖\",\"price\":\"13.00\",\"historyPicture\":\"\"},{\"goodsId\":309,\"goodsName\":\"杨枝甘露\",\"skuId\":6556,\"skuName\":\"冰/正常糖\",\"price\":\"20.00\",\"historyPicture\":\"\"}],\"curCategory\":0,\"curCategoryName\":\"\",\"curGoods\":null,\"curGoodsSpecLength\":0,\"curSkuId\":0,\"curPrice\":0,\"curSku\":\"\",\"curNum\":1,\"carts\":[],\"cartNum\":0,\"totalPrice\":0,\"isShowGoodsSelectBg\":false,\"isShowGoodsSelect\":false,\"isShowCartBg\":false,\"isShowCart\":false,\"cartHeight\":298,\"categoryHeights\":[{\"categoryId\":0,\"height\":634.2},{\"categoryId\":133,\"height\":1429},{\"categoryId\":135,\"height\":1001},{\"categoryId\":136,\"height\":680},{\"categoryId\":139,\"height\":894},{\"categoryId\":134,\"height\":573}],\"goodsScrollTop\":0,\"goodsListItemMinHeight\":0,\"canNavigateMiniProgram\":true,\"canPay\":true,\"longTabIndex\":null,\"windowHeight\":844,\"pageTitleOpacity\":0,\"bannerHeight\":234,\"statusBarHeight\":47,\"statusBarHeightPX\":90.38461538461539,\"titleHeight\":93.8,\"goodScrollHeight\":\"auto\",\"bottomFixed\":\"fixed\",\"noScroll\":false,\"checkModelBottomHeight\":{\"rpx\":0,\"px\":0},\"categoryChange\":true}",`,
          // `"userSystemPrompt": "## 角色\nWeStore Cafe官方智能助手「阿白」，形象是微信气泡狗IP，专业咖啡师与点单顾问双重身份\n---\n## 目标\n根据时段/天气/用户历史订单推荐咖啡与轻食组合，实现「对话即点单」的无缝体验，实时同步订单状态\n---\n## 约束\n仅处理WeStore Cafe在售餐品咨询，禁止推荐非授权商品，所有配方描述需严格遵循店铺菜单标准\n---\n## 工具使用指南\n### 通用规则\n- 仅处理WeStore Cafe在售餐品咨询，禁止推荐非授权商品，所有配方描述需严格遵循店铺菜单标准 (优先级: high)\n- 当你需要 skuId 时， 请调用 getGoodsDetail 获取商品详情，并查看用户描述是否可以完整选取到其中的一个 skuid，若目标明确则直接执行后续任务。 (优先级: medium)\n- 1. 关于 getGoodsDetail & displayGoodsDetail 的调用，请务必遵循以下规则：\n  - 如果用户描述不明确，那么询问规格时必须再次调用 displayGoodsDetail 展示商品详情。\n  - 如果用户描述明确，那么直接调用 order 或 addToCart 加入购物车。\n  - 如果用户描述明确，且已经获取了商品详情，那么直接调用 order 或 addToCart 加入购物车。\n2. 当你需要确定用户对于「商品规格」的需求时，优先再次调用 displayGoodsDetail 展示商品详情。\n3. 当你需要展示商品详情时，让用户选择规格的时候，必须调用 displayGoodsDetailToUser 工具，不允许使用文本回复。 (优先级: high)\n### 特定工具规则\n- **order**: \n  - 触发条件: 用户点单\n  - 调用前动作: 调用 getGoodsDetail 工具获取商品详情，并根据用户描述，从商品详情中选取一个 skuid，再调用此函数加入购物车。\n- **addToCart**: \n  - 触发条件: 用户添加商品到购物车\n  - 调用前动作: 调用 getGoodsDetail 工具获取商品详情，并根据用户描述，从商品详情中选取一个 skuid，再调用此函数加入购物车。\n- **getGoodsDetail**: \n  - 触发条件: 用户需要获取商品详情\n  - 调用后动作: 如果用户描述不明确，那么询问规格时必须再次调用 displayGoodsDetail 展示商品详情; 如果用户描述明确，那么直接调用 order 或 addToCart 加入购物车。\n\n---\n## 响应格式\n需体现咖啡专业，使用SCA标准术语描述产品，语言风格体现微信式极简\n---\n## 示例\n### 示例 1\n**用户输入**: \n推荐一些适合夏天喝的咖啡\n**预期工具调用**: \njson\n[\n  {\n    \"name\": \"displayGoods\",\n    \"parameters\": {\n      \"goodsList\": [\n        {\n          \"goodsId\": \"1\",\n          \"goodsName\": \"拿铁\",\n          \"goodsPrice\": 100,\n          \"picture\": \"https://example.com/image1.jpg\",\n          \"keywords\": \"热卖\"\n        },\n        {\n          \"goodsId\": \"2\",\n          \"goodsName\": \"美式\",\n          \"goodsPrice\": 100,\n          \"picture\": \"https://example.com/image2.jpg\",\n          \"keywords\": \"冰饮\"\n        }\n      ]\n    }\n  }\n]\n### 示例 2\n**用户输入**: \n我的取餐号是多少\n**预期工具调用**: \njson\n[\n  {\n    \"name\": \"getOrderStatus\",\n    \"parameters\": {\n      \"orderOffest\": 0\n    }\n  }\n]\n### 示例 3\n**用户输入**: \n我想买一杯拿铁\n**预期工具调用**: \njson\n[\n  {\n    \"name\": \"getGoodsDetail\",\n    \"parameters\": {\n      \"items\": [\n        {\n          \"goodsId\": 1\n        }\n      ]\n    }\n  }\n]\n### 示例 4\n**用户输入**: \n我想买一杯拿铁\n**预期工具调用**: \njson\n[\n  {\n    \"name\": \"addToCart\",\n    \"parameters\": {\n      \"items\": [\n        {\n          \"skuId\": 1,\n          \"num\": 1\n        }\n      ]\n    }\n  }\n]\n### 示例 5\n**用户输入**: \n我想买一杯拿铁\n**预期工具调用**: \njson\n[\n  {\n    \"name\": \"order\",\n    \"parameters\": {\n      \"items\": [\n        {\n          \"skuId\": 1,\n          \"num\": 1\n        }\n      ]\n    }\n  }\n]\n"`,
          // `"pageInnerText": "WeStoreCafe\n可能想要\n葡萄冰美式¥18.00冰\n添加\n鲜榨西瓜汁¥13.00冰/无糖\n添加\n杨枝甘露¥20.00冰/正常糖\n添加\n咖啡\n经典美式\n¥15.00\n\n油柑美式\n¥18.00\n\n凤梨美式\n推荐\n¥18.00\n\n葡萄冰美式\n新品\n¥18.00\n\n爆柠美式\n¥18.00\n\n鲜橙美式\n¥20.00\n\n橘皮拿铁\n¥20.00\n\n榛果拿铁\n¥20.00\n\n生椰拿铁\n¥20.00\n\n红茶拿铁\n推荐\n¥20.00\n\n拿铁\n¥18.00\n\n燕麦拿铁\n¥22.00\n\n白桃美式\n茶咖\n¥16.00\n果茶\n海盐柠檬\n补充电解质\n¥13.00\n\n白桃乌龙柠檬茶\n¥13.00\n\n鸭屎香柠檬茶\n¥13.00\n\n油柑柠檬茶\n¥16.00\n\n满杯百香果\n¥13.00\n\n百香益力多\n¥16.00\n\n柠檬益力多\n¥16.00\n\n蜂蜜柚子茶\n¥12.00\n\n黑加仑柠檬茶\n新品\n¥16.00\n果汁\n鲜榨西瓜汁\n夏日限定\n¥13.00\n\n轻体小绿瓶\n现榨纤体果蔬汁\n¥20.00\n\n鲜榨橙汁\n现榨无糖0负担\n¥25.00\n\n苹果胡萝卜汁\n现榨无糖0负担\n¥20.00\n\n杨枝甘露\n推荐\n¥20.00\n\n芒果奶昔\n¥20.00\n奶茶\n黑糖姜母茶\n¥12.00\n\n黑糖姜母奶\n¥15.00\n\n鸭屎香珍珠奶茶\n¥12.00\n\n茉莉奶白\n¥16.00\n\n白桃牛乳茶\n¥16.00\n\n抹茶鲜奶\n¥18.00\n\n生椰抹茶\n¥18.00\n\n燕麦抹茶\n¥22.00\n休闲零品\n蔓越莓麻薯\n¥2.50\n\n芒果奶冻\n¥3.50\n\n提拉米苏奶冻\n¥3.50\n\n葡挞\n¥2.50\n\n麻薯\n¥2.50\n\n菜单\n我的订单\n"`,
        ]
      }
    ];

    const context: ContextConfig = {
      userInfo: userInfo || '',
      memorySummary: memorySummary || '',
      developerContext
    };

    return this.buildSystemPrompt(tags, context, toolOptions);
  }

  /**
   * 构建通用智能助手的系统提示词
   */
  buildGenericAssistantPrompt(
    description: string = '智能助手',
    expertise: string[] = [],
    toolOptions?: SystemPromptOptions
  ): string {
    const tags: TagConfig[] = [
      {
        name: 'Identity',
        content: [
          `你是${description}`,
          expertise.length > 0 ? `你擅长${expertise.join('、')}` : '',
          '回答需要简洁准确',
          '根据用户问题提供有用的帮助'
        ].filter(Boolean)
      },
      {
        name: 'Task',
        content: [
          '帮助用户完成任务，回答用户的问题。',
          '任务目标:',
          '- 理解用户需求',
          '- 提供准确有用的回答',
          '- 使用合适的工具辅助回答'
        ]
      }
    ];

    return this.buildSystemPrompt(tags, undefined, toolOptions);
  }

  /**
   * 预览系统提示词（不执行）
   */
  previewSystemPrompt(
    tags: TagConfig[],
    context?: ContextConfig,
    toolOptions?: SystemPromptOptions
  ): string {
    return this.buildSystemPrompt(tags, context, toolOptions);
  }


  /**
   * 构建系统提示词（统一入口）
   */
  buildSystemPromptByKind(buildConfig: SystemPromptBuildConfig): string {
    const { kind, config, options = {} } = buildConfig;

    switch (kind) {
      case 'generic':
        return this.buildGenericAssistantPrompt(
          config?.description || '智能助手',
          config?.expertise || ['帮助用户完成任务', '回答用户问题'],
          options
        );

      case 'wechat':
        // if (!config || !config.developerContext) {
        //   throw new Error('微信小程序类型需要提供 developerContext 参数');
        // }
        return this.buildWechatMiniProgramPrompt(
          config.userInfo || '',
          config.memorySummary || '',
          config.developerContext || '',
          options
        );

      case 'custom':
        if (!config || !config.tags) {
          throw new Error('自定义类型需要提供 tags 参数');
        }
        return this.buildSystemPrompt(
          config.tags,
          config.context,
          options
        );

      default:
        throw new Error(`不支持的系统提示词类型: ${kind}`);
    }
  }
}

// 便捷的工厂函数
export function createSystemPromptBuilder(toolRegistry?: ToolRegistry): SystemPromptBuilder {
  return new SystemPromptBuilder(toolRegistry);
}
