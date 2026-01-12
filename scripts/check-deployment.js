#!/usr/bin/env node

/**
 * Nova-Mind 部署检查脚本
 * 验证部署是否成功并提供诊断信息
 * 使用方法: node scripts/check-deployment.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  header: () => {
    console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  Nova-Mind 部署检查                    ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════╝${colors.reset}\n`);
  },
  section: (title) => console.log(`\n${colors.blue}${colors.bright}${title}${colors.reset}`),
  check: (name, status, message = '') => {
    const icon = status ? '✅' : '❌';
    const color = status ? colors.green : colors.red;
    console.log(`${color}${icon} ${name}${colors.reset}${message ? ` - ${message}` : ''}`);
  },
  info: (text) => console.log(`${colors.blue}  ℹ️  ${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}  ✅ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}  ⚠️  ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}  ❌ ${text}${colors.reset}`),
};

// 检查函数
function checkEnvironment() {
  print.section('🔧 环境检查');
  
  let allGood = true;

  // 检查 Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    print.check('Node.js', true, nodeVersion);
  } catch (err) {
    print.check('Node.js', false, '未安装');
    allGood = false;
  }

  // 检查 npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    print.check('npm', true, `v${npmVersion}`);
  } catch (err) {
    print.check('npm', false, '未安装');
    allGood = false;
  }

  // 检查 git
  try {
    execSync('git --version', { encoding: 'utf-8' });
    print.check('git', true);
  } catch (err) {
    print.check('git', false, '未安装');
    allGood = false;
  }

  // 检查 Vercel CLI
  try {
    execSync('vercel --version', { encoding: 'utf-8' });
    print.check('Vercel CLI', true);
  } catch (err) {
    print.check('Vercel CLI', false, '未安装');
  }

  return allGood;
}

function checkFiles() {
  print.section('📁 文件检查');
  
  let allGood = true;

  const requiredFiles = [
    'package.json',
    'vercel.json',
    '.env.vercel.example',
    'VERCEL_DEPLOYMENT.md',
  ];

  requiredFiles.forEach((file) => {
    const exists = fs.existsSync(file);
    print.check(file, exists);
    if (!exists) allGood = false;
  });

  // 检查 .env.local
  const hasEnvLocal = fs.existsSync('.env.local');
  print.check('.env.local', hasEnvLocal, hasEnvLocal ? '已配置' : '未配置');

  return allGood;
}

function checkConfiguration() {
  print.section('⚙️  配置检查');
  
  let allGood = true;

  if (!fs.existsSync('.env.local')) {
    print.warning('.env.local 未找到，跳过配置检查');
    return false;
  }

  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const env = {};
  envContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  const requiredVars = [
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_API_URL',
    'MODEL_STRATEGY',
    'IS_FREE_VERSION',
  ];

  requiredVars.forEach((varName) => {
    const hasVar = env[varName];
    const value = hasVar ? (varName === 'DEEPSEEK_API_KEY' ? '***' : env[varName]) : '';
    print.check(varName, !!hasVar, value);
    if (!hasVar) allGood = false;
  });

  return allGood;
}

function checkBuild() {
  print.section('🏗️  构建检查');
  
  if (!fs.existsSync('node_modules')) {
    print.warning('node_modules 未找到，请先运行 npm install');
    return false;
  }

  print.check('node_modules', true);

  if (!fs.existsSync('dist')) {
    print.warning('dist 目录未找到，请先运行 npm run build');
    return false;
  }

  print.check('dist 目录', true);

  // 检查构建输出
  const distFiles = fs.readdirSync('dist');
  print.info(`构建输出包含 ${distFiles.length} 个文件`);

  return true;
}

function checkDeployment() {
  print.section('🚀 部署检查');
  
  try {
    const status = execSync('vercel status', { encoding: 'utf-8' });
    print.check('Vercel 连接', true);
    print.info('最近部署信息:');
    console.log(status);
    return true;
  } catch (err) {
    print.check('Vercel 连接', false, '请先运行 vercel login');
    return false;
  }
}

function showRecommendations(envOk, filesOk, configOk, buildOk, deployOk) {
  print.section('💡 建议');

  const recommendations = [];

  if (!envOk) {
    recommendations.push('• 安装缺少的工具（Node.js, npm, git）');
  }

  if (!filesOk) {
    recommendations.push('• 检查必要的文件是否存在');
  }

  if (!configOk) {
    recommendations.push('• 运行 node scripts/deploy-wizard.js 配置环境变量');
  }

  if (!buildOk) {
    recommendations.push('• 运行 npm install 安装依赖');
    recommendations.push('• 运行 npm run build 构建项目');
  }

  if (!deployOk) {
    recommendations.push('• 运行 vercel login 登录 Vercel');
    recommendations.push('• 运行 vercel deploy --prod 部署到生产环境');
  }

  if (recommendations.length === 0) {
    print.success('所有检查都已通过！');
    print.info('你可以运行以下命令开始部署:');
    console.log(`  ${colors.cyan}node scripts/deploy-wizard.js${colors.reset}`);
    console.log(`  或`);
    console.log(`  ${colors.cyan}bash scripts/deploy-now.sh${colors.reset}`);
  } else {
    recommendations.forEach((rec) => console.log(rec));
  }
}

// 主函数
function main() {
  print.header();

  const envOk = checkEnvironment();
  const filesOk = checkFiles();
  const configOk = checkConfiguration();
  const buildOk = checkBuild();
  const deployOk = checkDeployment();

  showRecommendations(envOk, filesOk, configOk, buildOk, deployOk);

  console.log('');
}

// 运行主函数
main();
