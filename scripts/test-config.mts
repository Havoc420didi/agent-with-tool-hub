// 测试配置加载
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), './config.env') });

import { modelConfigManager } from '../src/config/model-config.js';

console.log('🔍 测试模型配置加载...\n');

// 获取配置摘要
const summary = modelConfigManager.getConfigSummary();

console.log('📊 配置摘要:');
console.log(`  总模型数: ${summary.totalModels}`);
console.log(`  提供商: ${summary.providers.join(', ')}`);
console.log(`  当前模型: ${summary.currentModel?.name || '无'}`);
console.log(`  验证状态: ${summary.validation.valid ? '✅ 通过' : '❌ 失败'}`);
console.log(`  错误数: ${summary.validation.errorCount}`);
console.log(`  警告数: ${summary.validation.warningCount}\n`);

// 显示所有模型
const models = modelConfigManager.getAllModels();
console.log('🤖 可用模型:');
models.forEach((model, index) => {
  console.log(`  ${index + 1}. ${model.name} (${model.provider})`);
  console.log(`     API: ${model.baseURL}`);
  console.log(`     温度: ${model.temperature}`);
  console.log(`     最大令牌: ${model.maxTokens || '未设置'}`);
  console.log();
});

// 验证配置
const validation = modelConfigManager.validateAllModels();
if (!validation.valid) {
  console.log('❌ 配置错误:');
  Object.entries(validation.errors).forEach(([modelKey, errors]) => {
    console.log(`  ${modelKey}:`);
    errors.forEach(error => {
      console.log(`    - ${error}`);
    });
  });
}

if (Object.keys(validation.warnings).length > 0) {
  console.log('\n⚠️  配置警告:');
  Object.entries(validation.warnings).forEach(([modelKey, warnings]) => {
    console.log(`  ${modelKey}:`);
    warnings.forEach(warning => {
      console.log(`    - ${warning}`);
    });
  });
}

console.log('\n✅ 配置测试完成');
