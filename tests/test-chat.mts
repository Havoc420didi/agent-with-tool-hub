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

class AdvancedChatTester {
  private rl: readline.Interface;
  private sessionState: SessionState;
  private API_BASE_URL: string;
  private tools: any[];

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
      toolExecMode: 'outside',
      memoryMode: 'lg', // 默认使用LG模式
      config: {
        streaming: false,
        temperature: 0,
        model: 'deepseek-chat'
      }
    };
    
    this.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
    this.tools = WestoreCafeTools.getAll();
    
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
    console.log(`${colors.green}  /help (/h)${colors.reset}        - 显示帮助信息`);
    console.log(`${colors.green}  /tools (/t)${colors.reset}       - 显示可用工具列表`);
    console.log(`${colors.green}  /status (/s)${colors.reset}      - 显示会话状态`);
    console.log(`${colors.green}  /history (/hi)${colors.reset}     - 显示对话历史`);
    console.log(`${colors.green}  /config (/c)${colors.reset}      - 显示当前配置`);
    console.log(`${colors.green}  /stream (/st)${colors.reset}      - 切换流式/非流式模式`);
    console.log(`${colors.green}  /mode (/m)${colors.reset}        - 切换工具执行模式 (internal/outside)`);
    console.log(`${colors.green}  /memory (/mem)${colors.reset}    - 切换记忆模式 (api/lg)`);
    console.log(`${colors.green}  /temp (/te) <value>${colors.reset} - 设置温度值 (0-1)`);
    console.log(`${colors.green}  /model (/mo) <name>${colors.reset} - 设置模型名称`);
    console.log(`${colors.green}  /clear (/cl)${colors.reset}       - 清空屏幕`);
    console.log(`${colors.green}  /export (/e)${colors.reset}      - 导出对话历史`);
    console.log(`${colors.green}  /test-memory (/tm)${colors.reset} - 测试记忆功能`);
    console.log(`${colors.green}  /reset (/r)${colors.reset}       - 重置会话`);
    console.log(`${colors.green}  /exit (/ex)${colors.reset}        - 退出程序`);
    console.log(`${colors.dim}  直接输入消息与AI助手对话${colors.reset}\n`);
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
    
    // 命令简写映射
    const commandMap: { [key: string]: string } = {
      '/h': '/help',
      '/t': '/tools',
      '/s': '/status',
      '/hi': '/history',
      '/c': '/config',
      '/st': '/stream',
      '/m': '/mode',
      '/mem': '/memory',
      '/te': '/temp',
      '/mo': '/model',
      '/cl': '/clear',
      '/e': '/export',
      '/tm': '/test-memory',
      '/dl': '/debug-lg',
      '/r': '/reset',
      '/ex': '/exit'
    };
    
    // 检查简写冲突
    const possibleCommands = Object.keys(commandMap).filter(key => 
      key.startsWith(cmd) && key !== cmd
    );
    
    if (possibleCommands.length > 1) {
      console.log(`${colors.red}❌ 命令简写冲突: ${cmd}${colors.reset}`);
      console.log(`${colors.yellow}可能的命令:${colors.reset}`);
      possibleCommands.forEach(c => {
        console.log(`${colors.cyan}  ${c}${colors.reset} -> ${colors.green}${commandMap[c]}${colors.reset}`);
      });
      console.log(`${colors.dim}请使用更具体的简写${colors.reset}\n`);
      return;
    }
    
    // 解析命令
    const resolvedCmd = commandMap[cmd] || cmd;
    
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
        
      case '/temp':
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
        
      case '/test-memory':
        this.testMemoryFunction();
        break;
        
      case '/debug-lg':
        this.debugLGMemory();
        break;
        
      case '/reset':
        this.resetSession();
        break;
        
      case '/exit':
        console.log(`${colors.yellow}👋 再见！${colors.reset}`);
        this.sessionState.isActive = false;
        this.rl.close();
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
   * 测试记忆功能
   */
  private async testMemoryFunction(): Promise<void> {
    console.log(`\n${colors.bright}${colors.blue}🧠 测试记忆功能...${colors.reset}`);
    console.log(`${colors.cyan}当前记忆模式: ${colors.yellow}${this.sessionState.memoryMode}${colors.reset}`);
    console.log(`${colors.cyan}会话ID: ${colors.yellow}${this.sessionState.threadId || '将在第一次聊天时自动生成'}${colors.reset}\n`);

    if (this.sessionState.memoryMode === 'lg') {
      console.log(`${colors.green}✅ LG模式测试:${colors.reset}`);
      console.log(`${colors.dim}  - 服务端自动管理历史记录${colors.reset}`);
      console.log(`${colors.dim}  - 基于thread_id进行会话隔离${colors.reset}`);
      console.log(`${colors.dim}  - 无需客户端传递历史记录${colors.reset}\n`);
      
      console.log(`${colors.yellow}💡 测试建议:${colors.reset}`);
      console.log(`${colors.dim}  1. 发送一条消息，如"你好，我叫张三"${colors.reset}`);
      console.log(`${colors.dim}  2. 再发送"你还记得我的名字吗？"${colors.reset}`);
      console.log(`${colors.dim}  3. 观察AI是否能记住之前的信息${colors.reset}\n`);
    } else {
      console.log(`${colors.green}✅ API模式测试:${colors.reset}`);
      console.log(`${colors.dim}  - 客户端控制历史记录${colors.reset}`);
      console.log(`${colors.dim}  - 支持跨会话历史管理${colors.reset}`);
      console.log(`${colors.dim}  - 每次请求都包含完整历史${colors.reset}\n`);
      
      console.log(`${colors.yellow}💡 测试建议:${colors.reset}`);
      console.log(`${colors.dim}  1. 发送一条消息，如"你好，我叫李四"${colors.reset}`);
      console.log(`${colors.dim}  2. 再发送"你还记得我的名字吗？"${colors.reset}`);
      console.log(`${colors.dim}  3. 观察AI是否能记住之前的信息${colors.reset}\n`);
    }

    console.log(`${colors.cyan}当前历史记录数量: ${colors.yellow}${this.sessionState.history.length}${colors.reset}`);
    if (this.sessionState.history.length > 0) {
      console.log(`${colors.dim}最近的消息:${colors.reset}`);
      const recentMessages = this.sessionState.history.slice(-3);
      recentMessages.forEach((msg, index) => {
        const role = msg.role === 'user' ? '你' : 'AI';
        const content = msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
        console.log(`${colors.dim}  ${index + 1}. [${role}] ${content}${colors.reset}`);
      });
    }
    console.log();
  }

  /**
   * 调试LG记忆状态
   */
  private async debugLGMemory(): Promise<void> {
    console.log(`\n${colors.bright}${colors.blue}🔍 调试LG记忆状态...${colors.reset}`);
    console.log(`${colors.cyan}会话ID: ${colors.yellow}${this.sessionState.threadId || '未生成'}${colors.reset}\n`);

    if (!this.sessionState.threadId) {
      console.log(`${colors.red}❌ 错误: Thread-ID 未生成${colors.reset}`);
      console.log(`${colors.dim}请先发送一条消息来生成 Thread-ID${colors.reset}\n`);
      return;
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/api/debug/lg-memory/${this.sessionState.threadId}`);
      const result = await response.json();

      if (result.success) {
        const data = result.data;
        
        if (data.error) {
          console.log(`${colors.red}❌ 错误: ${data.error}${colors.reset}`);
          return;
        }

        console.log(`${colors.green}✅ LG记忆状态:${colors.reset}`);
        console.log(`${colors.cyan}  - Thread ID: ${colors.yellow}${data.threadId}${colors.reset}`);
        console.log(`${colors.cyan}  - Checkpointer状态: ${colors.yellow}${data.checkpointerEnabled ? '已启用' : '未启用'}${colors.reset}`);
        
        if (data.currentState) {
          console.log(`${colors.cyan}  - 消息数量: ${colors.yellow}${data.currentState.messageCount}${colors.reset}`);
          console.log(`${colors.cyan}  - 下一步: ${colors.yellow}${data.currentState.next.join(', ') || '无'}${colors.reset}`);
          
          if (data.currentState.messages.length > 0) {
            console.log(`${colors.cyan}  - 消息历史:${colors.reset}`);
            data.currentState.messages.forEach((msg: any, index: number) => {
              const content = msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content;
              console.log(`${colors.dim}    ${index + 1}. [${msg.type}] ${content}${colors.reset}`);
            });
          } else {
            console.log(`${colors.dim}  - 暂无消息历史${colors.reset}`);
          }
        }
      } else {
        console.log(`${colors.red}❌ 调试失败: ${result.error}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ 请求失败: ${error}${colors.reset}`);
    }
    
    console.log();
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
      toolExecMode: 'outside',
      memoryMode: 'lg', // 重置为LG模式
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
    
    // 如果是第一次发送消息，自动生成 thread-id
    if (this.sessionState.messageCount === 1) {
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
