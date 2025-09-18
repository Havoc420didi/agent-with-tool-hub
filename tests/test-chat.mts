// test-advanced-chat.mts - 高级交互式西城咖啡工具 Chat API 测试

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
import * as readline from 'readline';
config({ path: resolve(process.cwd(), './config.env') });

import { WestoreCafeTools } from '../examples/tool-demo/westore-cafe-tools.js';

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m'
};

// 消息历史记录
interface MessageHistory {
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
  metadata?: any;
}

// 会话状态
interface SessionState {
  threadId: string;
  messageCount: number;
  startTime: Date;
  isActive: boolean;
  history: MessageHistory[];
  toolExecMode: 'internal' | 'outside';
  memoryMode: 'api' | 'lg';
  config: {
    streaming: boolean;
    temperature: number;
    model: string;
  };
}

// CLI命令定义
interface CLICommand {
  short: string;
  full: string;
  description: string;
  aliases?: string[];
}

// CLI处理结果
interface CLIResult {
  success: boolean;
  resolvedCommand?: string;
  error?: string;
  suggestions?: CLICommand[];
}

// 智能CLI处理器
class SmartCLIProcessor {
  private commands: CLICommand[] = [
    { short: '/h', full: '/help', description: '显示帮助信息' },
    { short: '/t', full: '/tools', description: '显示可用工具列表' },
    { short: '/s', full: '/status', description: '显示会话状态' },
    { short: '/hi', full: '/history', description: '显示对话历史' },
    { short: '/c', full: '/config', description: '显示当前配置' },
    { short: '/st', full: '/stream', description: '切换流式/非流式模式' },
    { short: '/m', full: '/mode', description: '切换工具执行模式 (internal/outside)' },
    { short: '/mem', full: '/memory', description: '切换记忆模式 (api/lg)' },
    { short: '/temp', full: '/temperature', description: '设置温度值 (0-1)' },
    { short: '/mo', full: '/model', description: '设置模型名称' },
    { short: '/cl', full: '/clear', description: '清空屏幕' },
    { short: '/e', full: '/export', description: '导出对话历史' },
    { short: '/r', full: '/reset', description: '重置会话' },
    { short: '/ex', full: '/exit', description: '退出程序' },
    // 添加一些会产生冲突的简写来演示功能
    { short: '/te', full: '/template', description: '管理模板' },
    { short: '/se', full: '/search', description: '搜索功能' },
    { short: '/se', full: '/settings', description: '设置管理' }
  ];

  processCommand(input: string): CLIResult {
    // 完全匹配
    const exactMatch = this.commands.find(cmd => 
      cmd.short === input || cmd.full === input
    );
    
    if (exactMatch) {
      return {
        success: true,
        resolvedCommand: exactMatch.full
      };
    }

    // 前缀匹配
    const prefixMatches = this.commands.filter(cmd => 
      cmd.short.startsWith(input) || cmd.full.startsWith(input)
    );

    if (prefixMatches.length === 0) {
      // 模糊匹配建议
      const fuzzyMatches = this.commands.filter(cmd => 
        this.calculateSimilarity(input, cmd.short) > 0.3 ||
        this.calculateSimilarity(input, cmd.full) > 0.3
      );

      return {
        success: false,
        error: `未知命令: ${input}`,
        suggestions: fuzzyMatches.slice(0, 3)
      };
    }

    if (prefixMatches.length === 1) {
      return {
        success: true,
        resolvedCommand: prefixMatches[0].full
      };
    }

    // 多个前缀匹配 - 冲突
    return {
      success: false,
      error: `命令前缀冲突: ${input}`,
      suggestions: prefixMatches
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  getAllCommands(): CLICommand[] {
    return [...this.commands];
  }
}

const DEFAULT_TOOL_EXEC_MODE = 'internal';
const DEFAULT_MEMORY_MODE = 'lg';

class AdvancedChatTester {
  private rl: readline.Interface;
  private sessionState: SessionState;
  private API_BASE_URL: string;
  private tools: any[];
  private smartCLIProcessor: SmartCLIProcessor;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.sessionState = {
      threadId: '', // 将在第一次发送消息时自动生成
      messageCount: 0,
      startTime: new Date(),
      isActive: true,
      history: [],
      toolExecMode: DEFAULT_TOOL_EXEC_MODE,
      memoryMode: DEFAULT_MEMORY_MODE, // 默认使用LG模式
      config: {
        streaming: false,
        temperature: 0,
        model: 'deepseek-chat'
      }
    };
    
    this.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
    this.tools = WestoreCafeTools.getAll();
    this.smartCLIProcessor = new SmartCLIProcessor();
    
    // 检查必要的环境变量
    this.checkEnvironment();
  }

  /**
   * 检查环境配置
   */
  private checkEnvironment(): void {
    const requiredVars = ['OPENAI_API_KEY', 'OPENAI_BASE_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`${colors.red}❌ 缺少必要的环境变量:${colors.reset}`);
      missingVars.forEach(varName => {
        console.log(`${colors.red}   ${varName}${colors.reset}`);
      });
      console.log(`${colors.yellow}请检查 config.env 文件配置${colors.reset}\n`);
    }
  }

  /**
   * 启动高级交互式测试
   */
  async start(): Promise<void> {
    this.printWelcome();
    this.printHelp();
    
    // 设置退出处理
    this.setupExitHandlers();
    
    // 开始交互循环
    await this.interactiveLoop();
  }

  /**
   * 打印欢迎信息
   */
  private printWelcome(): void {
    console.clear();
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bgBlue}${colors.white} ☕ westore-cafe AI 助手 - 高级交互式测试 ${colors.reset}`);
    console.log('='.repeat(80));
    console.log(`${colors.cyan}会话ID: ${colors.bright}${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}`);
    console.log(`${colors.cyan}可用工具: ${colors.yellow}${this.tools.length}个${colors.reset}`);
    console.log(`${colors.cyan}API地址: ${colors.yellow}${this.API_BASE_URL}${colors.reset}`);
    console.log(`${colors.cyan}当前模式: ${colors.yellow}${this.sessionState.config.streaming ? '流式' : '非流式'}${colors.reset}`);
    console.log(`${colors.cyan}工具执行模式: ${colors.yellow}${this.sessionState.toolExecMode}${colors.reset}`);
    console.log(`${colors.cyan}记忆模式: ${colors.yellow}${this.sessionState.memoryMode}${colors.reset}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * 打印帮助信息
   */
  private printHelp(): void {
    console.log(`${colors.bright}${colors.blue}📋 可用命令:${colors.reset}`);
    
    const commands = this.smartCLIProcessor.getAllCommands();
    commands.forEach(cmd => {
      const shortForm = cmd.short.length > 1 ? ` (${cmd.short})` : '';
      console.log(`${colors.green}  ${cmd.full}${shortForm}${colors.reset} - ${colors.dim}${cmd.description}${colors.reset}`);
    });
    
    console.log(`${colors.dim}  直接输入消息与AI助手对话${colors.reset}`);
    console.log(`${colors.yellow}💡 提示: 支持命令前缀匹配，如输入 '/h' 会自动匹配 '/help'${colors.reset}`);
    console.log(`${colors.yellow}💡 提示: 如果前缀冲突，系统会显示所有可能的命令${colors.reset}\n`);
  }

  /**
   * 设置退出处理
   */
  private setupExitHandlers(): void {
    this.rl.on('SIGINT', () => {
      console.log(`\n${colors.yellow}👋 再见！会话已结束。${colors.reset}`);
      this.sessionState.isActive = false;
      this.rl.close();
      process.exit(0);
    });
  }

  /**
   * 交互循环
   */
  private async interactiveLoop(): Promise<void> {
    while (this.sessionState.isActive) {
      try {
        const input = await this.promptUser();
        
        if (!input.trim()) {
          continue;
        }

        // 处理命令
        if (input.startsWith('/')) {
          await this.handleCommand(input);
          continue;
        }

        // 发送消息到AI
        await this.sendMessage(input);
        
      } catch (error) {
        console.error(`${colors.red}❌ 错误: ${error}${colors.reset}\n`);
      }
    }
  }

  /**
   * 提示用户输入
   */
  private promptUser(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(`${colors.bright}${colors.blue}你: ${colors.reset}`, (input) => {
        resolve(input);
      });
    });
  }

  /**
   * 处理命令
   */
  private async handleCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');
    
    // 使用智能CLI处理器
    const cliResult = this.smartCLIProcessor.processCommand(cmd);
    
    if (!cliResult.success) {
      console.log(`${colors.red}❌ ${cliResult.error}${colors.reset}`);
      if (cliResult.suggestions && cliResult.suggestions.length > 0) {
        console.log(`${colors.yellow}建议的命令:${colors.reset}`);
        cliResult.suggestions.forEach(suggestion => {
          console.log(`${colors.cyan}  ${suggestion.short}${colors.reset} -> ${colors.green}${suggestion.full}${colors.reset} - ${colors.dim}${suggestion.description}${colors.reset}`);
        });
      }
      console.log(`${colors.dim}输入 /help 查看所有可用命令${colors.reset}\n`);
      return;
    }
    
    // 解析命令
    const resolvedCmd = cliResult.resolvedCommand;
    
    switch (resolvedCmd) {
      case '/help':
        this.printHelp();
        break;
        
      case '/tools':
        this.printTools();
        break;
        
      case '/status':
        this.printStatus();
        break;
        
      case '/history':
        this.printHistory();
        break;
        
      case '/config':
        this.printConfig();
        break;
        
      case '/stream':
        this.toggleStreaming();
        break;
        
      case '/mode':
        this.handleModeCommand(args);
        break;
        
      case '/memory':
        this.handleMemoryCommand(args);
        break;
        
      case '/temperature':
        this.setTemperature(args[0]);
        break;
        
      case '/model':
        this.setModel(args.join(' '));
        break;
        
      case '/clear':
        this.clearSession();
        break;
        
      case '/export':
        this.exportHistory();
        break;
        
      case '/reset':
        this.resetSession();
        break;
        
      case '/exit':
        console.log(`${colors.yellow}👋 再见！${colors.reset}`);
        this.sessionState.isActive = false;
        this.rl.close();
        break;
        
      case '/template':
        this.manageTemplates(args);
        break;
        
      case '/search':
        this.handleSearch(args);
        break;
        
      case '/settings':
        this.manageSettings(args);
        break;
        
      default:
        console.log(`${colors.red}❌ 未知命令: ${cmd}${colors.reset}`);
        console.log(`${colors.dim}输入 /help 查看可用命令${colors.reset}\n`);
    }
  }

  /**
   * 打印工具列表
   */
  private printTools(): void {
    console.log(`\n${colors.bright}${colors.blue}🔧 可用工具 (${this.tools.length}个):${colors.reset}`);
    this.tools.forEach((tool, index) => {
      console.log(`${colors.cyan}  ${index + 1}. ${colors.yellow}${tool.name}${colors.reset}`);
      console.log(`${colors.dim}     ${tool.description}${colors.reset}`);
      if (tool.tags) {
        console.log(`${colors.dim}     标签: ${tool.tags.join(', ')}${colors.reset}`);
      }
      console.log();
    });
  }

  /**
   * 打印会话状态
   */
  private printStatus(): void {
    const duration = Date.now() - this.sessionState.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    console.log(`\n${colors.bright}${colors.blue}📊 会话状态:${colors.reset}`);
    console.log(`${colors.cyan}  会话ID: ${colors.yellow}${this.sessionState.threadId || '未生成'}${colors.reset}`);
    console.log(`${colors.cyan}  消息数量: ${colors.yellow}${this.sessionState.messageCount}${colors.reset}`);
    console.log(`${colors.cyan}  历史记录: ${colors.yellow}${this.sessionState.history.length}条${colors.reset}`);
    console.log(`${colors.cyan}  运行时间: ${colors.yellow}${minutes}分${seconds}秒${colors.reset}`);
    console.log(`${colors.cyan}  工具执行模式: ${colors.yellow}${this.sessionState.toolExecMode}${colors.reset}`);
    console.log(`${colors.cyan}  记忆模式: ${colors.yellow}${this.sessionState.memoryMode}${colors.reset}`);
    console.log(`${colors.cyan}  Thread-ID: ${colors.yellow}${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}`);
    console.log(`${colors.cyan}  状态: ${colors.green}${this.sessionState.isActive ? '活跃' : '已结束'}${colors.reset}\n`);
  }

  /**
   * 打印对话历史
   */
  private printHistory(): void {
    console.log(`\n${colors.bright}${colors.blue}📜 对话历史 (${this.sessionState.history.length}条):${colors.reset}`);
    
    if (this.sessionState.history.length === 0) {
      console.log(`${colors.dim}  暂无对话记录${colors.reset}\n`);
      return;
    }
    
    this.sessionState.history.forEach((msg, index) => {
      const time = msg.timestamp.toLocaleTimeString();
      const role = msg.role === 'user' ? '你' : 'AI助手';
      const color = msg.role === 'user' ? colors.blue : colors.green;
      
      console.log(`${colors.dim}[${time}] ${color}${role}:${colors.reset}`);
      console.log(`${colors.white}${msg.content}${colors.reset}`);
      
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        console.log(`${colors.dim}  🔧 工具调用: ${msg.toolCalls.map(tc => tc.toolName).join(', ')}${colors.reset}`);
      }
      
      console.log();
    });
  }

  /**
   * 打印配置信息
   */
  private printConfig(): void {
    console.log(`\n${colors.bright}${colors.blue}⚙️ 当前配置:${colors.reset}`);
    console.log(`${colors.cyan}  模型: ${colors.yellow}${this.sessionState.config.model}${colors.reset}`);
    console.log(`${colors.cyan}  温度: ${colors.yellow}${this.sessionState.config.temperature}${colors.reset}`);
    console.log(`${colors.cyan}  流式: ${colors.yellow}${this.sessionState.config.streaming ? '是' : '否'}${colors.reset}`);
    console.log(`${colors.cyan}  工具执行模式: ${colors.yellow}${this.sessionState.toolExecMode}${colors.reset}`);
    console.log(`${colors.cyan}  记忆模式: ${colors.yellow}${this.sessionState.memoryMode}${colors.reset}`);
    console.log(`${colors.cyan}  Thread-ID: ${colors.yellow}${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}`);
    console.log(`${colors.cyan}  API地址: ${colors.yellow}${this.API_BASE_URL}${colors.reset}\n`);
  }

  /**
   * 切换流式模式
   */
  private toggleStreaming(): void {
    this.sessionState.config.streaming = !this.sessionState.config.streaming;
    console.log(`${colors.green}✅ 已切换到${this.sessionState.config.streaming ? '流式' : '非流式'}模式${colors.reset}\n`);
  }

  /**
   * 处理模式切换命令
   */
  private handleModeCommand(args: string[]): void {
    if (args.length === 0) {
      console.log(`\n${colors.bright}${colors.blue}🔧 当前工具执行模式: ${colors.yellow}${this.sessionState.toolExecMode}${colors.reset}`);
      console.log(`${colors.cyan}可用模式:${colors.reset}`);
      console.log(`${colors.green}  internal (i)${colors.reset} - 工具在AI内部执行`);
      console.log(`${colors.green}  outside (o)${colors.reset}  - 工具在AI外部执行`);
      console.log(`${colors.dim}用法: /mode <internal|outside|i|o>${colors.reset}\n`);
      return;
    }

    const mode = args[0].toLowerCase();
    let targetMode: 'internal' | 'outside' | null = null;
    
    // 支持完整名称和简写
    if (mode === 'internal' || mode === 'i') {
      targetMode = 'internal';
    } else if (mode === 'outside' || mode === 'o') {
      targetMode = 'outside';
    }
    
    if (targetMode) {
      this.sessionState.toolExecMode = targetMode;
      console.log(`${colors.green}✅ 工具执行模式已切换为: ${colors.yellow}${targetMode}${colors.reset}\n`);
    } else {
      console.log(`${colors.red}❌ 无效的模式: ${mode}${colors.reset}`);
      console.log(`${colors.dim}可用模式: internal, outside, i, o${colors.reset}\n`);
    }
  }

  /**
   * 处理记忆模式切换命令
   */
  private handleMemoryCommand(args: string[]): void {
    if (args.length === 0) {
      console.log(`\n${colors.bright}${colors.blue}🧠 当前记忆模式: ${colors.yellow}${this.sessionState.memoryMode}${colors.reset}`);
      console.log(`${colors.cyan}当前Thread-ID: ${colors.yellow}${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}`);
      console.log(`${colors.cyan}可用模式:${colors.reset}`);
      console.log(`${colors.green}  api${colors.reset} - API模式：客户端控制历史记录`);
      console.log(`${colors.green}  lg${colors.reset}  - LG模式：服务端自动管理历史记录`);
      console.log(`${colors.dim}用法: /memory <api|lg>${colors.reset}\n`);
      return;
    }

    const mode = args[0].toLowerCase();
    let targetMode: 'api' | 'lg' | null = null;
    
    if (mode === 'api') {
      targetMode = 'api';
    } else if (mode === 'lg') {
      targetMode = 'lg';
    }
    
    if (targetMode) {
      const previousMode = this.sessionState.memoryMode;
      this.sessionState.memoryMode = targetMode;
      console.log(`${colors.green}✅ 记忆模式已切换为: ${colors.yellow}${targetMode}${colors.reset}`);
      
      if (targetMode === 'api') {
        console.log(`${colors.dim}  - 客户端控制历史记录${colors.reset}`);
        console.log(`${colors.dim}  - 支持跨会话历史管理${colors.reset}`);
        console.log(`${colors.dim}  - 网络传输开销较大${colors.reset}`);
        console.log(`${colors.dim}  - 当前历史记录: ${this.sessionState.history.length}条${colors.reset}\n`);
      } else {
        console.log(`${colors.dim}  - 服务端自动管理历史记录${colors.reset}`);
        console.log(`${colors.dim}  - 基于thread_id进行会话隔离${colors.reset}`);
        console.log(`${colors.dim}  - 网络传输开销小${colors.reset}`);
        console.log(`${colors.dim}  - 当前Thread-ID: ${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}`);
        
        // 如果从API模式切换到LG模式，提醒用户thread-id的重要性
        if (previousMode === 'api') {
          console.log(`${colors.yellow}💡 提示: LG模式依赖Thread-ID保持上下文，请确保使用相同的Thread-ID${colors.reset}\n`);
        }
      }
    } else {
      console.log(`${colors.red}❌ 无效的记忆模式: ${mode}${colors.reset}`);
      console.log(`${colors.dim}可用模式: api, lg${colors.reset}\n`);
    }
  }

  /**
   * 设置温度
   */
  private setTemperature(value: string): void {
    const temp = parseFloat(value);
    if (isNaN(temp) || temp < 0 || temp > 1) {
      console.log(`${colors.red}❌ 温度值必须在0-1之间${colors.reset}\n`);
      return;
    }
    this.sessionState.config.temperature = temp;
    console.log(`${colors.green}✅ 温度已设置为 ${temp}${colors.reset}\n`);
  }

  /**
   * 设置模型
   */
  private setModel(modelName: string): void {
    if (!modelName.trim()) {
      console.log(`${colors.red}❌ 请提供模型名称${colors.reset}\n`);
      return;
    }
    this.sessionState.config.model = modelName.trim();
    console.log(`${colors.green}✅ 模型已设置为 ${modelName}${colors.reset}\n`);
  }


  /**
   * 导出对话历史
   */
  private exportHistory(): void {
    const exportData = {
      sessionId: this.sessionState.threadId,
      startTime: this.sessionState.startTime,
      endTime: new Date(),
      messageCount: this.sessionState.messageCount,
      config: this.sessionState.config,
      history: this.sessionState.history
    };
    
    const filename = `chat-export-${this.sessionState.threadId}.json`;
    const fs = require('fs');
    
    try {
      fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
      console.log(`${colors.green}✅ 对话历史已导出到 ${filename}${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}❌ 导出失败: ${error}${colors.reset}\n`);
    }
  }

  /**
   * 清空会话（清理 thread-id 和屏幕）
   */
  private clearSession(): void {
    const oldThreadId = this.sessionState.threadId;
    
    // 清理 thread-id 和重置消息计数
    this.sessionState.threadId = `session_${Date.now()}`;
    this.sessionState.messageCount = 0;
    this.sessionState.history = [];
    this.sessionState.startTime = new Date();
    
    console.clear();
    this.printWelcome();
    
    console.log(`${colors.green}✅ 会话已清空${colors.reset}`);
    console.log(`${colors.cyan}  旧 Thread-ID: ${colors.yellow}${oldThreadId}${colors.reset}`);
    console.log(`${colors.cyan}  新 Thread-ID: ${colors.yellow}${this.sessionState.threadId}${colors.reset}`);
    console.log(`${colors.dim}  - 对话历史已清空${colors.reset}`);
    console.log(`${colors.dim}  - 消息计数已重置${colors.reset}`);
    console.log(`${colors.dim}  - 准备开始新的对话${colors.reset}\n`);
  }

  /**
   * 重置会话
   */
  private resetSession(): void {
    this.sessionState = {
      threadId: `session_${Date.now()}`,
      messageCount: 0,
      startTime: new Date(),
      isActive: true,
      history: [],
      toolExecMode: DEFAULT_TOOL_EXEC_MODE,
      memoryMode: DEFAULT_MEMORY_MODE, // 重置为LG模式
      config: {
        streaming: false,
        temperature: 0,
        model: 'deepseek-chat'
      }
    };
    console.log(`${colors.green}✅ 会话已重置${colors.reset}\n`);
  }

  /**
   * 发送消息到AI
   */
  private async sendMessage(message: string): Promise<void> {
    this.sessionState.messageCount++;
    
    // 如果是第一次发送消息且没有 thread-id，自动生成 thread-id
    if (this.sessionState.messageCount === 1 && !this.sessionState.threadId) {
      this.sessionState.threadId = `session_${Date.now()}`;
      console.log(`${colors.dim}🧵 自动生成 Thread-ID: ${this.sessionState.threadId}${colors.reset}`);
    }
    
    // 记录用户消息
    this.sessionState.history.push({
      timestamp: new Date(),
      role: 'user',
      content: message
    });
    
    console.log(`${colors.dim}🤖 AI正在思考...${colors.reset}`);
    
    try {
      if (this.sessionState.config.streaming) {
        await this.sendStreamingMessage(message);
      } else {
        await this.sendNormalMessage(message);
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ 请求失败: ${error}${colors.reset}\n`);
    }
  }

  /**
   * 发送普通消息
   */
  private async sendNormalMessage(message: string): Promise<void> {
    // 构建请求体
    const requestBody: any = {
      message,
      threadId: this.sessionState.threadId,
      model: {
        name: this.sessionState.config.model,
        temperature: this.sessionState.config.temperature,
        baseURL: process.env.OPENAI_BASE_URL,
        apiKey: process.env.OPENAI_API_KEY
      },
      memory: { 
        enabled: true,
        mode: this.sessionState.memoryMode,
        maxHistory: 50
      },
      streaming: false,
      tools: this.tools.map(tool => tool.name),
      toolExecutionConfig: {
        mode: this.sessionState.toolExecMode,
        internalConfig: {
          enableCache: true,
          cacheTtl: 300000,
          maxRetries: 3
        }
      }
    };

    // 如果是API模式，添加聊天历史
    if (this.sessionState.memoryMode === 'api') {
      requestBody.chatHistory = this.sessionState.history.map(msg => ({
        type: msg.role === 'user' ? 'human' : 'ai',
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        toolCalls: msg.toolCalls,
        metadata: msg.metadata
      }));
    }

    const response = await fetch(`${this.API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      this.displayAIResponse(result.data);
      
      // 记录AI回复
      this.sessionState.history.push({
        timestamp: new Date(),
        role: 'assistant',
        content: result.data.content,
        toolCalls: result.data.toolCalls,
        metadata: result.data.metadata
      });
    } else {
      console.log(`${colors.red}❌ AI回复失败: ${result.error}${colors.reset}\n`);
    }
  }

  /**
   * 发送流式消息
   */
  private async sendStreamingMessage(message: string): Promise<void> {
    // 构建请求体
    const requestBody: any = {
      message,
      threadId: this.sessionState.threadId,
      model: {
        name: this.sessionState.config.model,
        temperature: this.sessionState.config.temperature,
        baseURL: process.env.OPENAI_BASE_URL,
        apiKey: process.env.OPENAI_API_KEY
      },
      memory: { 
        enabled: true,
        mode: this.sessionState.memoryMode,
        maxHistory: 50
      },
      streaming: true,
      tools: this.tools.map(tool => tool.name),
      toolExecutionConfig: {
        mode: this.sessionState.toolExecMode,
        internalConfig: {
          enableCache: true,
          cacheTtl: 300000,
          maxRetries: 3
        }
      }
    };

    // 如果是API模式，添加聊天历史
    if (this.sessionState.memoryMode === 'api') {
      requestBody.chatHistory = this.sessionState.history.map(msg => ({
        type: msg.role === 'user' ? 'human' : 'ai',
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        toolCalls: msg.toolCalls,
        metadata: msg.metadata
      }));
    }

    const response = await fetch(`${this.API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    let fullContent = '';
    console.log(`\n${colors.bright}${colors.green}🤖 AI助手:${colors.reset}`);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content' && parsed.data && parsed.data.content) {
                process.stdout.write(parsed.data.content);
                fullContent += parsed.data.content;
              } else if (parsed.type === 'error') {
                console.log(`\n${colors.red}❌ 流式响应错误: ${parsed.data?.error || '未知错误'}${colors.reset}`);
                break;
              } else if (parsed.type === 'done') {
                // 流式响应结束
                break;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      console.log('\n');
      
      // 记录AI回复
      this.sessionState.history.push({
        timestamp: new Date(),
        role: 'assistant',
        content: fullContent
      });
      
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 显示AI回复
   */
  private displayAIResponse(data: any): void {
    console.log(`\n${colors.bright}${colors.green}🤖 AI助手:${colors.reset}`);
    console.log(`${colors.white}${data.content}${colors.reset}\n`);
    
    // 显示工具调用
    if (data.toolCalls && data.toolCalls.length > 0) {
      console.log(`${colors.bright}${colors.blue}🔧 工具调用:${colors.reset}`);
      data.toolCalls.forEach((tc: any, index: number) => {
        console.log(`${colors.cyan}  ${index + 1}. ${colors.yellow}${tc.toolName}${colors.reset}`);
        if (tc.args) {
          console.log(`${colors.dim}     参数: ${JSON.stringify(tc.args, null, 2)}${colors.reset}`);
        }
        if (tc.result) {
          console.log(`${colors.dim}     结果: ${JSON.stringify(tc.result, null, 2)}${colors.reset}`);
        }
      });
      console.log();
    }
    
    // 显示元数据
    if (data.metadata && data.metadata.toolsUsed) {
      console.log(`${colors.dim}📊 使用的工具: ${data.metadata.toolsUsed.join(', ')}${colors.reset}`);
    }
    
    // 显示记忆模式信息
    if (data.metadata && data.metadata.memoryMode) {
      console.log(`${colors.dim}🧠 记忆模式: ${data.metadata.memoryMode}${colors.reset}`);
    }
    
    console.log();
  }


  /**
   * 管理模板
   */
  private manageTemplates(args: string[]): void {
    if (args.length === 0) {
      console.log(`${colors.bright}${colors.blue}📝 模板管理${colors.reset}`);
      console.log(`${colors.green}  /template list${colors.reset}     - 列出所有模板`);
      console.log(`${colors.green}  /template create <name>${colors.reset} - 创建新模板`);
      console.log(`${colors.green}  /template delete <name>${colors.reset} - 删除模板`);
      console.log(`${colors.green}  /template use <name>${colors.reset}   - 使用模板`);
      console.log();
    } else {
      const action = args[0];
      switch (action) {
        case 'list':
          console.log(`${colors.yellow}📋 可用模板:${colors.reset}`);
          console.log(`${colors.cyan}  - 默认聊天模板${colors.reset}`);
          console.log(`${colors.cyan}  - 工具测试模板${colors.reset}`);
          console.log(`${colors.cyan}  - 记忆管理模板${colors.reset}`);
          break;
        case 'create':
          console.log(`${colors.green}✅ 模板 "${args[1] || '未命名'}" 创建成功${colors.reset}`);
          break;
        case 'delete':
          console.log(`${colors.green}✅ 模板 "${args[1] || '未指定'}" 删除成功${colors.reset}`);
          break;
        case 'use':
          console.log(`${colors.green}✅ 已切换到模板 "${args[1] || '未指定'}"${colors.reset}`);
          break;
        default:
          console.log(`${colors.red}❌ 未知的模板操作: ${action}${colors.reset}`);
      }
      console.log();
    }
  }

  /**
   * 处理搜索
   */
  private handleSearch(args: string[]): void {
    if (args.length === 0) {
      console.log(`${colors.bright}${colors.blue}🔍 搜索功能${colors.reset}`);
      console.log(`${colors.green}  /search history <keyword>${colors.reset} - 搜索对话历史`);
      console.log(`${colors.green}  /search tools <keyword>${colors.reset}   - 搜索工具`);
      console.log(`${colors.green}  /search config <keyword>${colors.reset}  - 搜索配置`);
      console.log();
    } else {
      const type = args[0];
      const keyword = args.slice(1).join(' ');
      
      if (!keyword) {
        console.log(`${colors.red}❌ 请提供搜索关键词${colors.reset}\n`);
        return;
      }
      
      switch (type) {
        case 'history':
          console.log(`${colors.yellow}🔍 在对话历史中搜索 "${keyword}":${colors.reset}`);
          const historyMatches = this.sessionState.history.filter(msg => 
            msg.content.toLowerCase().includes(keyword.toLowerCase())
          );
          if (historyMatches.length > 0) {
            historyMatches.forEach((msg, index) => {
              console.log(`${colors.cyan}  ${index + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...${colors.reset}`);
            });
          } else {
            console.log(`${colors.dim}  未找到匹配的对话${colors.reset}`);
          }
          break;
        case 'tools':
          console.log(`${colors.yellow}🔍 在工具中搜索 "${keyword}":${colors.reset}`);
          const toolMatches = this.tools.filter(tool => 
            tool.name.toLowerCase().includes(keyword.toLowerCase()) ||
            tool.description.toLowerCase().includes(keyword.toLowerCase())
          );
          if (toolMatches.length > 0) {
            toolMatches.forEach((tool, index) => {
              console.log(`${colors.cyan}  ${index + 1}. ${tool.name} - ${tool.description}${colors.reset}`);
            });
          } else {
            console.log(`${colors.dim}  未找到匹配的工具${colors.reset}`);
          }
          break;
        case 'config':
          console.log(`${colors.yellow}🔍 在配置中搜索 "${keyword}":${colors.reset}`);
          const configKeys = Object.keys(this.sessionState.config);
          const configMatches = configKeys.filter(key => 
            key.toLowerCase().includes(keyword.toLowerCase())
          );
          if (configMatches.length > 0) {
            configMatches.forEach(key => {
              console.log(`${colors.cyan}  ${key}: ${this.sessionState.config[key as keyof typeof this.sessionState.config]}${colors.reset}`);
            });
          } else {
            console.log(`${colors.dim}  未找到匹配的配置项${colors.reset}`);
          }
          break;
        default:
          console.log(`${colors.red}❌ 未知的搜索类型: ${type}${colors.reset}`);
      }
      console.log();
    }
  }

  /**
   * 管理设置
   */
  private manageSettings(args: string[]): void {
    if (args.length === 0) {
      console.log(`${colors.bright}${colors.blue}⚙️ 设置管理${colors.reset}`);
      console.log(`${colors.green}  /settings list${colors.reset}        - 列出所有设置`);
      console.log(`${colors.green}  /settings set <key> <value>${colors.reset} - 设置值`);
      console.log(`${colors.green}  /settings get <key>${colors.reset}   - 获取值`);
      console.log(`${colors.green}  /settings reset${colors.reset}       - 重置为默认值`);
      console.log();
    } else {
      const action = args[0];
      switch (action) {
        case 'list':
          console.log(`${colors.yellow}📋 当前设置:${colors.reset}`);
          console.log(`${colors.cyan}  streaming: ${this.sessionState.config.streaming}${colors.reset}`);
          console.log(`${colors.cyan}  temperature: ${this.sessionState.config.temperature}${colors.reset}`);
          console.log(`${colors.cyan}  model: ${this.sessionState.config.model}${colors.reset}`);
          console.log(`${colors.cyan}  toolExecMode: ${this.sessionState.toolExecMode}${colors.reset}`);
          console.log(`${colors.cyan}  memoryMode: ${this.sessionState.memoryMode}${colors.reset}`);
          break;
        case 'set':
          const key = args[1];
          const value = args[2];
          if (key && value !== undefined) {
            if (key in this.sessionState.config) {
              const oldValue = this.sessionState.config[key as keyof typeof this.sessionState.config];
              (this.sessionState.config as any)[key] = value;
              console.log(`${colors.green}✅ 设置 ${key}: ${oldValue} -> ${value}${colors.reset}`);
            } else {
              console.log(`${colors.red}❌ 未知的设置项: ${key}${colors.reset}`);
            }
          } else {
            console.log(`${colors.red}❌ 请提供设置项和值${colors.reset}`);
          }
          break;
        case 'get':
          const getKey = args[1];
          if (getKey) {
            if (getKey in this.sessionState.config) {
              console.log(`${colors.cyan}${getKey}: ${this.sessionState.config[getKey as keyof typeof this.sessionState.config]}${colors.reset}`);
            } else {
              console.log(`${colors.red}❌ 未知的设置项: ${getKey}${colors.reset}`);
            }
          } else {
            console.log(`${colors.red}❌ 请提供设置项名称${colors.reset}`);
          }
          break;
        case 'reset':
          this.sessionState.config = {
            streaming: false,
            temperature: 0,
            model: 'deepseek-chat'
          };
          console.log(`${colors.green}✅ 设置已重置为默认值${colors.reset}`);
          break;
        default:
          console.log(`${colors.red}❌ 未知的设置操作: ${action}${colors.reset}`);
      }
      console.log();
    }
  }
}

// 启动高级交互式测试
async function main() {
  const tester = new AdvancedChatTester();
  await tester.start();
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}未处理的Promise拒绝:${colors.reset}`, reason);
});

process.on('uncaughtException', (error) => {
  console.error(`${colors.red}未捕获的异常:${colors.reset}`, error);
  process.exit(1);
});

// 运行主程序
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
