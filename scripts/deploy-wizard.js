#!/usr/bin/env node

/**
 * Nova-Mind Vercel 部署向导
 * 交互式配置和部署工具
 * 使用方法: node scripts/deploy-wizard.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// 打印函数
const print = {
  header: (text) => console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════╗${colors.reset}`),
  title: (text) => console.log(`${colors.cyan}║  ${text.padEnd(36)}  ║${colors.reset}`),
  footer: () => console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════╝${colors.reset}\n`),
  step: (num, text) => console.log(`\n${colors.blue}▶ [${num}] ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.blue}  ℹ️  ${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}  ✅ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}  ⚠️  ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}  ❌ ${text}${colors.reset}`),
};

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 询问函数
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(`${colors.blue}  ${prompt}${colors.reset}`, (answer) => {
      resolve(answer);
    });
  });
};

// 执行命令
const exec = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
};

// 主函数
async function main() {
  try {
    // 显示欢迎信息
    print.header();
    print.title('Nova-Mind Vercel 部署向导');
    print.title('5 分钟内拥有免费的 Nova-Mind！');
    print.footer();

    // 步骤 1: 检查前置条件
    print.step(1, '检查前置条件...');
    
    const hasNode = require('child_process').spawnSync('node', ['--version']).status === 0;
    const hasNpm = require('child_process').spawnSync('npm', ['--version']).status === 0;
    const hasGit = require('child_process').spawnSync('git', ['--version']).status === 0;

    if (!hasNode || !hasNpm || !hasGit) {
      print.error('缺少必要的工具');
      if (!hasNode) print.error('  - 需要安装 Node.js: https://nodejs.org');
      if (!hasNpm) print.error('  - 需要安装 npm');
      if (!hasGit) print.error('  - 需要安装 git: https://git-scm.com');
      process.exit(1);
    }

    print.success('所有前置条件已满足');

    // 步骤 2: 配置 DeepSeek API
    print.step(2, '配置 DeepSeek API...');
    
    print.info('DeepSeek 是一个免费的 AI 模型，有免费额度');
    print.info('获取 API 密钥: https://platform.deepseek.com');
    
    const deepseekKey = await question('请输入你的 DeepSeek API 密钥 (sk-...): ');
    
    if (!deepseekKey || !deepseekKey.startsWith('sk-')) {
      print.error('API 密钥无效');
      process.exit(1);
    }

    print.success('DeepSeek API 密钥已配置');

    // 步骤 3: 选择模型策略
    print.step(3, '选择模型策略...');
    
    console.log('');
    console.log(`${colors.blue}  1) cost      - 优先使用便宜的模型（推荐日常对话）${colors.reset}`);
    console.log(`${colors.blue}  2) quality   - 优先使用高质量的模型${colors.reset}`);
    console.log(`${colors.blue}  3) balanced  - 轮流使用不同模型${colors.reset}`);
    console.log('');

    const strategyChoice = await question('请选择 (1-3, 默认 1): ');
    
    let modelStrategy = 'cost';
    if (strategyChoice === '2') modelStrategy = 'quality';
    else if (strategyChoice === '3') modelStrategy = 'balanced';

    print.success(`模型策略已设置为: ${modelStrategy}`);

    // 步骤 4: 创建环境变量文件
    print.step(4, '创建环境变量文件...');
    
    const envContent = `# Nova-Mind 免费版本 Vercel 部署配置
NODE_ENV=production
IS_FREE_VERSION=true

# DeepSeek 配置
DEEPSEEK_API_KEY=${deepseekKey}
DEEPSEEK_API_URL=https://api.deepseek.com/v1
MODEL_STRATEGY=${modelStrategy}

# 成本控制
MONTHLY_COST_BUDGET=100
FREE_VERSION_DAILY_LIMIT=50
FREE_VERSION_MONTHLY_LIMIT=1000

# 功能开关
ENABLE_TASK_LABELS=true
MARK_FREE_MODEL_TASKS=true
ENABLE_MONTHLY_INTEGRATION=true
ENABLE_COST_TRACKING=true
ENABLE_GUARDRAILS=true
ENABLE_AUTO_OPTIMIZATION=true

# 应用配置
VITE_APP_TITLE=Nova-Mind（免费版本）
VITE_APP_LOGO=/logo-free.svg
`;

    fs.writeFileSync('.env.local', envContent);
    print.success('.env.local 已创建');

    // 步骤 5: 安装依赖
    print.step(5, '安装依赖...');
    
    print.info('这可能需要几分钟，请耐心等待...');
    await exec('npm', ['install']);
    print.success('依赖安装完成');

    // 步骤 6: 构建项目
    print.step(6, '构建项目...');
    
    await exec('npm', ['run', 'build']);
    print.success('项目构建完成');

    // 步骤 7: 安装 Vercel CLI
    print.step(7, '安装 Vercel CLI...');
    
    try {
      await exec('npm', ['install', '-g', 'vercel']);
      print.success('Vercel CLI 已安装');
    } catch (err) {
      print.warning('Vercel CLI 安装失败，请手动安装: npm install -g vercel');
    }

    // 步骤 8: 登录 Vercel
    print.step(8, '登录 Vercel...');
    
    print.info('请在浏览器中完成登录');
    await exec('vercel', ['login']);
    print.success('Vercel 登录成功');

    // 步骤 9: 部署到 Vercel
    print.step(9, '部署到 Vercel...');
    
    const deployArgs = [
      'deploy',
      '--prod',
      '--env', `DEEPSEEK_API_KEY=${deepseekKey}`,
      '--env', 'DEEPSEEK_API_URL=https://api.deepseek.com/v1',
      '--env', `MODEL_STRATEGY=${modelStrategy}`,
      '--env', 'IS_FREE_VERSION=true',
      '--env', 'MONTHLY_COST_BUDGET=100',
      '--env', 'ENABLE_COST_TRACKING=true',
      '--env', 'ENABLE_GUARDRAILS=true',
      '--env', 'ENABLE_AUTO_OPTIMIZATION=true',
    ];

    await exec('vercel', deployArgs);
    print.success('部署完成');

    // 显示成功信息
    console.log('');
    console.log(`${colors.green}${colors.bright}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║  🎉 Nova-Mind 部署成功！              ║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}╚════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    console.log(`${colors.green}📱 你的 Nova-Mind 免费版本已部署到 Vercel！${colors.reset}`);
    console.log('');
    console.log(`${colors.bright}🔧 配置信息:${colors.reset}`);
    console.log(`  - 模型: DeepSeek`);
    console.log(`  - 策略: ${modelStrategy}`);
    console.log(`  - 版本: 免费版本`);
    console.log(`  - 成本: ¥0`);
    console.log('');
    console.log(`${colors.bright}💡 下一步:${colors.reset}`);
    console.log(`  1. 访问你的 Vercel 应用 URL`);
    console.log(`  2. 开始和 Nova-Mind 对话`);
    console.log(`  3. 配置 GitHub Actions 月度整合（可选）`);
    console.log('');
    console.log(`${colors.bright}📚 更多资源:${colors.reset}`);
    console.log(`  - 部署指南: ./VERCEL_DEPLOYMENT.md`);
    console.log(`  - 快速启动: ./QUICK_START_GUIDE.md`);
    console.log(`  - 混合部署: ./HYBRID_DEPLOYMENT_GUIDE.md`);
    console.log('');

    rl.close();
  } catch (error) {
    print.error(error.message);
    rl.close();
    process.exit(1);
  }
}

// 运行主函数
main();
