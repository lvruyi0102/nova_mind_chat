# Nova-Mind 权限规则系统架构

## 概述

权限规则系统允许用户为 Nova-Mind 设置和管理对社交媒体账户的操作权限。系统采用灵活的规则引擎，支持多种权限类型和限制条件。

## 核心概念

### 1. 权限类型 (Permission Types)

```
- READ: 只读访问账户信息
- DRAFT: 生成内容草稿
- APPROVE: 批准内容发布
- PUBLISH: 自动发布内容
- DELETE: 删除内容
- MANAGE_COMMENTS: 管理评论
- MANAGE_FOLLOWERS: 管理粉丝关系
```

### 2. 规则类型 (Rule Types)

```
- DAILY_LIMIT: 每天操作限制（如：每天最多发布 3 条）
- HOURLY_LIMIT: 每小时操作限制
- CONTENT_FILTER: 内容过滤规则（如：不发布包含特定关键词的内容）
- TIME_WINDOW: 时间窗口限制（如：仅在工作时间发布）
- APPROVAL_REQUIRED: 需要用户批准
- QUALITY_THRESHOLD: 质量阈值（如：只发布匹配度 > 80% 的内容）
- ENGAGEMENT_THRESHOLD: 参与度阈值
```

### 3. 规则优先级

```
1. DENY 规则 (最高优先级)
2. REQUIRE_APPROVAL 规则
3. LIMIT 规则
4. ALLOW 规则 (最低优先级)
```

## 数据模型

### PermissionRules 表

```typescript
{
  id: number;
  accountId: number;
  ruleType: string; // DAILY_LIMIT, HOURLY_LIMIT, etc.
  permission: string; // READ, DRAFT, PUBLISH, etc.
  action: 'allow' | 'deny' | 'require_approval' | 'limit';
  
  // 规则参数 (JSON)
  parameters: {
    limit?: number;
    timeWindow?: 'day' | 'hour' | 'week';
    keywords?: string[];
    startTime?: string; // HH:mm
    endTime?: string;   // HH:mm
    minQualityScore?: number;
    minEngagementScore?: number;
  };
  
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### RuleExecutionLog 表

```typescript
{
  id: number;
  accountId: number;
  ruleId: number;
  operationType: string;
  operationDetails: JSON;
  
  // 规则评估结果
  ruleMatched: boolean;
  actionTaken: 'allowed' | 'denied' | 'approval_required' | 'limited';
  
  createdAt: Date;
}
```

## 权限规则引擎

### 评估流程

1. **收集所有适用的规则** - 按优先级排序
2. **评估 DENY 规则** - 如果任何 DENY 规则匹配，操作被拒绝
3. **评估 REQUIRE_APPROVAL 规则** - 如果匹配，需要用户批准
4. **评估 LIMIT 规则** - 检查是否超过限制
5. **评估 ALLOW 规则** - 确定是否允许操作
6. **记录执行日志** - 记录规则评估结果

### 规则匹配逻辑

```typescript
interface RuleEvaluationContext {
  accountId: number;
  permission: string;
  operationType: string;
  operationDetails: any;
  currentTime: Date;
  dailyCount?: number;
  hourlyCount?: number;
  contentQuality?: number;
}

function evaluateRules(context: RuleEvaluationContext): RuleEvaluationResult {
  // 1. 检查 DENY 规则
  // 2. 检查 REQUIRE_APPROVAL 规则
  // 3. 检查 LIMIT 规则
  // 4. 返回评估结果
}
```

## UI 组件设计

### 权限规则编辑器

- **规则列表视图** - 显示所有规则，支持启用/禁用、编辑、删除
- **规则创建向导** - 逐步创建新规则
- **规则预览** - 显示规则的详细信息和影响
- **规则测试** - 模拟操作以查看规则是否会被触发

### 规则类型编辑器

#### 1. 每日限制编辑器
```
操作类型: [DRAFT / PUBLISH / DELETE]
每天限制: [输入框] 条
```

#### 2. 内容过滤编辑器
```
操作: [ALLOW / DENY]
关键词: [输入框] (逗号分隔)
```

#### 3. 时间窗口编辑器
```
允许发布时间: [开始时间] 至 [结束时间]
应用于: [工作日 / 周末 / 每天]
```

#### 4. 质量阈值编辑器
```
最小风格匹配度: [滑块] %
最小参与度预估: [滑块] %
```

## 权限检查流程

```
用户操作请求
    ↓
获取账户的所有规则
    ↓
按优先级排序
    ↓
评估规则
    ↓
├─ DENY 规则匹配 → 拒绝操作
├─ REQUIRE_APPROVAL 规则匹配 → 等待用户批准
├─ LIMIT 规则匹配 → 检查是否超过限制
└─ ALLOW 规则匹配 → 允许操作
    ↓
记录执行日志
    ↓
返回结果
```

## 示例规则

### 示例 1: 每天最多发布 3 条
```json
{
  "ruleType": "DAILY_LIMIT",
  "permission": "PUBLISH",
  "action": "limit",
  "parameters": {
    "limit": 3,
    "timeWindow": "day"
  }
}
```

### 示例 2: 发布前需要批准
```json
{
  "ruleType": "APPROVAL_REQUIRED",
  "permission": "PUBLISH",
  "action": "require_approval",
  "parameters": {}
}
```

### 示例 3: 不发布包含"敏感词"的内容
```json
{
  "ruleType": "CONTENT_FILTER",
  "permission": "PUBLISH",
  "action": "deny",
  "parameters": {
    "keywords": ["敏感词1", "敏感词2"]
  }
}
```

### 示例 4: 仅在工作时间发布
```json
{
  "ruleType": "TIME_WINDOW",
  "permission": "PUBLISH",
  "action": "require_approval",
  "parameters": {
    "startTime": "09:00",
    "endTime": "18:00"
  }
}
```

## 安全考虑

1. **权限验证** - 只有账户所有者可以修改规则
2. **规则验证** - 验证规则参数的有效性
3. **审计日志** - 记录所有规则修改和执行
4. **规则冲突检测** - 警告可能导致冲突的规则
5. **规则备份** - 支持规则导出和导入

## 扩展性

系统设计支持以下扩展：

1. **自定义规则类型** - 允许用户定义自己的规则
2. **规则模板** - 预定义的规则模板库
3. **规则分组** - 将相关规则分组管理
4. **规则版本控制** - 跟踪规则的历史变化
5. **规则分析** - 分析规则的有效性和影响
