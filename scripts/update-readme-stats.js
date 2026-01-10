#!/usr/bin/env node

/**
 * 更新 README 统计信息脚本
 * 用于 GitHub Actions 自动更新 README 中的统计数据
 */

const fs = require('fs');
const path = require('path');

console.log('📝 更新 README 统计信息...');

const readmePath = path.join(__dirname, '..', 'README.md');

if (!fs.existsSync(readmePath)) {
  console.log('⚠️  README.md 不存在，跳过更新');
  process.exit(0);
}

let readmeContent = fs.readFileSync(readmePath, 'utf8');

// 生成统计信息
const stats = generateStats();

// 更新或添加统计部分
const statsSection = generateStatsSection(stats);

// 检查是否已有统计部分
if (readmeContent.includes('## 📊 使用统计')) {
  // 替换现有的统计部分
  readmeContent = readmeContent.replace(
    /## 📊 使用统计[\s\S]*?(?=## |$)/,
    statsSection + '\n'
  );
} else {
  // 在 README 末尾添加统计部分
  readmeContent += '\n' + statsSection;
}

// 保存更新后的 README
fs.writeFileSync(readmePath, readmeContent, 'utf8');

console.log('✅ README 已更新');

/**
 * 生成统计信息
 */
function generateStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // 从报告文件读取统计数据
  const reportsDir = path.join(__dirname, '..', 'reports');
  let totalConversations = 0;
  let totalCost = 0;
  let totalSavings = 0;
  
  if (fs.existsSync(reportsDir)) {
    const files = fs.readdirSync(reportsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(reportsDir, file), 'utf8');
        
        // 从报告中提取数据（这是一个简化的示例）
        const conversationsMatch = content.match(/总对话数[：:]\s*(\d+)/);
        const costMatch = content.match(/总成本[：:]\s*¥([\d.]+)/);
        const savingsMatch = content.match(/节省成本[：:]\s*¥([\d.]+)/);
        
        if (conversationsMatch) totalConversations += parseInt(conversationsMatch[1]);
        if (costMatch) totalCost += parseFloat(costMatch[1]);
        if (savingsMatch) totalSavings += parseFloat(savingsMatch[1]);
      }
    }
  }
  
  return {
    year,
    month,
    totalConversations,
    totalCost,
    totalSavings,
    lastUpdated: now.toLocaleString('zh-CN')
  };
}

/**
 * 生成统计部分内容
 */
function generateStatsSection(stats) {
  let section = '## 📊 使用统计\n\n';
  
  section += `**最后更新**: ${stats.lastUpdated}\n\n`;
  
  section += '| 指标 | 数值 |\n';
  section += '|------|------|\n';
  section += `| 总对话数 | ${stats.totalConversations} |\n`;
  section += `| 总成本 | ¥${stats.totalCost.toFixed(2)} |\n`;
  section += `| 节省成本 | ¥${stats.totalSavings.toFixed(2)} |\n`;
  section += `| 成本节省率 | ${stats.totalCost > 0 ? ((stats.totalSavings / (stats.totalCost + stats.totalSavings)) * 100).toFixed(1) : 0}% |\n\n`;
  
  section += '### 月度对比\n\n';
  section += '| 月份 | 对话数 | 成本 | 节省 |\n';
  section += '|------|--------|------|------|\n';
  
  // 列出最近 12 个月的统计
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (fs.existsSync(reportsDir)) {
    const files = fs.readdirSync(reportsDir).sort().reverse().slice(0, 12);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const monthStr = file.replace('monthly-', '').replace('.md', '');
        const content = fs.readFileSync(path.join(reportsDir, file), 'utf8');
        
        const conversationsMatch = content.match(/总对话数[：:]\s*(\d+)/);
        const costMatch = content.match(/总成本[：:]\s*¥([\d.]+)/);
        const savingsMatch = content.match(/节省成本[：:]\s*¥([\d.]+)/);
        
        const conversations = conversationsMatch ? conversationsMatch[1] : '0';
        const cost = costMatch ? costMatch[1] : '0.00';
        const savings = savingsMatch ? savingsMatch[1] : '0.00';
        
        section += `| ${monthStr} | ${conversations} | ¥${cost} | ¥${savings} |\n`;
      }
    }
  }
  
  section += '\n### 成本节省方案\n\n';
  section += '- ✅ 日常对话使用免费模型（Ollama/DeepSeek）\n';
  section += '- ✅ 核心任务使用高级模型（Manus LLM）\n';
  section += '- ✅ 月度整合使用免费额度\n';
  section += '- ✅ 成本节省 50-80%\n\n';
  
  section += '### 快速开始\n\n';
  section += '- 📖 [5 分钟快速启动指南](./QUICK_START_GUIDE.md)\n';
  section += '- 🚀 [完整部署指南](./HYBRID_DEPLOYMENT_GUIDE.md)\n';
  section += '- ⚙️ [GitHub Actions 配置](./GITHUB_ACTIONS_SETUP.md)\n';
  
  return section;
}
