// run-tests.mts - 测试运行脚本

import { execSync } from 'child_process';
import { resolve } from 'path';

console.log('🚀 开始运行所有测试...\n');

const tests = [
  {
    name: 'ToolHub 基础功能测试',
    file: 'test-tool-hub.mts',
    description: '测试 ToolHub 的核心功能，包括工具注册、搜索、执行等'
  },
  {
    name: 'ToolHub 简化功能测试',
    file: 'test-simple-tool-hub.mts',
    description: '测试 ToolHub 的完整功能，包括所有预设工具'
  },
  {
    name: 'Agent 集成测试',
    file: 'test-agent-integration.mts',
    description: '测试 ToolHub 与 Agent 的集成功能'
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n=== ${test.name} ===`);
    console.log(`📝 ${test.description}`);
    console.log(`📁 文件: ${test.file}`);
    console.log('');

    try {
      const testPath = resolve(process.cwd(), test.file);
      execSync(`npx tsx ${testPath}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(`✅ ${test.name} - 通过`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} - 失败`);
      console.log(`错误: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`✅ 通过: ${passed} 个`);
  console.log(`❌ 失败: ${failed} 个`);
  console.log(`📈 总计: ${passed + failed} 个`);
  console.log(`🎯 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试都通过了！');
  } else {
    console.log('\n⚠️ 有测试失败，请检查错误信息。');
  }
}

// 运行测试
runTests().catch(console.error);
