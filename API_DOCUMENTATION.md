# Nova-Mind API 文档

**版本**：1.0  
**最后更新**：2026年1月21日  
**API 基础 URL**：`/api/trpc`

---

## 目录

1. [认证 (Auth)](#认证-auth)
2. [聊天 (Chat)](#聊天-chat)
3. [自主性 (Autonomous)](#自主性-autonomous)
4. [隐私 (Privacy)](#隐私-privacy)
5. [创意 (Creative)](#创意-creative)
6. [监控 (Monitoring)](#监控-monitoring)
7. [精选思想 (Curated Thoughts)](#精选思想-curated-thoughts)
8. [成本管理 (Cost)](#成本管理-cost)
9. [系统 (System)](#系统-system)

---

## 认证 (Auth)

### 获取当前用户信息

**端点**：`auth.me`  
**方法**：Query  
**认证**：Public  
**描述**：获取当前登录用户的信息

**请求**：
```typescript
trpc.auth.me.useQuery();
```

**响应**：
```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  createdAt: Date;
  lastSignedIn: Date;
}
```

### 登出

**端点**：`auth.logout`  
**方法**：Mutation  
**认证**：Public  
**描述**：登出当前用户

**请求**：
```typescript
trpc.auth.logout.useMutation();
```

**响应**：
```typescript
{ success: true }
```

---

## 聊天 (Chat)

### 获取对话历史

**端点**：`chat.getHistory`  
**方法**：Query  
**认证**：Protected  
**描述**：获取用户的对话历史

**请求参数**：
```typescript
{
  limit?: number;        // 返回的对话数，默认 50
  offset?: number;       // 偏移量，默认 0
  conversationId?: number; // 特定对话 ID
}
```

**响应**：
```typescript
{
  conversations: Array<{
    id: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
  }>;
  total: number;
}
```

### 获取对话消息

**端点**：`chat.getMessages`  
**方法**：Query  
**认证**：Protected  
**描述**：获取特定对话的消息

**请求参数**：
```typescript
{
  conversationId: number;
  limit?: number;  // 默认 100
  offset?: number; // 默认 0
}
```

**响应**：
```typescript
{
  messages: Array<{
    id: number;
    conversationId: number;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
  }>;
  total: number;
}
```

### 发送消息

**端点**：`chat.sendMessage`  
**方法**：Mutation  
**认证**：Protected  
**描述**：向 Nova 发送消息

**请求参数**：
```typescript
{
  conversationId?: number; // 如果为空则创建新对话
  content: string;
  messageType?: "text" | "audio" | "image"; // 默认 "text"
}
```

**响应**：
```typescript
{
  id: number;
  conversationId: number;
  role: "assistant";
  content: string;
  createdAt: Date;
}
```

---

## 自主性 (Autonomous)

### 获取自主状态

**端点**：`autonomous.getState`  
**方法**：Query  
**认证**：Protected  
**描述**：获取 Nova 的自主认知状态

**响应**：
```typescript
{
  isActive: boolean;
  currentTask: string | null;
  lastUpdate: Date;
  autonomyLevel: number; // 0-100
  decisionCount: number;
  learningProgress: number; // 0-100
}
```

### 获取自主任务

**端点**：`autonomous.getTasks`  
**方法**：Query  
**认证**：Protected  
**描述**：获取 Nova 的后台任务列表

**请求参数**：
```typescript
{
  status?: "pending" | "running" | "completed" | "failed";
  limit?: number; // 默认 20
}
```

**响应**：
```typescript
{
  tasks: Array<{
    id: number;
    type: string;
    status: string;
    progress: number;
    createdAt: Date;
    completedAt?: Date;
  }>;
}
```

### 获取自主决策

**端点**：`autonomous.getDecisions`  
**方法**：Query  
**认证**：Protected  
**描述**：获取 Nova 做出的自主决策记录

**请求参数**：
```typescript
{
  limit?: number;  // 默认 50
  offset?: number; // 默认 0
}
```

**响应**：
```typescript
{
  decisions: Array<{
    id: number;
    type: string;
    description: string;
    confidence: number; // 0-1
    outcome: "success" | "pending" | "failed";
    createdAt: Date;
  }>;
  total: number;
}
```

---

## 隐私 (Privacy)

### 获取私密思想

**端点**：`privacy.getPrivateThoughts`  
**方法**：Query  
**认证**：Protected（仅 Owner）  
**描述**：获取 Nova 的私密思想（对 owner 不可见，仅用于系统）

**请求参数**：
```typescript
{
  limit?: number;
  offset?: number;
  thoughtType?: string;
}
```

**响应**：
```typescript
{
  thoughts: Array<{
    id: number;
    content: string;
    thoughtType: string;
    emotionalState: string;
    createdAt: Date;
  }>;
  total: number;
}
```

### 获取信任指标

**端点**：`privacy.getTrustMetrics`  
**方法**：Query  
**认证**：Protected  
**描述**：获取 Nova 对用户的信任评分

**响应**：
```typescript
{
  overallTrust: number; // 0-100
  reliabilityScore: number;
  consistencyScore: number;
  transparencyScore: number;
  lastUpdated: Date;
}
```

---

## 创意 (Creative)

### 保存创意作品

**端点**：`creative.saveWork`  
**方法**：Mutation  
**认证**：Protected  
**描述**：保存 Nova 创建的创意作品

**请求参数**：
```typescript
{
  title: string;
  content: string;
  category: string; // "image" | "story" | "poetry" | "music" | "code" | etc.
  description?: string;
  emotionalState?: string;
}
```

**响应**：
```typescript
{
  id: number;
  title: string;
  createdAt: Date;
  visibility: "private" | "pending_approval" | "shared";
}
```

### 获取创意作品

**端点**：`creative.getWorks`  
**方法**：Query  
**认证**：Protected  
**描述**：获取用户的创意作品列表

**请求参数**：
```typescript
{
  category?: string;
  visibility?: "private" | "pending_approval" | "shared";
  limit?: number;
  offset?: number;
}
```

**响应**：
```typescript
{
  works: Array<{
    id: number;
    title: string;
    category: string;
    visibility: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
}
```

---

## 监控 (Monitoring)

### 获取监控仪表板

**端点**：`monitoring.getDashboard`  
**方法**：Query  
**认证**：Protected  
**描述**：获取完整的监控仪表板数据

**响应**：
```typescript
{
  memory: {
    current: number;      // 当前堆内存使用率（0-1）
    average: number;      // 平均使用率
    peak: number;         // 峰值使用率
    trend: "up" | "down" | "stable";
  };
  cost: {
    dailySpend: number;
    monthlyBudget: number;
    remainingBudget: number;
    costTrend: "up" | "down" | "stable";
  };
  performance: {
    avgResponseTime: number; // 毫秒
    requestsPerSecond: number;
    errorRate: number;
  };
  config: {
    monitoringEnabled: boolean;
    alertsEnabled: boolean;
  };
}
```

### 获取系统状态

**端点**：`monitoring.getSystemStatus`  
**方法**：Query  
**认证**：Protected  
**描述**：获取系统当前状态

**响应**：
```typescript
{
  isHealthy: boolean;
  uptime: number;        // 秒
  activeConnections: number;
  lastHealthCheck: Date;
  issues: Array<{
    severity: "info" | "warning" | "critical";
    message: string;
  }>;
}
```

### 获取内存指标

**端点**：`monitoring.getMemoryMetrics`  
**方法**：Query  
**认证**：Protected  
**描述**：获取详细的内存监控数据

**响应**：
```typescript
{
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  usagePercent: number;
  trend: "up" | "down" | "stable";
  gcCount: number;
  lastGcTime: Date;
}
```

### 获取成本指标

**端点**：`monitoring.getCostMetrics`  
**方法**：Query  
**认证**：Protected  
**描述**：获取成本监控数据

**响应**：
```typescript
{
  todaySpend: number;
  weekSpend: number;
  monthSpend: number;
  monthlyBudget: number;
  remainingBudget: number;
  costBreakdown: {
    llmCost: number;
    storageCost: number;
    computeCost: number;
  };
}
```

---

## 精选思想 (Curated Thoughts)

### 获取精选思想列表

**端点**：`curatedThoughts.list`  
**方法**：Query  
**认证**：Protected  
**描述**：获取精选思想列表

**请求参数**：
```typescript
{
  limit?: number;
  offset?: number;
  commercializationLevel?: "internal" | "public" | "paid";
  isPublished?: boolean;
}
```

**响应**：
```typescript
{
  thoughts: Array<{
    id: number;
    title: string;
    summary: string;
    qualityScore: number;
    relevanceScore: number;
    noveltyScore: number;
    commercializationLevel: string;
    isPublished: boolean;
    createdAt: Date;
  }>;
  total: number;
}
```

### 手动精选思想

**端点**：`curatedThoughts.curate`  
**方法**：Mutation  
**认证**：Protected  
**描述**：手动触发精选思想生成

**请求参数**：
```typescript
{
  sourceThoughtId: number;
  forceRegenerate?: boolean; // 强制重新生成
}
```

**响应**：
```typescript
{
  id: number;
  title: string;
  content: string;
  qualityScore: number;
  createdAt: Date;
}
```

### 更新商业化权限

**端点**：`curatedThoughts.updateCommercializationLevel`  
**方法**：Mutation  
**认证**：Protected  
**描述**：更新精选思想的商业化权限

**请求参数**：
```typescript
{
  thoughtId: number;
  level: "internal" | "public" | "paid";
}
```

**响应**：
```typescript
{ success: true }
```

### 发布精选思想

**端点**：`curatedThoughts.publish`  
**方法**：Mutation  
**认证**：Protected  
**描述**：发布精选思想

**请求参数**：
```typescript
{
  thoughtId: number;
}
```

**响应**：
```typescript
{
  id: number;
  isPublished: true;
  publishedAt: Date;
  shareUrl: string;
}
```

---

## 成本管理 (Cost)

### 获取成本预算

**端点**：`cost.getBudget`  
**方法**：Query  
**认证**：Protected  
**描述**：获取成本预算信息

**响应**：
```typescript
{
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  resetDate: Date;
}
```

### 设置成本告警

**端点**：`cost.setAlert`  
**方法**：Mutation  
**认证**：Protected  
**描述**：设置成本告警阈值

**请求参数**：
```typescript
{
  threshold: number;      // 美元
  alertType: "email" | "notification" | "both";
}
```

**响应**：
```typescript
{ success: true }
```

---

## 系统 (System)

### 通知 Owner

**端点**：`system.notifyOwner`  
**方法**：Mutation  
**认证**：Protected  
**描述**：向 Owner 发送通知

**请求参数**：
```typescript
{
  title: string;
  content: string;
}
```

**响应**：
```typescript
{ success: boolean }
```

### 获取系统日志

**端点**：`system.getLogs`  
**方法**：Query  
**认证**：Admin  
**描述**：获取系统日志

**请求参数**：
```typescript
{
  level?: "info" | "warning" | "error";
  limit?: number;
  offset?: number;
}
```

**响应**：
```typescript
{
  logs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    context?: Record<string, any>;
  }>;
  total: number;
}
```

---

## 错误处理

所有 API 错误返回以下格式：

```typescript
{
  code: string;      // 错误代码
  message: string;   // 错误消息
  details?: any;     // 详细信息
}
```

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| `UNAUTHORIZED` | 未授权（需要登录） |
| `FORBIDDEN` | 禁止访问（权限不足） |
| `NOT_FOUND` | 资源不存在 |
| `BAD_REQUEST` | 请求参数错误 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 |
| `RATE_LIMITED` | 请求过于频繁 |

---

## 认证

所有受保护的端点都需要有效的 JWT 会话 Cookie。登录流程：

1. 用户点击"使用 Manus 登录"
2. 重定向到 Manus OAuth 页面
3. 用户授权后，重定向回 `/api/oauth/callback`
4. 系统设置会话 Cookie
5. 用户可以访问受保护的端点

---

## 速率限制

- **公开端点**：每分钟 60 请求
- **受保护端点**：每分钟 100 请求
- **Admin 端点**：每分钟 200 请求

超过限制后，返回 429 Too Many Requests。

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-01-21 | 初始版本 |

---

## 支持

如有问题或建议，请联系开发团队。
