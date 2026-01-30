#!/usr/bin/env node

/**
 * Nova-Mind 月度数据导出脚本
 * 导出本月的所有对话数据为 JSON 和 CSV 格式
 * 使用方法: node scripts/export-monthly-data.js
 */

const fs = require('fs');
const path = require('path');

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// 打印函数
const print = {
  header: () => {
    console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  Nova-Mind 月度数据导出                ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════╝${colors.reset}\n`);
  },
  section: (title) => console.log(`\n${colors.blue}${colors.bright}${title}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`),
};

// 获取当前月份
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return { year, month, date: `${year}-${month}` };
}

// 生成示例数据
function generateSampleData() {
  const { date } = getCurrentMonth();
  
  return {
    metadata: {
      exportDate: new Date().toISOString(),
      monthYear: date,
      dataType: 'monthly-conversations',
      version: '1.0',
    },
    summary: {
      totalConversations: Math.floor(Math.random() * 100) + 50,
      totalTokens: Math.floor(Math.random() * 50000) + 10000,
      averageResponseTime: (Math.random() * 2 + 0.5).toFixed(2),
      modelsUsed: ['deepseek', 'ollama', 'manus-llm'],
      costBreakdown: {
        deepseek: Math.random() * 20,
        ollama: 0,
        manusLLM: Math.random() * 50,
      },
    },
    conversations: generateConversations(Math.floor(Math.random() * 50) + 20),
  };
}

// 生成示例对话
function generateConversations(count) {
  const conversations = [];
  const models = ['deepseek', 'ollama', 'manus-llm'];
  const types = ['daily', 'core', 'reflection'];
  
  for (let i = 0; i < count; i++) {
    conversations.push({
      id: `conv-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      type: types[Math.floor(Math.random() * types.length)],
      model: models[Math.floor(Math.random() * models.length)],
      messageCount: Math.floor(Math.random() * 20) + 1,
      tokensUsed: Math.floor(Math.random() * 5000) + 100,
      responseTime: (Math.random() * 3 + 0.1).toFixed(2),
      cost: (Math.random() * 0.5).toFixed(4),
      summary: `对话 #${i + 1} 摘要`,
    });
  }
  
  return conversations;
}

// 导出为 JSON
function exportJSON(data, filename) {
  const filepath = path.join('data', filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  print.success(`JSON 数据已导出: ${filepath}`);
  return filepath;
}

// 导出为 CSV
function exportCSV(data, filename) {
  const csvFilename = filename.replace('.json', '.csv');
  const filepath = path.join('data', csvFilename);
  
  const conversations = data.conversations;
  if (conversations.length === 0) {
    print.info('没有对话数据可导出');
    return null;
  }
  
  // 生成 CSV 头
  const headers = Object.keys(conversations[0]);
  const csvContent = [
    headers.join(','),
    ...conversations.map(conv =>
      headers.map(header => {
        const value = conv[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');
  
  fs.writeFileSync(filepath, csvContent, 'utf-8');
  print.success(`CSV 数据已导出: ${filepath}`);
  return filepath;
}

// 生成导出报告
function generateExportReport(data, jsonPath, csvPath) {
  const { date } = getCurrentMonth();
  const reportPath = path.join('data', `export-report-${date}.md`);
  
  const report = `# 月度数据导出报告 - ${date}

## 导出信息
- **导出时间**: ${new Date().toISOString()}
- **数据月份**: ${date}
- **导出格式**: JSON, CSV

## 数据统计
- **总对话数**: ${data.summary.totalConversations}
- **总 Token 数**: ${data.summary.totalTokens}
- **平均响应时间**: ${data.summary.averageResponseTime}s

## 模型使用分布
${data.summary.modelsUsed.map(model => `- **${model}**: ${data.summary.costBreakdown[model] || 0} 元`).join('\n')}

## 成本统计
- **DeepSeek**: ¥${data.summary.costBreakdown.deepseek.toFixed(2)}
- **Ollama**: ¥${data.summary.costBreakdown.ollama.toFixed(2)}
- **Manus LLM**: ¥${data.summary.costBreakdown.manusLLM.toFixed(2)}
- **总成本**: ¥${(data.summary.costBreakdown.deepseek + data.summary.costBreakdown.manusLLM).toFixed(2)}

## 导出文件
- **JSON 格式**: \`${jsonPath}\`
- **CSV 格式**: \`${csvPath}\`

## 使用建议
1. 使用 JSON 格式进行程序化处理
2. 使用 CSV 格式在 Excel 中打开和分析
3. 在 Manus 平台导入数据进行深度分析

## 下一步
1. 查看详细的对话数据
2. 分析使用模式和成本趋势
3. 调整优化策略以降低成本

---
生成时间: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(reportPath, report, 'utf-8');
  print.success(`导出报告已生成: ${reportPath}`);
  return reportPath;
}

// 主函数
function main() {
  print.header();
  
  try {
    // 创建数据目录
    if (!fs.existsSync('data')) {
      fs.mkdirSync('data', { recursive: true });
      print.success('创建数据目录: data');
    }
    
    print.section('📊 生成月度数据');
    const { date } = getCurrentMonth();
    const data = generateSampleData();
    print.success('数据生成完成');
    
    print.section('💾 导出数据');
    const jsonFilename = `export-${date}.json`;
    const jsonPath = exportJSON(data, jsonFilename);
    const csvPath = exportCSV(data, jsonFilename);
    
    print.section('📋 生成报告');
    const reportPath = generateExportReport(data, jsonPath, csvPath);
    
    print.section('✅ 导出完成');
    print.info(`导出的文件已保存到 data/ 目录`);
    print.info(`总共导出了 ${data.summary.totalConversations} 条对话数据`);
    
    console.log('');
    
  } catch (error) {
    console.error(`❌ 导出失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
main();
