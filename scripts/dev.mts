#!/usr/bin/env tsx

/**
 * 开发环境启动脚本
 * 支持热重载和更好的开发体验
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { config } from 'dotenv';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

const logLevel = process.env.VERBOSE_LOGS === 'true' ? '详细' : 
                 process.env.QUIET_LOGS === 'true' ? '简洁' : '标准';

console.log('🚀 启动 LangGraph Agent 开发服务器...');
console.log('📁 工作目录:', process.cwd());
console.log('🔧 环境:', process.env.NODE_ENV || 'development');
console.log('🌐 端口:', process.env.PORT || 3000);
console.log('📊 日志级别:', logLevel);
console.log('🔄 热重载: 已启用');
console.log('📝 提示: 修改 src/ 目录下的文件将自动重启服务器');
console.log('🛑 停止: 按 Ctrl+C 停止服务器');
console.log('🔄 手动重启: 输入 rs 然后按回车');
console.log('');

// 启动 nodemon
const nodemon = spawn('npx', ['nodemon'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    DEBUG: 'true'
  }
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在停止开发服务器...');
  nodemon.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在停止开发服务器...');
  nodemon.kill('SIGTERM');
  process.exit(0);
});

nodemon.on('close', (code) => {
  console.log(`\n📊 开发服务器已退出，退出码: ${code}`);
  process.exit(code || 0);
});

nodemon.on('error', (err) => {
  console.error('❌ 启动开发服务器时出错:', err);
  process.exit(1);
});
