#!/usr/bin/env node
// run-chat-tests.mts - 运行 Chat API 测试

import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

console.log('🚀 开始运行 Chat API 测试...\n');

async function runChatTests() {
  const tests = [
    {
      name: '快速测试',
      file: 'test-quick-chat.mts',
      description: '快速测试西城咖啡工具 Chat API 基本功能'
    },
    {
      name: '完整测试',
      file: 'test-westore-cafe-api-chat.mts',
      description: '完整测试西城咖啡工具 Chat API 所有场景'
    }
  ];

  for (const test of tests) {
    console.log(`\n=== 运行 ${test.name} ===`);
    console.log(`📝 ${test.description}`);
    console.log('');

    try {
      await runTest(test.file);
      console.log(`✅ ${test.name} 完成`);
    } catch (error) {
      console.error(`❌ ${test.name} 失败:`, error);
    }
  }

  console.log('\n🎉 所有 Chat API 测试运行完成！');
  console.log('\n💡 使用说明:');
  console.log('  1. 确保服务器正在运行: npm run dev');
  console.log('  2. 运行快速测试: npx tsx tests/test-quick-chat.mts');
  console.log('  3. 运行完整测试: npx tsx tests/test-westore-cafe-api-chat.mts');
}

function runTest(testFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const testPath = resolve(process.cwd(), 'tests', testFile);
    const child: ChildProcess = spawn('npx', ['tsx', testPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`测试退出码: ${code}`));
      }
    });

    child.on('error', (error: Error) => {
      reject(error);
    });
  });
}

// 运行测试
runChatTests().catch(console.error);
