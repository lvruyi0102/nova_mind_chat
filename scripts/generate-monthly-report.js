#!/usr/bin/env node

/**
 * 月度报告生成脚本
 * 用于 GitHub Actions 自动生成月度整合报告
 */

const fs = require('fs');
const path = require('path');

// 获取当前日期
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const monthName = getMonthName(now.getMonth() + 1);

console.log(`📊 生成 ${year} 年 ${monthName} 月度报告...`);

// 确保 reports 目录存在
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// 生成报告内容
const reportContent = generateReport(year, month, monthName);

// 保存报告
const reportPath = path.join(reportsDir, `monthly-${year}-${month}.md`);
fs.writeFileSync(reportPath, reportContent, 'utf8');

console.log(`✅ 报告已生成: ${reportPath}`);

// 设置环境变量供 GitHub Actions 使用
setGitHubEnv({
  REPORT_MONTH: `${year}-${month}`,
  TOTAL_CONVERSATIONS: 0, // 从数据库获取
  CORE_TASKS: 0,
  DAILY_TASKS: 0,
  TOTAL_COST: '0.00',
  SAVED_COST: '0.00'
});

/**
 * 生成报告内容
 */
function generateReport(year, month, monthName) {
  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  let report = `# ${year} 年 ${monthName} 月度整合报告\n\n`;
  
  report += `**生成时间**: ${today.toLocaleString('zh-CN')}\n\n`;
  
  report += '## 📊 本月数据统计\n\n';
  
  report += '| 指标 | 数值 |\n';
  report += '|------|------|\n';
  report += '| 总对话数 | 0 |\n';
  report += '| 核心任务 | 0 |\n';
  report += '| 日常对话 | 0 |\n';
  report += '| 总成本 | ¥0.00 |\n';
  report += '| 节省成本 | ¥0.00 |\n';
  report += '| 平均每天 | 0 次 |\n\n';
  
  report += '## 💡 核心洞察\n\n';
  report += '- 本月保持了稳定的对话频率\n';
  report += '- 核心任务和日常对话的平衡良好\n';
  report += '- 成本控制效果显著\n\n';
  
  report += '## 📈 任务分布\n\n';
  report += '| 任务类型 | 数量 | 百分比 |\n';
  report += '|---------|------|--------|\n';
  report += '| 核心任务 | 0 | 0% |\n';
  report += '| 日常对话 | 0 | 0% |\n\n';
  
  report += '## 💰 成本分析\n\n';
  report += '| 模型 | 调用次数 | 单价 | 总成本 |\n';
  report += '|------|---------|------|--------|\n';
  report += '| Manus LLM | 0 | ¥0.03 | ¥0.00 |\n';
  report += '| DeepSeek | 0 | ¥0.003 | ¥0.00 |\n';
  report += '| Ollama | 0 | ¥0 | ¥0.00 |\n';
  report += '| **总计** | **0** | - | **¥0.00** |\n\n';
  
  report += '## 🎯 建议\n\n';
  report += '1. **增加核心任务频率** - 建议每周至少进行一次深度反思\n';
  report += '2. **优化日常对话** - 利用免费模型处理信息整理任务\n';
  report += '3. **月度整合** - 在 Manus 平台进行深度分析和总结\n\n';
  
  report += '## 🔗 相关链接\n\n';
  report += '- [Manus 平台](https://nova-mind-chat.manus.space)\n';
  report += '- [免费版本](https://nova-mind-free.vercel.app)\n';
  report += '- [部署指南](./HYBRID_DEPLOYMENT_GUIDE.md)\n\n';
  
  report += '---\n\n';
  report += '**下一步**: 登录 Manus 平台，导入本月的日常对话，使用月度免费额度进行深度分析。\n';
  
  return report;
}

/**
 * 获取月份名称
 */
function getMonthName(month) {
  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  return months[month - 1] || '未知月份';
}

/**
 * 设置 GitHub Actions 环境变量
 */
function setGitHubEnv(env) {
  const githubEnvPath = process.env.GITHUB_ENV;
  
  if (githubEnvPath) {
    let envContent = '';
    for (const [key, value] of Object.entries(env)) {
      envContent += `${key}=${value}\n`;
    }
    
    fs.appendFileSync(githubEnvPath, envContent, 'utf8');
    console.log('✅ 环境变量已设置');
  }
}
