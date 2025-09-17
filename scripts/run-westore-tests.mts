#!/usr/bin/env node
// run-westore-tests.mts - 运行西城咖啡工具测试

import { spawn } from 'child_process';
import { resolve } from 'path';

console.log('🚀 开始运行西城咖啡工具测试...\n');

async function runTests() {
  const tests = [
    {
      name: '基础功能测试',
      file: 'test-westore-cafe-tools.mts',
      description: '测试所有西城咖啡工具的基本功能'
    },
    {
      name: 'API 接口测试',
      file: 'test-westore-cafe-api.mts',
      description: '测试完整的用户购物流程和 API 接口'
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

  console.log('\n🎉 所有测试运行完成！');
}

function runTest(testFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const testPath = resolve(process.cwd(), 'tests', testFile);
    const child = spawn('npx', ['tsx', testPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`测试退出码: ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// 运行测试
runTests().catch(console.error);
