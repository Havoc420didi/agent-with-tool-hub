// api-tools.ts - API 调用工具集合

import { z } from 'zod';
import { ToolConfig } from '../types/tool.types';
import { ToolHelpers } from '../utils/helpers';

/**
 * API 调用工具集合
 */
export class ApiTools {
  /**
   * HTTP 请求工具
   */
  static httpRequest(): ToolConfig {
    return {
      name: 'http_request',
      description: '发送 HTTP 请求',
      schema: z.object({
        url: z.string().describe('请求URL'),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().describe('请求方法，默认为GET'),
        headers: z.record(z.string()).optional().describe('请求头'),
        body: z.any().optional().describe('请求体'),
        timeout: z.number().optional().describe('超时时间（毫秒），默认为5000')
      }),
      handler: async (input: any) => {
        try {
          const { url, method = 'GET', headers = {}, body, timeout = 5000 } = input;

          // 创建 AbortController 用于超时控制
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const requestOptions: RequestInit = {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            signal: controller.signal
          };

          if (body && method !== 'GET') {
            requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
          }

          const response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);

          const responseData = await response.text();
          let parsedData;
          
          try {
            parsedData = JSON.parse(responseData);
          } catch {
            parsedData = responseData;
          }

          return ToolHelpers.createSuccessResult({
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: parsedData,
            success: response.ok
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'api',
      tags: ['http', 'request', 'api']
    };
  }

  /**
   * 获取天气信息
   */
  static getWeather(): ToolConfig {
    return {
      name: 'get_weather',
      description: '获取指定地点的天气信息',
      schema: z.object({
        location: z.string().describe('地点名称'),
        units: z.enum(['metric', 'imperial']).optional().describe('温度单位，默认为metric')
      }),
      handler: async (input: any) => {
        try {
          const { location, units = 'metric' } = input;
          
          // 模拟天气数据（实际项目中应该调用真实的天气API）
          const weatherData = {
            location,
            temperature: units === 'metric' ? '22°C' : '72°F',
            condition: '晴天',
            humidity: '65%',
            windSpeed: '10 km/h',
            timestamp: new Date().toISOString()
          };

          return ToolHelpers.createSuccessResult(weatherData);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'api',
      tags: ['weather', 'api', 'external']
    };
  }

  /**
   * 翻译文本
   */
  static translate(): ToolConfig {
    return {
      name: 'translate',
      description: '翻译文本',
      schema: z.object({
        text: z.string().describe('要翻译的文本'),
        from: z.string().optional().describe('源语言代码，默认为auto'),
        to: z.string().describe('目标语言代码'),
        provider: z.enum(['google', 'baidu', 'youdao']).optional().describe('翻译服务提供商，默认为google')
      }),
      handler: async (input: any) => {
        try {
          const { text, from = 'auto', to, provider = 'google' } = input;

          // 模拟翻译结果（实际项目中应该调用真实的翻译API）
          const translations: Record<string, string> = {
            'hello': '你好',
            'world': '世界',
            'good morning': '早上好',
            'thank you': '谢谢'
          };

          const translatedText = translations[text.toLowerCase()] || `[${provider}] ${text}`;

          return ToolHelpers.createSuccessResult({
            original: text,
            translated: translatedText,
            from,
            to,
            provider,
            confidence: 0.95
          });
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'api',
      tags: ['translation', 'api', 'language']
    };
  }

  /**
   * 获取新闻
   */
  static getNews(): ToolConfig {
    return {
      name: 'get_news',
      description: '获取新闻信息',
      schema: z.object({
        category: z.enum(['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology']).optional().describe('新闻分类'),
        country: z.string().optional().describe('国家代码，默认为cn'),
        limit: z.number().optional().describe('返回数量，默认为10')
      }),
      handler: async (input: any) => {
        try {
          const { category = 'general', country = 'cn', limit = 10 } = input;

          // 模拟新闻数据（实际项目中应该调用真实的新闻API）
          const newsData = {
            category,
            country,
            articles: Array.from({ length: limit }, (_, i) => ({
              title: `新闻标题 ${i + 1}`,
              description: `这是新闻描述 ${i + 1}`,
              url: `https://example.com/news/${i + 1}`,
              publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
              source: '示例新闻源'
            })),
            total: limit,
            timestamp: new Date().toISOString()
          };

          return ToolHelpers.createSuccessResult(newsData);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'api',
      tags: ['news', 'api', 'external']
    };
  }

  /**
   * 获取股票信息
   */
  static getStock(): ToolConfig {
    return {
      name: 'get_stock',
      description: '获取股票信息',
      schema: z.object({
        symbol: z.string().describe('股票代码'),
        interval: z.enum(['1m', '5m', '15m', '30m', '1h', '1d']).optional().describe('时间间隔，默认为1d')
      }),
      handler: async (input: any) => {
        try {
          const { symbol, interval = '1d' } = input;

          // 模拟股票数据（实际项目中应该调用真实的股票API）
          const stockData = {
            symbol: symbol.toUpperCase(),
            price: (Math.random() * 100 + 50).toFixed(2),
            change: (Math.random() * 10 - 5).toFixed(2),
            changePercent: (Math.random() * 20 - 10).toFixed(2),
            volume: Math.floor(Math.random() * 1000000),
            interval,
            timestamp: new Date().toISOString()
          };

          return ToolHelpers.createSuccessResult(stockData);
        } catch (error) {
          return ToolHelpers.createErrorResult(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      category: 'api',
      tags: ['stock', 'finance', 'api']
    };
  }

  /**
   * 获取所有 API 工具
   */
  static getAll(): ToolConfig[] {
    return [
      this.httpRequest(),
      this.getWeather(),
      this.translate(),
      this.getNews(),
      this.getStock()
    ];
  }

  /**
   * 按分类获取工具
   */
  static getByCategory(category: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  /**
   * 按标签获取工具
   */
  static getByTag(tag: string): ToolConfig[] {
    return this.getAll().filter(tool => tool.tags?.includes(tag));
  }
}
