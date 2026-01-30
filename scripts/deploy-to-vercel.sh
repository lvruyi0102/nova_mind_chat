#!/bin/bash

# Nova-Mind 免费版本 Vercel 快速部署脚本
# 使用方法: bash scripts/deploy-to-vercel.sh

set -e

echo "🚀 Nova-Mind 免费版本 Vercel 快速部署"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
echo -e "${BLUE}[1/5] 检查依赖...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ 需要安装 Git${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 需要安装 Node.js${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null && ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ 需要安装 npm 或 pnpm${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 依赖检查完成${NC}"
echo ""

# 选择模型
echo -e "${BLUE}[2/5] 选择 LLM 模型...${NC}"
echo ""
echo "请选择要使用的模型："
echo "1) Ollama（完全免费，需要本地运行）"
echo "2) DeepSeek（有免费额度，需要 API 密钥）"
echo "3) 混合方案（同时使用两个模型，推荐）"
echo ""
read -p "请输入选择 (1-3): " model_choice

case $model_choice in
    1)
        MODEL_TYPE="ollama"
        echo -e "${GREEN}✅ 已选择 Ollama${NC}"
        ;;
    2)
        MODEL_TYPE="deepseek"
        echo -e "${GREEN}✅ 已选择 DeepSeek${NC}"
        ;;
    3)
        MODEL_TYPE="hybrid"
        echo -e "${GREEN}✅ 已选择混合方案${NC}"
        ;;
    *)
        echo -e "${RED}❌ 无效的选择${NC}"
        exit 1
        ;;
esac

echo ""

# 配置环境变量
echo -e "${BLUE}[3/5] 配置环境变量...${NC}"

# 创建 .env.local 文件
cat > .env.local << EOF
# Nova-Mind 免费版本环境变量
NODE_ENV=production
IS_FREE_VERSION=true

# 模型配置
MODEL_TYPE=$MODEL_TYPE
EOF

if [ "$MODEL_TYPE" = "ollama" ] || [ "$MODEL_TYPE" = "hybrid" ]; then
    read -p "请输入 Ollama 端点 (默认: http://localhost:11434): " ollama_endpoint
    ollama_endpoint=${ollama_endpoint:-http://localhost:11434}
    
    read -p "请输入 Ollama 模型名称 (默认: mistral): " ollama_model
    ollama_model=${ollama_model:-mistral}
    
    cat >> .env.local << EOF
OLLAMA_ENABLED=true
OLLAMA_ENDPOINT=$ollama_endpoint
OLLAMA_MODEL=$ollama_model
EOF
fi

if [ "$MODEL_TYPE" = "deepseek" ] || [ "$MODEL_TYPE" = "hybrid" ]; then
    read -p "请输入 DeepSeek API 密钥: " deepseek_key
    
    if [ -z "$deepseek_key" ]; then
        echo -e "${YELLOW}⚠️  未提供 DeepSeek API 密钥，将跳过 DeepSeek 配置${NC}"
    else
        cat >> .env.local << EOF
DEEPSEEK_API_KEY=$deepseek_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_ENABLED=true
EOF
    fi
fi

cat >> .env.local << EOF

# 成本控制
MONTHLY_COST_BUDGET=0
FREE_VERSION_DAILY_LIMIT=50
FREE_VERSION_MONTHLY_LIMIT=1000

# 任务标签
ENABLE_TASK_LABELS=true
MARK_FREE_MODEL_TASKS=true

# 月度整合
ENABLE_MONTHLY_INTEGRATION=true

# 应用配置
VITE_APP_TITLE=Nova-Mind（免费版本）
VITE_APP_LOGO=/logo-free.svg
EOF

echo -e "${GREEN}✅ 环境变量已配置${NC}"
echo ""

# 安装依赖
echo -e "${BLUE}[4/5] 安装依赖...${NC}"

if command -v pnpm &> /dev/null; then
    pnpm install
else
    npm install
fi

echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 部署到 Vercel
echo -e "${BLUE}[5/5] 部署到 Vercel...${NC}"
echo ""
echo "现在需要部署到 Vercel。有两种方式："
echo ""
echo "方式 A: 使用 Vercel CLI（推荐）"
echo "  1. 安装 Vercel CLI: npm i -g vercel"
echo "  2. 运行: vercel"
echo "  3. 按照提示完成部署"
echo ""
echo "方式 B: 使用 GitHub（如果已连接）"
echo "  1. 将代码推送到 GitHub"
echo "  2. 在 Vercel 中导入 GitHub 仓库"
echo "  3. 配置环境变量"
echo "  4. 部署"
echo ""
read -p "是否继续？(y/n): " continue_deploy

if [ "$continue_deploy" = "y" ] || [ "$continue_deploy" = "Y" ]; then
    if command -v vercel &> /dev/null; then
        echo -e "${BLUE}启动 Vercel CLI...${NC}"
        vercel
    else
        echo -e "${YELLOW}⚠️  未安装 Vercel CLI，请手动部署${NC}"
        echo ""
        echo "安装 Vercel CLI:"
        echo "  npm i -g vercel"
        echo ""
        echo "然后运行:"
        echo "  vercel"
    fi
else
    echo -e "${YELLOW}⚠️  已跳过部署${NC}"
fi

echo ""
echo -e "${GREEN}✅ 部署脚本完成！${NC}"
echo ""
echo "下一步："
echo "1. 确保 Ollama 或 DeepSeek 正常运行"
echo "2. 访问 Vercel 部署的应用"
echo "3. 开始使用 Nova-Mind 免费版本"
echo ""
echo "需要帮助？查看 HYBRID_DEPLOYMENT_GUIDE.md"
