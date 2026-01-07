#!/bin/bash

###############################################################################
# Azure 应用服务环境变量配置脚本
# 
# 用法: ./scripts/azure-setup.sh
#
# 此脚本帮助您快速配置 Azure 应用服务的所有必需环境变量
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 检查必需的工具
check_requirements() {
    print_header "检查系统要求"
    
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI 未安装"
        echo "请访问 https://docs.microsoft.com/cli/azure/install-azure-cli 安装"
        exit 1
    fi
    print_success "Azure CLI 已安装"
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq 未安装（可选，用于 JSON 处理）"
    else
        print_success "jq 已安装"
    fi
}

# 获取用户输入
get_user_input() {
    print_header "配置基本信息"
    
    read -p "请输入 Azure 资源组名称: " RESOURCE_GROUP
    if [ -z "$RESOURCE_GROUP" ]; then
        print_error "资源组名称不能为空"
        exit 1
    fi
    
    read -p "请输入 Azure 应用服务名称: " APP_NAME
    if [ -z "$APP_NAME" ]; then
        print_error "应用服务名称不能为空"
        exit 1
    fi
    
    print_success "资源组: $RESOURCE_GROUP"
    print_success "应用名称: $APP_NAME"
}

# 获取 Manus 平台环境变量
get_manus_env_vars() {
    print_header "输入 Manus 平台环境变量"
    
    read -p "请输入 DATABASE_URL: " DATABASE_URL
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL 不能为空"
        exit 1
    fi
    
    read -sp "请输入 JWT_SECRET (输入时不显示): " JWT_SECRET
    echo
    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET 不能为空"
        exit 1
    fi
    
    read -p "请输入 VITE_APP_ID: " VITE_APP_ID
    if [ -z "$VITE_APP_ID" ]; then
        print_error "VITE_APP_ID 不能为空"
        exit 1
    fi
    
    read -p "请输入 OAUTH_SERVER_URL (默认: https://api.manus.im): " OAUTH_SERVER_URL
    OAUTH_SERVER_URL=${OAUTH_SERVER_URL:-"https://api.manus.im"}
    
    read -p "请输入 OWNER_OPEN_ID: " OWNER_OPEN_ID
    if [ -z "$OWNER_OPEN_ID" ]; then
        print_error "OWNER_OPEN_ID 不能为空"
        exit 1
    fi
    
    read -p "请输入 BUILT_IN_FORGE_API_URL: " BUILT_IN_FORGE_API_URL
    if [ -z "$BUILT_IN_FORGE_API_URL" ]; then
        print_error "BUILT_IN_FORGE_API_URL 不能为空"
        exit 1
    fi
    
    read -sp "请输入 BUILT_IN_FORGE_API_KEY (输入时不显示): " BUILT_IN_FORGE_API_KEY
    echo
    if [ -z "$BUILT_IN_FORGE_API_KEY" ]; then
        print_error "BUILT_IN_FORGE_API_KEY 不能为空"
        exit 1
    fi
    
    print_success "所有环境变量已输入"
}

# 验证 Azure 连接
verify_azure_connection() {
    print_header "验证 Azure 连接"
    
    # 检查是否已登录
    if ! az account show &> /dev/null; then
        print_warning "未登录 Azure，正在打开登录页面..."
        az login
    fi
    
    # 检查资源组是否存在
    if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_error "资源组 '$RESOURCE_GROUP' 不存在"
        exit 1
    fi
    print_success "资源组已验证"
    
    # 检查应用服务是否存在
    if ! az webapp show --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" &> /dev/null; then
        print_error "应用服务 '$APP_NAME' 不存在"
        exit 1
    fi
    print_success "应用服务已验证"
}

# 配置应用设置
configure_app_settings() {
    print_header "配置应用设置"
    
    echo "正在配置以下环境变量:"
    echo "  - NODE_ENV=production"
    echo "  - DATABASE_URL=***"
    echo "  - JWT_SECRET=***"
    echo "  - VITE_APP_ID=$VITE_APP_ID"
    echo "  - OAUTH_SERVER_URL=$OAUTH_SERVER_URL"
    echo "  - OWNER_OPEN_ID=$OWNER_OPEN_ID"
    echo "  - BUILT_IN_FORGE_API_URL=$BUILT_IN_FORGE_API_URL"
    echo "  - BUILT_IN_FORGE_API_KEY=***"
    
    read -p "确认配置? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "已取消配置"
        exit 1
    fi
    
    # 配置应用设置
    az webapp config appsettings set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_NAME" \
        --settings \
            NODE_ENV=production \
            "DATABASE_URL=$DATABASE_URL" \
            "JWT_SECRET=$JWT_SECRET" \
            "VITE_APP_ID=$VITE_APP_ID" \
            "OAUTH_SERVER_URL=$OAUTH_SERVER_URL" \
            "OWNER_OPEN_ID=$OWNER_OPEN_ID" \
            "BUILT_IN_FORGE_API_URL=$BUILT_IN_FORGE_API_URL" \
            "BUILT_IN_FORGE_API_KEY=$BUILT_IN_FORGE_API_KEY"
    
    print_success "应用设置已配置"
}

# 验证配置
verify_configuration() {
    print_header "验证配置"
    
    echo "已配置的环境变量:"
    az webapp config appsettings list \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_NAME" \
        --query "[].{name:name, value:value}" \
        -o table
    
    print_success "配置验证完成"
}

# 显示部署信息
show_deployment_info() {
    print_header "部署信息"
    
    # 获取应用 URL
    APP_URL=$(az webapp show --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --query "defaultHostName" -o tsv)
    
    echo -e "${GREEN}应用已配置完成！${NC}"
    echo ""
    echo "应用 URL: https://$APP_URL"
    echo ""
    echo "后续步骤:"
    echo "  1. 推送代码到 GitHub main 分支"
    echo "  2. GitHub Actions 工作流将自动构建并部署"
    echo "  3. 部署完成后，访问上述 URL 查看应用"
    echo ""
    echo "查看部署日志:"
    echo "  az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
    echo ""
    echo "重启应用:"
    echo "  az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME"
}

# 主函数
main() {
    print_header "Nova-Mind Azure 部署配置"
    
    check_requirements
    get_user_input
    get_manus_env_vars
    verify_azure_connection
    configure_app_settings
    verify_configuration
    show_deployment_info
    
    print_success "配置完成！"
}

# 运行主函数
main "$@"
