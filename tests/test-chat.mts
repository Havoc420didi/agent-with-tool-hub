// test-advanced-chat.mts - 高级交互式西城咖啡工具 Chat API 测试

// 导入 dotenv 配置
import { config } from 'dotenv';
import { resolve } from 'path';
import * as readline from 'readline';
config({ path: resolve(process.cwd(), './config.env') });

import { WestoreCafeTools } from '../examples/tool-demo/westore-cafe-tools.js';
import { ModelConfigManager, ModelConfig } from '../src/config/model-config.js';

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
  pendingToolCalls: any[]; // 待执行的工具调用
  isWaitingForToolResult: boolean; // 是否正在等待工具执行结果
  pendingAnswerToolCalls: any[]; // 待回答的工具调用（需要外部处理的）
  config: {
    streaming: boolean;
    temperature: number;
    model: string;
    modelProvider: string;
    apiKey: string;
    baseURL: string;
  };
}

// CLI命令定义
interface CLICommand {
  short: string;
  full: string;
  description: string;
  aliases?: string[];
  category?: string;
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
    // 基础命令
    { short: '/h', full: '/help', description: '显示帮助信息', category: '基础' },
    { short: '/s', full: '/status', description: '显示会话状态', category: '基础' },
    { short: '/hi', full: '/history', description: '显示对话历史', category: '基础' },
    { short: '/cl', full: '/clear', description: '清空屏幕', category: '基础' },
    { short: '/ex', full: '/exit', description: '退出程序', category: '基础' },
    
    // 工具相关
    { short: '/t', full: '/tools', description: '显示可用工具列表', category: '工具' },
    { short: '/m', full: '/mode', description: '切换工具执行模式 (internal/outside)', category: '工具' },
    { short: '/p', full: '/pending', description: '显示待回答的工具调用', category: '工具' },
    
    // 模型相关
    { short: '/ml', full: '/models', description: '显示可用模型列表', category: '模型' },
    { short: '/ms', full: '/model-switch', description: '切换模型', category: '模型' },
    { short: '/mo', full: '/model', description: '设置模型名称', category: '模型' },
    { short: '/mv', full: '/model-validate', description: '验证模型配置', category: '模型' },
    { short: '/temp', full: '/temperature', description: '设置温度值 (0-1)', category: '模型' },
    
    // 配置相关
    { short: '/c', full: '/config', description: '显示当前配置', category: '配置' },
    { short: '/st', full: '/stream', description: '切换流式/非流式模式', category: '配置' },
    { short: '/mem', full: '/memory', description: '切换记忆模式 (api/lg)', category: '配置' },
    
    // 数据相关
    { short: '/e', full: '/export', description: '导出对话历史 (local|api|both)', category: '数据' },
    { short: '/r', full: '/reset', description: '重置会话', category: '数据' },
    { short: '/ct', full: '/clear-tools', description: '清除待执行的工具调用', category: '工具' },
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

  getCommandsByCategory(): Record<string, CLICommand[]> {
    const categorized: Record<string, CLICommand[]> = {};
    this.commands.forEach(cmd => {
      const category = cmd.category || '其他';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(cmd);
    });
    return categorized;
  }
}

const DEFAULT_TOOL_EXEC_MODE = 'outside';
const DEFAULT_MEMORY_MODE = 'lg';

// 模型配置管理器已从 model-config.ts 导入

class AdvancedChatTester {
  private rl: readline.Interface;
  private sessionState: SessionState;
  private API_BASE_URL: string;
  private tools: any[];
  private smartCLIProcessor: SmartCLIProcessor;
  private modelManager: ModelConfigManager;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // 初始化模型管理器
    this.modelManager = new ModelConfigManager();
    const currentModel = this.modelManager.getCurrentModel();
    
    this.sessionState = {
      threadId: '', // 将在第一次发送消息时自动生成
      messageCount: 0,
      startTime: new Date(),
      isActive: true,
      history: [],
      toolExecMode: DEFAULT_TOOL_EXEC_MODE,
      memoryMode: DEFAULT_MEMORY_MODE, // 默认使用LG模式
      pendingToolCalls: [], // 待执行的工具调用
      isWaitingForToolResult: false, // 是否正在等待工具执行结果
      pendingAnswerToolCalls: [], // 待回答的工具调用（需要外部处理的）
      config: {
        streaming: false,
        temperature: currentModel?.temperature || 0,
        model: currentModel?.name || 'deepseek-chat',
        modelProvider: currentModel?.provider || 'deepseek',
        apiKey: currentModel?.apiKey || '',
        baseURL: currentModel?.baseURL || ''
      }
    };
    
    this.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
    this.tools = WestoreCafeTools.getAll();  // INFO 这里默认使用 westore 咖啡工具。
    this.smartCLIProcessor = new SmartCLIProcessor();
    
    // 检查必要的环境变量
    this.checkEnvironment();
  }

  /**
   * 检查环境配置
   */
  private checkEnvironment(): void {
    const summary = this.modelManager.getConfigSummary();
    
    if (summary.totalModels === 0) {
      console.log(`${colors.red}❌ 未找到可用的模型配置${colors.reset}`);
      console.log(`${colors.yellow}请检查 config.env 文件中的模型配置${colors.reset}\n`);
      return;
    }
    
    // 显示配置摘要
    console.log(`${colors.green}✅ 已加载 ${summary.totalModels} 个模型配置${colors.reset}`);
    console.log(`${colors.cyan}可用提供商: ${summary.providers.join(', ')}${colors.reset}`);
    
    // 显示验证结果
    if (summary.validation.errorCount > 0) {
      console.log(`${colors.red}❌ 发现 ${summary.validation.errorCount} 个配置错误${colors.reset}`);
    }
    
    if (summary.validation.warningCount > 0) {
      console.log(`${colors.yellow}⚠️  发现 ${summary.validation.warningCount} 个配置警告${colors.reset}`);
    }
    
    // 显示当前模型
    if (summary.currentModel) {
      console.log(`${colors.cyan}当前模型: ${colors.yellow}${summary.currentModel.name} (${summary.currentModel.provider})${colors.reset}`);
      console.log(`${colors.dim}  API地址: ${summary.currentModel.baseURL}${colors.reset}`);
      console.log(`${colors.dim}  最大令牌: ${summary.currentModel.maxTokens || '未设置'}${colors.reset}\n`);
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
    console.log(`${colors.bgBlue}${colors.white} ☕ westore-cafe ${colors.reset}`);
    console.log('='.repeat(80));
    console.log(`${colors.cyan}会话ID: ${colors.bright}${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}`);
    console.log(`${colors.cyan}可用工具: ${colors.yellow}${this.tools.length}个${colors.reset}`);
    console.log(`${colors.cyan}可用模型: ${colors.yellow}${this.modelManager.getAllModels().length}个${colors.reset}`);
    console.log(`${colors.cyan}当前模型: ${colors.yellow}${this.sessionState.config.model} (${this.sessionState.config.modelProvider})${colors.reset}`);
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
    
    const categorizedCommands = this.smartCLIProcessor.getCommandsByCategory();
    const categories = ['基础', '模型', '工具', '配置', '数据'];
    
    categories.forEach(category => {
      const commands = categorizedCommands[category];
      if (commands && commands.length > 0) {
        console.log(`\n${colors.bright}${colors.cyan}${category}命令:${colors.reset}`);
        commands.forEach(cmd => {
          const shortForm = cmd.short.length > 1 ? ` (${cmd.short})` : '';
          console.log(`${colors.green}  ${cmd.full}${shortForm}${colors.reset} - ${colors.dim}${cmd.description}${colors.reset}`);
        });
      }
    });
    
    console.log(`\n${colors.dim}  直接输入消息与AI助手对话${colors.reset}`);
    console.log(`${colors.yellow}💡 提示: 支持命令前缀匹配，如输入 '/h' 会自动匹配 '/help'${colors.reset}`);
    console.log(`${colors.yellow}💡 提示: 如果前缀冲突，系统会显示所有可能的命令${colors.reset}`);
    console.log(`${colors.yellow}💡 提示: 使用 '/models' 查看所有可用模型，使用 '/model-switch' 快速切换模型${colors.reset}\n`);
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
   * 继续交互（在工具执行完成后）
   */
  private async continueInteraction(): Promise<void> {
    try {
      const input = await this.promptUser();
      
      if (!input.trim()) {
        await this.continueInteraction();
        return;
      }

      // 处理命令
      if (input.startsWith('/')) {
        await this.handleCommand(input);
        await this.continueInteraction();
        return;
      }

      // 发送消息到AI
      await this.sendMessage(input);
      
    } catch (error) {
      console.error(`${colors.red}❌ 错误: ${error}${colors.reset}\n`);
      await this.continueInteraction();
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
        
      case '/pending':
        this.showPendingAnswerToolCalls();
        break;
        
      case '/temperature':
        this.setTemperature(args[0]);
        break;
        
      case '/models':
        this.printModels();
        break;
        
      case '/model-switch':
        this.handleModelSwitch(args);
        break;
        
      case '/model':
        this.setModel(args.join(' '));
        break;
        
      case '/model-validate':
        this.validateModels();
        break;
        
      case '/clear':
        this.clearSession();
        break;
        
      case '/export':
        await this.handleExportCommand(args);
        break;
        
      case '/reset':
        this.resetSession();
        break;
        
      case '/clear-tools':
        this.clearPendingTools();
        break;
        
      case '/exit':
        console.log(`${colors.yellow}👋 再见！${colors.reset}`);
        this.sessionState.isActive = false;
        this.rl.close();
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
    console.log(`${colors.cyan}  待执行工具: ${colors.yellow}${this.sessionState.pendingToolCalls.length}个${colors.reset}`);
    console.log(`${colors.cyan}  待回答工具: ${colors.yellow}${this.sessionState.pendingAnswerToolCalls.length}个${colors.reset}`);
    console.log(`${colors.cyan}  等待工具结果: ${colors.yellow}${this.sessionState.isWaitingForToolResult ? '是' : '否'}${colors.reset}`);
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
    console.log(`${colors.cyan}  提供商: ${colors.yellow}${this.sessionState.config.modelProvider}${colors.reset}`);
    console.log(`${colors.cyan}  温度: ${colors.yellow}${this.sessionState.config.temperature}${colors.reset}`);
    console.log(`${colors.cyan}  流式: ${colors.yellow}${this.sessionState.config.streaming ? '是' : '否'}${colors.reset}`);
    console.log(`${colors.cyan}  工具执行模式: ${colors.yellow}${this.sessionState.toolExecMode}${colors.reset}`);
    console.log(`${colors.cyan}  记忆模式: ${colors.yellow}${this.sessionState.memoryMode}${colors.reset}`);
    console.log(`${colors.cyan}  待执行工具: ${colors.yellow}${this.sessionState.pendingToolCalls.length}个${colors.reset}`);
    console.log(`${colors.cyan}  等待工具结果: ${colors.yellow}${this.sessionState.isWaitingForToolResult ? '是' : '否'}${colors.reset}`);
    console.log(`${colors.cyan}  Thread-ID: ${colors.yellow}${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}`);
    console.log(`${colors.cyan}  API地址: ${colors.yellow}${this.API_BASE_URL}${colors.reset}`);
    console.log(`${colors.cyan}  模型API: ${colors.yellow}${this.sessionState.config.baseURL}${colors.reset}\n`);
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
   * 打印可用模型列表
   */
  private printModels(): void {
    const models = this.modelManager.getAllModels();
    const currentModel = this.modelManager.getCurrentModel();
    
    console.log(`\n${colors.bright}${colors.blue}🤖 可用模型 (${models.length}个):${colors.reset}`);
    
    if (models.length === 0) {
      console.log(`${colors.dim}  暂无可用模型${colors.reset}\n`);
      return;
    }
    
    models.forEach((model, index) => {
      const isCurrent = currentModel && model.name === currentModel.name;
      const status = isCurrent ? `${colors.green}✓ 当前${colors.reset}` : `${colors.dim}  ${colors.reset}`;
      const providerColor = model.provider === 'deepseek' ? colors.cyan : 
                           model.provider === 'qwen' ? colors.magenta : colors.blue;
      
      console.log(`${status} ${colors.cyan}${index + 1}.${colors.reset} ${colors.yellow}${model.name}${colors.reset}`);
      console.log(`${colors.dim}     提供商: ${providerColor}${model.provider}${colors.reset}`);
      console.log(`${colors.dim}     描述: ${model.description || '无描述'}${colors.reset}`);
      console.log(`${colors.dim}     温度: ${model.temperature}${colors.reset}`);
      console.log(`${colors.dim}     最大令牌: ${model.maxTokens || '未设置'}${colors.reset}`);
      console.log(`${colors.dim}     API: ${model.baseURL}${colors.reset}`);
      console.log();
    });
    
    console.log(`${colors.yellow}💡 使用 /model-switch <模型名称或编号> 来切换模型${colors.reset}\n`);
  }

  /**
   * 处理模型切换命令
   */
  private handleModelSwitch(args: string[]): void {
    if (args.length === 0) {
      console.log(`\n${colors.bright}${colors.blue}🔄 模型切换${colors.reset}`);
      console.log(`${colors.green}  /model-switch <模型名称>${colors.reset}     - 按名称切换模型`);
      console.log(`${colors.green}  /model-switch <编号>${colors.reset}        - 按编号切换模型`);
      console.log(`${colors.green}  /model-switch list${colors.reset}          - 显示模型列表`);
      console.log(`${colors.dim}用法: /model-switch [模型名称|编号|list]${colors.reset}\n`);
      return;
    }

    const input = args[0].toLowerCase();
    
    if (input === 'list') {
      this.printModels();
      return;
    }

    const models = this.modelManager.getAllModels();
    let success = false;
    let newModel: ModelConfig | null = null;

    // 尝试按编号切换
    const index = parseInt(input) - 1;
    if (!isNaN(index) && index >= 0 && index < models.length) {
      success = this.modelManager.switchToModelByIndex(index);
      newModel = models[index];
    } else {
      // 尝试按名称切换
      success = this.modelManager.switchToModel(input);
      if (success) {
        newModel = this.modelManager.getCurrentModel();
      }
    }

    if (success && newModel) {
      // 更新会话状态
      this.sessionState.config.model = newModel.name;
      this.sessionState.config.modelProvider = newModel.provider;
      this.sessionState.config.apiKey = newModel.apiKey;
      this.sessionState.config.baseURL = newModel.baseURL;
      this.sessionState.config.temperature = newModel.temperature;
      
      console.log(`${colors.green}✅ 模型已切换为: ${colors.yellow}${newModel.name}${colors.reset}`);
      console.log(`${colors.cyan}  提供商: ${colors.yellow}${newModel.provider}${colors.reset}`);
      console.log(`${colors.cyan}  API地址: ${colors.yellow}${newModel.baseURL}${colors.reset}`);
      console.log(`${colors.cyan}  温度: ${colors.yellow}${newModel.temperature}${colors.reset}\n`);
    } else {
      console.log(`${colors.red}❌ 未找到模型: ${input}${colors.reset}`);
      console.log(`${colors.dim}使用 /models 查看所有可用模型${colors.reset}\n`);
    }
  }

  /**
   * 设置模型
   */
  private setModel(modelName: string): void {
    if (!modelName.trim()) {
      console.log(`${colors.red}❌ 请提供模型名称${colors.reset}\n`);
      return;
    }
    
    // 尝试切换到指定模型
    const success = this.modelManager.switchToModel(modelName.trim());
    if (success) {
      const currentModel = this.modelManager.getCurrentModel();
      if (currentModel) {
        // 更新会话状态
        this.sessionState.config.model = currentModel.name;
        this.sessionState.config.modelProvider = currentModel.provider;
        this.sessionState.config.apiKey = currentModel.apiKey;
        this.sessionState.config.baseURL = currentModel.baseURL;
        this.sessionState.config.temperature = currentModel.temperature;
        
        console.log(`${colors.green}✅ 模型已设置为 ${colors.yellow}${currentModel.name}${colors.reset}`);
        console.log(`${colors.cyan}  提供商: ${colors.yellow}${currentModel.provider}${colors.reset}\n`);
      }
    } else {
      console.log(`${colors.red}❌ 未找到模型: ${modelName}${colors.reset}`);
      console.log(`${colors.dim}使用 /models 查看所有可用模型${colors.reset}\n`);
    }
  }

  /**
   * 验证模型配置
   */
  private validateModels(): void {
    console.log(`\n${colors.bright}${colors.blue}🔍 验证模型配置:${colors.reset}`);
    
    const validation = this.modelManager.validateAllModels();
    const models = this.modelManager.getAllModels();
    
    if (models.length === 0) {
      console.log(`${colors.red}❌ 未找到任何模型配置${colors.reset}\n`);
      return;
    }
    
    if (validation.valid) {
      console.log(`${colors.green}✅ 所有模型配置验证通过${colors.reset}`);
      console.log(`${colors.cyan}  已验证 ${models.length} 个模型${colors.reset}`);
      
      models.forEach((model, index) => {
        const isCurrent = this.modelManager.getCurrentModel()?.name === model.name;
        const status = isCurrent ? `${colors.green}✓ 当前${colors.reset}` : `${colors.dim}  ${colors.reset}`;
        console.log(`${status} ${colors.cyan}${index + 1}.${colors.reset} ${colors.yellow}${model.name}${colors.reset} (${model.provider})`);
        console.log(`${colors.dim}     API: ${model.baseURL}${colors.reset}`);
        console.log(`${colors.dim}     最大令牌: ${model.maxTokens || '未设置'}${colors.reset}`);
      });
    } else {
      console.log(`${colors.red}❌ 发现配置错误:${colors.reset}`);
      
      Object.entries(validation.errors).forEach(([modelKey, errors]) => {
        console.log(`\n${colors.red}  ${modelKey}:${colors.reset}`);
        errors.forEach(error => {
          console.log(`${colors.red}    - ${error}${colors.reset}`);
        });
      });
      
      console.log(`\n${colors.yellow}💡 请修复配置错误后重试${colors.reset}`);
    }
    
    // 显示警告
    if (Object.keys(validation.warnings).length > 0) {
      console.log(`\n${colors.yellow}⚠️  配置警告:${colors.reset}`);
      Object.entries(validation.warnings).forEach(([modelKey, warnings]) => {
        console.log(`\n${colors.yellow}  ${modelKey}:${colors.reset}`);
        warnings.forEach(warning => {
          console.log(`${colors.yellow}    - ${warning}${colors.reset}`);
        });
      });
    }
    
    console.log();
  }


  /**
   * 处理导出命令
   */
  private async handleExportCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(`${colors.bright}${colors.blue}📤 导出对话历史${colors.reset}`);
      console.log(`${colors.green}  /export local${colors.reset}     - 使用本地缓存导出（默认）`);
      console.log(`${colors.green}  /export api${colors.reset}       - 使用API获取完整历史记录`);
      console.log(`${colors.green}  /export both${colors.reset}      - 同时使用两种方式导出`);
      console.log(`${colors.dim}用法: /export [local|api|both]${colors.reset}\n`);
      return;
    }

    const mode = args[0].toLowerCase();
    
    switch (mode) {
      case 'local':
        await this.exportHistoryLocal();
        break;
      case 'api':
        await this.exportHistoryFromAPI();
        break;
      case 'both':
        await this.exportHistoryBoth();
        break;
      default:
        console.log(`${colors.red}❌ 无效的导出模式: ${mode}${colors.reset}`);
        console.log(`${colors.dim}可用模式: local, api, both${colors.reset}\n`);
    }
  }

  /**
   * 导出对话历史（本地缓存）
   */
  private async exportHistoryLocal(): Promise<void> {
    if (!this.sessionState.threadId) {
      console.log(`${colors.red}❌ 没有可导出的会话历史${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}📤 正在导出对话历史（本地缓存）...${colors.reset}`);
    
    const exportData = {
      sessionId: this.sessionState.threadId,
      startTime: this.sessionState.startTime,
      endTime: new Date(),
      messageCount: this.sessionState.messageCount,
      config: this.sessionState.config,
      history: this.sessionState.history,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      source: 'local_cache'
    };
    
    const filename = `chat-export-local-${this.sessionState.threadId}.json`;
    
    try {
      // 确保目录存在
      const { writeFileSync, mkdirSync } = await import('fs');
      
      // 创建目录（如果不存在）
      try {
        mkdirSync('data/chat-history', { recursive: true });
      } catch (e) {
        // 目录可能已存在，忽略错误
      }
      
      writeFileSync(`data/chat-history/${filename}`, JSON.stringify(exportData, null, 2));
      console.log(`${colors.green}✅ 对话历史已导出到 data/chat-history/${filename}${colors.reset}`);
      console.log(`${colors.dim}  导出内容包含本地缓存的聊天记录和元数据${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}❌ 导出失败: ${error}${colors.reset}\n`);
    }
  }

  /**
   * 导出对话历史（API获取）
   */
  private async exportHistoryFromAPI(): Promise<void> {
    if (!this.sessionState.threadId) {
      console.log(`${colors.red}❌ 没有可导出的会话历史${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}📤 正在从API获取完整对话历史...${colors.reset}`);
    
    try {
      // 调用 memory API 获取完整历史记录
      const response = await fetch(`${this.API_BASE_URL}/api/memory/thread/${this.sessionState.threadId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`${colors.yellow}⚠️  Thread ${this.sessionState.threadId} 在服务端不存在，可能已被清理${colors.reset}`);
          console.log(`${colors.dim}  建议使用 /export local 导出本地缓存${colors.reset}\n`);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.log(`${colors.red}❌ API返回错误: ${result.error?.message || '未知错误'}${colors.reset}\n`);
        return;
      }

      // 构建导出数据
      const exportData = {
        sessionId: this.sessionState.threadId,
        startTime: this.sessionState.startTime,
        endTime: new Date(),
        messageCount: result.data.history?.currentState?.messageCount || 0,
        config: this.sessionState.config,
        memoryStats: result.data.memoryStats,
        apiHistory: result.data.history,
        localHistory: this.sessionState.history,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        source: 'api'
      };
      
      const filename = `chat-export-api-${this.sessionState.threadId}.json`;
      
      // 确保目录存在
      const { writeFileSync, mkdirSync } = await import('fs');
      
      try {
        mkdirSync('data/chat-history', { recursive: true });
      } catch (e) {
        // 目录可能已存在，忽略错误
      }
      
      writeFileSync(`data/chat-history/${filename}`, JSON.stringify(exportData, null, 2));
      
      console.log(`${colors.green}✅ 对话历史已导出到 data/chat-history/${filename}${colors.reset}`);
      console.log(`${colors.dim}  导出内容包含API获取的完整历史记录${colors.reset}`);
      
      // 显示API获取的详细信息
      if (result.data.history?.currentState?.messages) {
        const messages = result.data.history.currentState.messages;
        console.log(`${colors.cyan}  📊 API历史记录统计:${colors.reset}`);
        console.log(`${colors.dim}    - 总消息数: ${messages.length}${colors.reset}`);
        console.log(`${colors.dim}    - 用户消息: ${messages.filter((m: any) => m.type === 'HumanMessage').length}${colors.reset}`);
        console.log(`${colors.dim}    - AI消息: ${messages.filter((m: any) => m.type === 'AIMessage').length}${colors.reset}`);
        console.log(`${colors.dim}    - 工具消息: ${messages.filter((m: any) => m.type === 'ToolMessage').length}${colors.reset}`);
        console.log(`${colors.dim}    - 记忆模式: ${result.data.memoryStats?.memoryMode || 'unknown'}${colors.reset}`);
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ API导出失败: ${error}${colors.reset}\n`);
    }
  }

  /**
   * 导出对话历史（两种方式）
   */
  private async exportHistoryBoth(): Promise<void> {
    console.log(`${colors.cyan}📤 正在使用两种方式导出对话历史...${colors.reset}\n`);
    
    // 先导出本地缓存
    console.log(`${colors.yellow}1. 导出本地缓存...${colors.reset}`);
    await this.exportHistoryLocal();
    
    // 再导出API数据
    console.log(`${colors.yellow}2. 导出API数据...${colors.reset}`);
    await this.exportHistoryFromAPI();
    
    console.log(`${colors.green}✅ 双重导出完成！${colors.reset}\n`);
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
    this.sessionState.pendingToolCalls = [];
    this.sessionState.isWaitingForToolResult = false;
    
    console.clear();
    this.printWelcome();
    
    console.log(`${colors.green}✅ 会话已清空${colors.reset}`);
    console.log(`${colors.cyan}  旧 Thread-ID: ${colors.yellow}${oldThreadId}${colors.reset}`);
    console.log(`${colors.cyan}  新 Thread-ID: ${colors.yellow}${this.sessionState.threadId}${colors.reset}`);
    console.log(`${colors.dim}  - 对话历史已清空${colors.reset}`);
    console.log(`${colors.dim}  - 消息计数已重置${colors.reset}`);
    console.log(`${colors.dim}  - 工具调用状态已重置${colors.reset}`);
    console.log(`${colors.dim}  - 准备开始新的对话${colors.reset}\n`);
  }

  /**
   * 重置会话
   */
  private resetSession(): void {
    const currentModel = this.modelManager.getCurrentModel();
    
    this.sessionState = {
      threadId: `session_${Date.now()}`,
      messageCount: 0,
      startTime: new Date(),
      isActive: true,
      history: [],
      toolExecMode: DEFAULT_TOOL_EXEC_MODE,
      memoryMode: DEFAULT_MEMORY_MODE, // 重置为LG模式
      pendingToolCalls: [],
      isWaitingForToolResult: false,
      pendingAnswerToolCalls: [], // 重置待回答的工具调用
      config: {
        streaming: false,
        temperature: currentModel?.temperature || 0,
        model: currentModel?.name || 'deepseek-chat',
        modelProvider: currentModel?.provider || 'deepseek',
        apiKey: currentModel?.apiKey || '',
        baseURL: currentModel?.baseURL || ''
      }
    };
    console.log(`${colors.green}✅ 会话已重置${colors.reset}\n`);
  }

  /**
   * 清除待执行的工具调用
   */
  private clearPendingTools(): void {
    const clearedCount = this.sessionState.pendingToolCalls.length;
    this.sessionState.pendingToolCalls = [];
    this.sessionState.isWaitingForToolResult = false;
    
    console.log(`${colors.green}✅ 已清除 ${clearedCount} 个待执行的工具调用${colors.reset}`);
    console.log(`${colors.dim}  - 工具调用状态已重置${colors.reset}`);
    console.log(`${colors.dim}  - 可以继续正常对话${colors.reset}\n`);
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
    
    // 检查是否正在等待工具执行结果
    if (this.sessionState.isWaitingForToolResult && this.sessionState.pendingToolCalls.length > 0) {
      console.log(`${colors.yellow}🔧 检测到工具执行结果输入，将作为工具结果处理${colors.reset}`);
      await this.handleToolResultInput(message);
      return;
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
    // 构建请求体 - 使用新的统一 API 格式
    const requestBody: any = {
      message,
      threadId: this.sessionState.threadId,
      messageType: 'user', // 明确指定消息类型
      model: {
        name: this.sessionState.config.model,
        temperature: this.sessionState.config.temperature,
        baseURL: this.sessionState.config.baseURL,
        apiKey: this.sessionState.config.apiKey
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
        },
        outsideConfig: this.sessionState.toolExecMode === 'outside' ? {
          waitForResult: false,
          timeout: 30000
        } : undefined
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

      // 如果是外部执行模式且有待执行的工具调用，处理工具调用
      if (this.sessionState.toolExecMode === 'outside' && 
        this.sessionState.pendingAnswerToolCalls.length > 0) {
        this.handleExternalToolCalls(this.sessionState.pendingAnswerToolCalls);
      }
    } else {
      console.log(`${colors.red}❌ AI回复失败: ${result.error}${colors.reset}\n`);
    }
  }

  /**
   * 发送流式消息
   */
  private async sendStreamingMessage(message: string): Promise<void> {
    // 构建请求体 - 使用新的统一 API 格式
    const requestBody: any = {
      message,
      threadId: this.sessionState.threadId,
      messageType: 'user', // 明确指定消息类型
      model: {
        name: this.sessionState.config.model,
        temperature: this.sessionState.config.temperature,
        baseURL: this.sessionState.config.baseURL,
        apiKey: this.sessionState.config.apiKey
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
        },
        outsideConfig: this.sessionState.toolExecMode === 'outside' ? {
          waitForResult: false,
          timeout: 30000
        } : undefined
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
    let toolCalls: any[] = [];
    let metadata: any = {};
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
              } else if (parsed.type === 'toolCalls' && parsed.data) {
                toolCalls = parsed.data;
              } else if (parsed.type === 'metadata' && parsed.data) {
                metadata = parsed.data;
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
        content: fullContent,
        toolCalls: toolCalls,
        metadata: metadata
      });

      // 如果是外部执行模式且有待执行的工具调用，处理工具调用
      if (this.sessionState.toolExecMode === 'outside' && 
          this.sessionState.pendingAnswerToolCalls.length > 0) {
        this.handleExternalToolCalls(this.sessionState.pendingAnswerToolCalls);
      }
      
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 处理外部工具调用
   */
  private async handleExternalToolCalls(pendingToolCalls: any[]): Promise<void> {
    // 过滤掉已经完成的工具调用
    const activeToolCalls = pendingToolCalls.filter(tc => 
      tc.status !== 'completed' && tc.status !== 'failed'
    );
    
    if (activeToolCalls.length === 0) {
      console.log(`${colors.dim}📝 没有需要处理的活跃工具调用${colors.reset}`);
      // 重置等待状态，让用户可以继续输入
      this.sessionState.isWaitingForToolResult = false;
      console.log(`${colors.dim}✅ 等待用户输入${colors.reset}\n`);
      
      // 继续交互循环，等待用户输入
      this.continueInteraction();
      return;
    }
    
    console.log(`\n${colors.bright}${colors.yellow}🔧 检测到 ${activeToolCalls.length} 个待执行的工具调用${colors.reset}`);
    
    // 更新会话状态 - 合并新的待执行工具调用，避免重复
    const existingIds = new Set(this.sessionState.pendingToolCalls.map(tc => tc.id));
    const newToolCalls = activeToolCalls.filter(tc => !existingIds.has(tc.id));
    this.sessionState.pendingToolCalls = [...this.sessionState.pendingToolCalls, ...newToolCalls];
    this.sessionState.isWaitingForToolResult = true;
    
    // 只处理新添加的工具调用，避免重复处理
    for (const toolCall of newToolCalls) {
      const toolName = toolCall.toolName || toolCall.name;
      console.log(`\n${colors.cyan}工具调用: ${colors.yellow}${toolName}${colors.reset}`);
      
      // 显示工具ID
      if (toolCall.id) {
        console.log(`${colors.dim}ID: ${toolCall.id}${colors.reset}`);
      }
      
      // 显示工具描述
      if (toolCall.description) {
        console.log(`${colors.dim}描述: ${toolCall.description}${colors.reset}`);
      }
      
      // 显示参数详情
      if (toolCall.args && Object.keys(toolCall.args).length > 0) {
        console.log(`${colors.dim}参数详情:${colors.reset}`);
        Object.entries(toolCall.args).forEach(([key, value]) => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 6) : String(value);
          console.log(`${colors.dim}  ${key}: ${valueStr}${colors.reset}`);
        });
      } else if (toolCall.args) {
        console.log(`${colors.dim}参数: ${JSON.stringify(toolCall.args, null, 2)}${colors.reset}`);
      }
      
      // 显示状态
      if (toolCall.status) {
        const statusColor = toolCall.status === 'pending' ? colors.yellow : 
                           toolCall.status === 'completed' ? colors.green : 
                           toolCall.status === 'failed' ? colors.red : colors.dim;
        console.log(`${colors.dim}状态: ${statusColor}${toolCall.status}${colors.reset}`);
      }
      
      // 提示用户输入工具执行结果
      const toolResult = await this.promptToolResult(toolCall);
      
      if (toolResult !== null) {
        // 发送工具执行结果
        await this.sendToolResult(toolCall.id, toolResult);
      } else {
        console.log(`${colors.red}❌ 跳过工具调用: ${toolName}${colors.reset}`);
        // 标记为失败状态
        this.markToolCallAsFailed(toolCall.id, '用户跳过');
      }
    }
  }

  /**
   * 处理工具结果输入（当用户直接输入工具结果时）
   */
  private async handleToolResultInput(message: string): Promise<void> {
    if (this.sessionState.pendingToolCalls.length === 0) {
      console.log(`${colors.red}❌ 没有待执行的工具调用${colors.reset}\n`);
      return;
    }
    
    // 使用第一个待执行的工具调用
    const toolCall = this.sessionState.pendingToolCalls[0];
    const toolName = toolCall.toolName || toolCall.name;
    console.log(`${colors.cyan}🔧 将输入作为工具 "${toolName}" 的执行结果${colors.reset}`);
    
    // 发送工具执行结果
    await this.sendToolResult(toolCall.id, message);
  }

  /**
   * 提示用户输入工具执行结果
   */
  private async promptToolResult(toolCall: any): Promise<string | null> {
    return new Promise((resolve) => {
      const toolName = toolCall.toolName || toolCall.name;
      console.log(`\n${colors.bright}${colors.blue}请输入工具 "${toolName}" 的执行结果:${colors.reset}`);
      console.log(`${colors.dim}  - 直接输入消息将作为工具结果处理${colors.reset}`);
      
      // 构建带工具名称和ID的提示符
      const toolId = toolCall.id || 'unknown';
      const promptText = `工具返回（${toolName} ${toolId}）：`;
      
      this.rl.question(`${colors.bright}${colors.green}${promptText}${colors.reset}`, (input) => {
        const trimmedInput = input.trim();
        
        if (!trimmedInput) {
          console.log(`${colors.red}❌ 请输入工具执行结果${colors.reset}`);
          resolve(null);
          return;
        }
        
        resolve(trimmedInput);
      });
    });
  }

  /**
   * 发送工具执行结果
   */
  private async sendToolResult(toolCallId: string, toolResult: string): Promise<void> {
    console.log(`${colors.dim}📤 正在发送工具执行结果...${colors.reset}`);
    
    // 标记工具调用为执行中
    this.markToolCallAsExecuting(toolCallId);
    
    const requestBody: any = {
      message: toolResult,
      threadId: this.sessionState.threadId,
      messageType: 'tool', // 指定为工具消息
      model: {
        name: this.sessionState.config.model,
        temperature: this.sessionState.config.temperature,
        baseURL: this.sessionState.config.baseURL,
        apiKey: this.sessionState.config.apiKey
      },
      memory: { 
        enabled: true,
        mode: this.sessionState.memoryMode,
        maxHistory: 50
      },
      toolExecutionConfig: {
        mode: 'outside',
        outsideConfig: {
          waitForResult: false,
          timeout: 30000
        }
      }
    };

    try {
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
        console.log(`${colors.green}✅ 工具执行结果已发送${colors.reset}`);
        
        // 标记工具调用为已完成
        this.markToolCallAsCompleted(toolCallId, toolResult);
        
        // 从待执行列表中移除已处理的工具调用
        this.sessionState.pendingToolCalls = this.sessionState.pendingToolCalls.filter(tc => tc.id !== toolCallId);
        
        // 从待回答列表中移除已处理的工具调用
        this.sessionState.pendingAnswerToolCalls = this.sessionState.pendingAnswerToolCalls.filter(tc => tc.id !== toolCallId);
        
        // 如果没有更多待执行的工具调用，重置等待状态
        if (this.sessionState.pendingToolCalls.length === 0) {
          this.sessionState.isWaitingForToolResult = false;
        }
        
        // 显示AI的后续回复
        if (result.data.content) {
          console.log(`\n${colors.bright}${colors.green}🤖 AI助手:${colors.reset}`);
          console.log(`${colors.white}${result.data.content}${colors.reset}\n`);
          
          // 记录AI回复
          this.sessionState.history.push({
            timestamp: new Date(),
            role: 'assistant',
            content: result.data.content,
            toolCalls: result.data.toolCalls,
            metadata: result.data.metadata
          });
        }
        
        // 如果还有待执行的工具调用，继续处理（避免递归调用）
        if (this.sessionState.pendingAnswerToolCalls.length > 0) {
          this.handleExternalToolCalls(this.sessionState.pendingAnswerToolCalls);
        } else {
          // 如果没有更多待执行的工具调用，确保重置等待状态
          this.sessionState.isWaitingForToolResult = false;
          console.log(`${colors.dim}✅ 所有工具调用已完成，等待用户输入${colors.reset}\n`);
          
          // 继续交互循环，等待用户输入
          this.continueInteraction();
        }
      } else {
        console.log(`${colors.red}❌ 发送工具执行结果失败: ${result.error}${colors.reset}\n`);
        this.markToolCallAsFailed(toolCallId, result.error?.message || '发送失败');
      }
    } catch (error) {
      console.log(`${colors.red}❌ 发送工具执行结果时出错: ${error}${colors.reset}\n`);
      this.markToolCallAsFailed(toolCallId, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 标记工具调用为执行中
   */
  private markToolCallAsExecuting(toolCallId: string): void {
    const toolCall = this.sessionState.pendingToolCalls.find(tc => tc.id === toolCallId);
    if (toolCall) {
      toolCall.status = 'executing';
      console.log(`${colors.dim}🔄 工具调用 ${toolCallId} 状态更新为: 执行中${colors.reset}`);
    }
  }

  /**
   * 标记工具调用为已完成
   */
  private markToolCallAsCompleted(toolCallId: string, result: any): void {
    const toolCall = this.sessionState.pendingToolCalls.find(tc => tc.id === toolCallId);
    if (toolCall) {
      toolCall.status = 'completed';
      toolCall.result = result;
      console.log(`${colors.dim}✅ 工具调用 ${toolCallId} 状态更新为: 已完成${colors.reset}`);
    }
  }

  /**
   * 标记工具调用为失败
   */
  private markToolCallAsFailed(toolCallId: string, error: string): void {
    const toolCall = this.sessionState.pendingToolCalls.find(tc => tc.id === toolCallId);
    if (toolCall) {
      toolCall.status = 'failed';
      toolCall.error = error;
      console.log(`${colors.dim}❌ 工具调用 ${toolCallId} 状态更新为: 失败 - ${error}${colors.reset}`);
    }
  }

  /**
   * 显示AI回复
   */
  private displayAIResponse(data: any): void {
    console.log(`\n${colors.bright}${colors.green}🤖 AI助手:${colors.reset}`);
    console.log(`${colors.white}${data.content}${colors.reset}\n`);
    
    // 收集待回答的工具调用到 session-data 中
    this.collectPendingAnswerToolCalls(data);
    
    // 显示工具调用
    if (data.toolCalls && data.toolCalls.length > 0) {
      console.log(`${colors.bright}${colors.blue}🔧 工具调用详情:${colors.reset}`);
      data.toolCalls.forEach((tc: any, index: number) => {
        console.log(`\n${colors.cyan}  ${index + 1}. ${colors.yellow}${tc.toolName || tc.name}${colors.reset}`);
        // 显示工具ID
        if (tc.id || tc.toolCallId) {
          console.log(`${colors.dim}ID: ${tc.id || tc.toolCallId}${colors.reset}`);
        }
        
        // 显示工具描述
        if (tc.description) {
          console.log(`${colors.dim}描述: ${tc.description}${colors.reset}`);
        }
        
        // 显示参数详情
        if (tc.args && Object.keys(tc.args).length > 0) {
          console.log(`${colors.dim}参数:${colors.reset}`);
          Object.entries(tc.args).forEach(([key, value]) => {
            const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 6) : String(value);
            console.log(`${colors.dim}       ${key}: ${valueStr}${colors.reset}`);
          });
        } else if (tc.args) {
          console.log(`${colors.dim}参数: ${JSON.stringify(tc.args, null, 2)}${colors.reset}`);
        }
        
        // 显示执行状态
        if (tc.status) {
          const statusColor = tc.status === 'completed' ? colors.green : 
                             tc.status === 'failed' ? colors.red : 
                             tc.status === 'pending' ? colors.yellow : colors.dim;
          console.log(`${colors.dim}状态: ${statusColor}${tc.status}${colors.reset}`);
        }
        
        // 显示执行结果
        if (tc.result !== undefined) {
          console.log(`${colors.dim}结果:${colors.reset}`);
          const resultStr = typeof tc.result === 'object' ? JSON.stringify(tc.result, null, 6) : String(tc.result);
          console.log(`${colors.dim}${resultStr}${colors.reset}`);
        }
        
        // 显示执行时间
        if (tc.executionTime) {
          console.log(`${colors.dim}     执行时间: ${tc.executionTime}ms${colors.reset}`);
        }
        
        // 显示错误信息
        if (tc.error) {
          console.log(`${colors.red}     错误: ${tc.error}${colors.reset}`);
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
    
    // 显示执行模式
    if (data.metadata && data.metadata.executionMode) {
      console.log(`${colors.dim}⚙️  执行模式: ${data.metadata.executionMode}${colors.reset}`);
    }
    
    // 显示待回答的工具调用数量
    if (this.sessionState.pendingAnswerToolCalls.length > 0) {
      console.log(`${colors.dim}⏳ 待回答的工具调用: ${this.sessionState.pendingAnswerToolCalls.length} 个${colors.reset}`);
    }
    
    console.log();
  }

  /**
   * 收集待回答的工具调用到 session-data 中
   */
  private collectPendingAnswerToolCalls(data: any): void {
    // 清空之前的待回答工具调用
    this.sessionState.pendingAnswerToolCalls = [];
    
    // 检查是否有工具调用需要收集
    if (data.toolCalls && data.toolCalls.length > 0) {
      data.toolCalls.forEach((tc: any) => {
        // 判断是否需要外部处理的工具调用
        const needsExternalHandling = this.shouldCollectToolCall(tc, data);
        
        if (needsExternalHandling) {
          // 创建待回答的工具调用对象
          const pendingToolCall = {
            id: tc.id || tc.toolCallId || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            toolName: tc.toolName || tc.name,
            args: tc.args || {},
            description: tc.description || '',
            status: tc.status || 'pending',
            timestamp: new Date().toISOString(),
            threadId: this.sessionState.threadId,
            originalToolCall: tc, // 保存原始工具调用对象
            metadata: {
              executionMode: data.metadata?.executionMode || this.sessionState.toolExecMode,
              memoryMode: data.metadata?.memoryMode || this.sessionState.memoryMode,
              collectedAt: new Date().toISOString()
            }
          };
          
          this.sessionState.pendingAnswerToolCalls.push(pendingToolCall);
        }
      });
    }
    
    // 如果是从 metadata 中获取的待执行工具调用，也要收集
    if (data.metadata?.pendingToolCalls && data.metadata.pendingToolCalls.length > 0) {
      data.metadata.pendingToolCalls.forEach((tc: any) => {
        const pendingToolCall = {
          id: tc.id || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          toolName: tc.name || tc.toolName,
          args: tc.args || {},
          description: tc.description || '',
          status: tc.status || 'pending',
          timestamp: new Date().toISOString(),
          threadId: this.sessionState.threadId,
          originalToolCall: tc,
          metadata: {
            executionMode: data.metadata?.executionMode || this.sessionState.toolExecMode,
            memoryMode: data.metadata?.memoryMode || this.sessionState.memoryMode,
            collectedAt: new Date().toISOString(),
            source: 'metadata'
          }
        };
        
        this.sessionState.pendingAnswerToolCalls.push(pendingToolCall);
      });
    }
    
    // 如果没有收集到任何工具调用，清空待执行状态
    if (this.sessionState.pendingAnswerToolCalls.length === 0) {
      this.sessionState.isWaitingForToolResult = false;
      this.sessionState.pendingToolCalls = [];
    } else {
      // 记录收集结果
      console.log(`${colors.dim}📝 已收集 ${this.sessionState.pendingAnswerToolCalls.length} 个待回答的工具调用到 session-data${colors.reset}`);
    }
  }

  /**
   * 判断是否应该收集该工具调用
   */
  private shouldCollectToolCall(tc: any, data: any): boolean {
    // 在外部执行模式下，收集所有状态为 pending 的工具调用
    if (this.sessionState.toolExecMode === 'outside') {
      return tc.status === 'pending' || !tc.status || tc.status === undefined;
    }
    
    // 在内部执行模式下，只收集那些明确标记为需要外部处理的工具调用
    if (this.sessionState.toolExecMode === 'internal') {
      return tc.requiresExternalHandling === true || 
             tc.externalExecution === true ||
             (data.metadata?.executionMode === 'outside' && tc.status === 'pending');
    }
    
    // 默认不收集
    return false;
  }

  /**
   * 显示待回答的工具调用
   */
  private showPendingAnswerToolCalls(): void {
    if (this.sessionState.pendingAnswerToolCalls.length === 0) {
      console.log(`${colors.yellow}📝 当前没有待回答的工具调用${colors.reset}\n`);
      return;
    }
    
    console.log(`${colors.bright}${colors.blue}📝 待回答的工具调用 (${this.sessionState.pendingAnswerToolCalls.length} 个):${colors.reset}`);
    
    this.sessionState.pendingAnswerToolCalls.forEach((tc: any, index: number) => {
      console.log(`\n${colors.cyan}  ${index + 1}. ${colors.yellow}${tc.toolName}${colors.reset}`);
      console.log(`${colors.dim}    ID: ${tc.id}${colors.reset}`);
      console.log(`${colors.dim}    描述: ${tc.description}${colors.reset}`);
      console.log(`${colors.dim}    状态: ${tc.status}${colors.reset}`);
      console.log(`${colors.dim}    时间: ${tc.timestamp}${colors.reset}`);
      
      if (tc.args && Object.keys(tc.args).length > 0) {
        console.log(`${colors.dim}    参数:${colors.reset}`);
        Object.entries(tc.args).forEach(([key, value]) => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          console.log(`${colors.dim}      ${key}: ${valueStr}${colors.reset}`);
        });
      }
      
      if (tc.metadata) {
        console.log(`${colors.dim}    元数据:${colors.reset}`);
        console.log(`${colors.dim}      执行模式: ${tc.metadata.executionMode}${colors.reset}`);
        console.log(`${colors.dim}      记忆模式: ${tc.metadata.memoryMode}${colors.reset}`);
        console.log(`${colors.dim}      收集时间: ${tc.metadata.collectedAt}${colors.reset}`);
        if (tc.metadata.source) {
          console.log(`${colors.dim}      来源: ${tc.metadata.source}${colors.reset}`);
        }
      }
    });
    
    console.log();
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
          console.log(`${colors.cyan}  pendingToolCalls: ${this.sessionState.pendingToolCalls.length}个${colors.reset}`);
          console.log(`${colors.cyan}  isWaitingForToolResult: ${this.sessionState.isWaitingForToolResult}${colors.reset}`);
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
          const currentModel = this.modelManager.getCurrentModel();
          this.sessionState.config = {
            streaming: false,
            temperature: currentModel?.temperature || 0,
            model: currentModel?.name || 'deepseek-chat',
            modelProvider: currentModel?.provider || 'deepseek',
            apiKey: currentModel?.apiKey || '',
            baseURL: currentModel?.baseURL || ''
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
