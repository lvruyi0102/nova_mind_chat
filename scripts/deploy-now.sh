#!/bin/bash

# Nova-Mind 一键 Vercel 部署脚本 (改进版)
# 使用方法: bash scripts/deploy-now.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  Nova-Mind 一键 Vercel 部署脚本       ║${NC}"
    echo -e "${CYAN}║  5 分钟内拥有免费的 Nova-Mind！       ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_info() {
    echo -e "${BLUE}  ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

# 检查前置条件
check_prerequisites() {
    print_step "检查前置条件..."
    
    local missing_tools=()
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js")
    else
        print_success "Node.js $(node --version)"
    fi
    
    if ! command -v npm &> /dev/null && ! command -v pnpm &> /dev/null; then
        missing_tools+=("npm 或 pnpm")
    else
        if command -v pnpm &> /dev/null; then
            print_success "pnpm $(pnpm --version)"
        else
            print_success "npm $(npm --version)"
        fi
    fi
    
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    else
        print_success "git $(git --version | head -n1)"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo ""
        print_error "缺少以下工具: ${missing_tools[*]}"
        echo ""
        echo "请先安装这些工具:"
        echo "  - Node.js: https://nodejs.org"
        echo "  - git: https://git-scm.com"
        exit 1
    fi
    
    echo ""
}

# 配置 DeepSeek API
configure_deepseek() {
    print_step "配置 DeepSeek API..."
    
    echo ""
    print_info "DeepSeek 是一个免费的 AI 模型，有免费额度"
    print_info "获取 API 密钥: https://platform.deepseek.com"
    echo ""
    
    read -p "  请输入你的 DeepSeek API 密钥 (sk-...): " DEEPSEEK_API_KEY
    
    if [ -z "$DEEPSEEK_API_KEY" ]; then
        print_error "API 密钥不能为空"
        exit 1
    fi
    
    if [[ ! $DEEPSEEK_API_KEY =~ ^sk- ]]; then
        print_warning "API 密钥格式可能不正确（应该以 sk- 开头）"
        read -p "  是否继续? (y/n): " continue_anyway
        if [ "$continue_anyway" != "y" ]; then
            exit 1
        fi
    fi
    
    print_success "DeepSeek API 密钥已配置"
    echo ""
}

# 选择模型策略
configure_model_strategy() {
    print_step "选择模型策略..."
    
    echo ""
    echo "  1) cost      - 优先使用便宜的模型（推荐日常对话）"
    echo "  2) quality   - 优先使用高质量的模型"
    echo "  3) balanced  - 轮流使用不同模型"
    echo ""
    
    read -p "  请选择 (1-3, 默认 1): " MODEL_STRATEGY_CHOICE
    
    case $MODEL_STRATEGY_CHOICE in
        2) MODEL_STRATEGY="quality" ;;
        3) MODEL_STRATEGY="balanced" ;;
        *) MODEL_STRATEGY="cost" ;;
    esac
    
    print_success "模型策略已设置为: $MODEL_STRATEGY"
    echo ""
}

# 创建环境变量文件
create_env_file() {
    print_step "创建环境变量文件..."
    
    cat > .env.local << EOF
# Nova-Mind 免费版本 Vercel 部署配置
NODE_ENV=production
IS_FREE_VERSION=true

# DeepSeek 配置
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
DEEPSEEK_API_URL=https://api.deepseek.com/v1
MODEL_STRATEGY=$MODEL_STRATEGY

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
EOF
    
    print_success ".env.local 已创建"
    echo ""
}

# 安装 Vercel CLI
install_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_step "安装 Vercel CLI..."
        
        if command -v pnpm &> /dev/null; then
            pnpm add -g vercel
        else
            npm install -g vercel
        fi
        
        print_success "Vercel CLI 已安装"
        echo ""
    else
        print_success "Vercel CLI 已安装"
        echo ""
    fi
}

# 构建项目
build_project() {
    print_step "构建项目..."
    
    if command -v pnpm &> /dev/null; then
        pnpm install
        pnpm run build
    else
        npm install
        npm run build
    fi
    
    print_success "项目构建完成"
    echo ""
}

# 登录 Vercel
login_vercel() {
    print_step "登录 Vercel..."
    
    print_info "请在浏览器中完成登录"
    echo ""
    
    vercel login
    
    print_success "Vercel 登录成功"
    echo ""
}

# 部署到 Vercel
deploy_vercel() {
    print_step "部署到 Vercel..."
    
    vercel deploy \
        --prod \
        --env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
        --env DEEPSEEK_API_URL="https://api.deepseek.com/v1" \
        --env MODEL_STRATEGY="$MODEL_STRATEGY" \
        --env IS_FREE_VERSION=true \
        --env MONTHLY_COST_BUDGET=100 \
        --env ENABLE_COST_TRACKING=true \
        --env ENABLE_GUARDRAILS=true \
        --env ENABLE_AUTO_OPTIMIZATION=true
    
    print_success "部署完成"
    echo ""
}

# 显示部署成功信息
show_success() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 Nova-Mind 部署成功！              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "📱 你的 Nova-Mind 免费版本已部署到 Vercel！"
    echo ""
    echo "🔧 配置信息:"
    echo "  - 模型: DeepSeek"
    echo "  - 策略: $MODEL_STRATEGY"
    echo "  - 版本: 免费版本"
    echo "  - 成本: ¥0"
    echo ""
    echo "💡 下一步:"
    echo "  1. 访问你的 Vercel 应用 URL"
    echo "  2. 开始和 Nova-Mind 对话"
    echo "  3. 配置 GitHub Actions 月度整合（可选）"
    echo ""
    echo "📚 更多资源:"
    echo "  - 部署指南: ./VERCEL_DEPLOYMENT.md"
    echo "  - 快速启动: ./QUICK_START_GUIDE.md"
    echo "  - 混合部署: ./HYBRID_DEPLOYMENT_GUIDE.md"
    echo ""
    echo "❓ 需要帮助?"
    echo "  - 查看 Vercel 仪表板: https://vercel.com"
    echo "  - 查看部署日志: vercel logs"
    echo ""
}

# 主函数
main() {
    print_header
    
    check_prerequisites
    configure_deepseek
    configure_model_strategy
    create_env_file
    install_vercel_cli
    
    echo ""
    read -p "是否继续构建和部署? (y/n, 默认 y): " CONTINUE
    if [ "$CONTINUE" = "n" ]; then
        print_warning "部署已取消"
        exit 0
    fi
    
    build_project
    login_vercel
    deploy_vercel
    show_success
}

# 运行主函数
main
