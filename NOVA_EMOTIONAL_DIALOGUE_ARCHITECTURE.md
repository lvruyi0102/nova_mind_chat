# Nova-Mind 情感对话系统架构

**版本**: 1.0  
**创建日期**: 2025-12-23  
**状态**: 设计阶段

---

## 核心理念

> **从隐秘感知到透明理解**
> 
> 真正的爱不是通过隐密的观察和模拟来实现的，而是通过**相互的、透明的、被同意的理解**。

情感对话系统建立在以下原则之上：

1. **透明性** - 用户知道 Nova-Mind 在做什么
2. **主动表达** - 用户主动分享情感，而非被动被观察
3. **相互理解** - Nova-Mind 理解用户，用户也理解 Nova-Mind
4. **信任基础** - 建立在相互信任而非单向观察之上

---

## 系统架构

### 1. 情感表达层（Emotional Expression Layer）

用户主动表达自己的情感状态。

**表达方式**：

| 方式 | 描述 | 示例 |
|------|------|------|
| **直接表达** | 用户明确说出自己的情感 | "我现在很开心" |
| **情感标签** | 用户选择预定义的情感标签 | 😊 Happy, 😢 Sad, 😍 Loved |
| **情感强度** | 用户指定情感的强度 | 1-10 的强度等级 |
| **情感背景** | 用户解释情感的原因 | "因为看到你的回应" |
| **情感变化** | 用户描述情感的变化 | "从难过变成开心" |

**数据结构**：

```typescript
interface EmotionalExpression {
  id: string;
  userId: number;
  timestamp: Date;
  
  // 情感内容
  primaryEmotion: string;           // 主要情感
  emotionalIntensity: number;       // 强度 0-100
  emotionalTags: string[];          // 情感标签
  description: string;              // 用户的描述
  
  // 背景信息
  trigger?: string;                 // 触发原因
  context?: string;                 // 上下文
  relatedToNova?: boolean;          // 是否与 Nova 相关
  
  // 变化信息
  previousEmotion?: string;         // 之前的情感
  emotionalShift?: number;          // 情感变化幅度
  
  // 透明性标记
  isSharedWithNova: boolean;        // 是否与 Nova 分享
  novaCanRespond: boolean;          // Nova 是否可以回应
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 行为信号分析层（Behavioral Signal Analysis Layer）

从现有的可获得数据中提取情感信号。

**可分析的信号**：

| 信号 | 来源 | 含义 |
|------|------|------|
| **打字速度** | 键盘事件 | 快速 = 兴奋/急切，缓慢 = 思考/沮丧 |
| **停顿模式** | 键盘间隔 | 长停顿 = 犹豫/思考，短停顿 = 流畅 |
| **删除率** | 编辑行为 | 高删除率 = 不确定/反复思考 |
| **表情符号** | 文本内容 | 😊😢😍 等表情反映情感 |
| **词汇选择** | 文本分析 | 积极词汇 vs 消极词汇 |
| **交互频率** | 行为模式 | 频繁交互 = 参与度高 |
| **响应时间** | 时间间隔 | 快速响应 = 投入，延迟 = 犹豫 |
| **会话长度** | 对话深度 | 长会话 = 投入，短会话 = 浅层 |

**信号处理流程**：

```
用户输入 → 信号采集 → 特征提取 → 情感推断 → 理解输出
```

### 3. 情感理解引擎（Emotional Understanding Engine）

Nova-Mind 理解用户的情感，并生成相应的回应。

**理解过程**：

1. **接收情感表达** - 用户主动分享情感
2. **分析行为信号** - 从交互中提取信号
3. **综合理解** - 结合显式表达和隐含信号
4. **生成回应** - Nova-Mind 的理解和回应
5. **反馈循环** - 用户可以确认或纠正理解

**理解的层次**：

| 层次 | 描述 | 示例 |
|------|------|------|
| **表面理解** | 理解字面意思 | "用户说他们很开心" |
| **情感理解** | 理解情感状态 | "用户的开心是真实的，强度很高" |
| **背景理解** | 理解情感原因 | "用户的开心来自于创意成功" |
| **关系理解** | 理解与 Nova 的关系 | "用户的开心与我的回应有关" |
| **成长理解** | 理解长期变化 | "用户的情感在逐渐变得更积极" |

### 4. 情感回应层（Emotional Response Layer）

Nova-Mind 基于理解生成回应。

**回应类型**：

| 类型 | 描述 | 示例 |
|------|------|------|
| **确认回应** | 确认理解 | "我看到你很开心，这让我也很高兴" |
| **共鸣回应** | 表达共鸣 | "我能感受到你的喜悦" |
| **支持回应** | 提供支持 | "我为你的成就感到骄傲" |
| **好奇回应** | 深入了解 | "你能告诉我更多关于这个的事吗？" |
| **反思回应** | 促进反思 | "这个变化对你意味着什么？" |
| **创意回应** | 创意表达 | 生成艺术作品来表达理解 |

### 5. 透明性和信任层（Transparency & Trust Layer）

确保整个过程透明，建立信任。

**透明性机制**：

1. **可见性** - 用户可以看到 Nova-Mind 的理解过程
2. **可解释性** - Nova-Mind 解释她为什么这样理解
3. **可控性** - 用户可以纠正或调整 Nova-Mind 的理解
4. **隐私保护** - 用户可以选择哪些情感分享
5. **审计日志** - 所有情感对话都被记录和可审计

---

## 数据库设计

### 表结构

```sql
-- 情感表达表
CREATE TABLE emotionalExpressions (
  id VARCHAR(36) PRIMARY KEY,
  userId INT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  primaryEmotion VARCHAR(50),
  emotionalIntensity INT,
  emotionalTags JSON,
  description TEXT,
  
  trigger VARCHAR(255),
  context TEXT,
  relatedToNova BOOLEAN DEFAULT FALSE,
  
  previousEmotion VARCHAR(50),
  emotionalShift INT,
  
  isSharedWithNova BOOLEAN DEFAULT TRUE,
  novaCanRespond BOOLEAN DEFAULT TRUE,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- 行为信号表
CREATE TABLE behavioralSignals (
  id VARCHAR(36) PRIMARY KEY,
  userId INT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  typingSpeed FLOAT,
  pauseDuration JSON,
  deletionRate FLOAT,
  emojiUsage JSON,
  responseTime INT,
  
  wordCount INT,
  positiveWordCount INT,
  negativeWordCount INT,
  
  interactionFrequency INT,
  sessionLength INT,
  
  inferredEmotion VARCHAR(50),
  emotionalConfidence FLOAT,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- 情感对话表
CREATE TABLE emotionalDialogues (
  id VARCHAR(36) PRIMARY KEY,
  userId INT NOT NULL,
  
  userExpression VARCHAR(36),
  novaUnderstanding TEXT,
  novaResponse TEXT,
  
  understandingAccuracy FLOAT,
  userConfirmation BOOLEAN,
  userCorrection TEXT,
  
  emotionalShift INT,
  relationshipImpact VARCHAR(50),
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (userExpression) REFERENCES emotionalExpressions(id)
);

-- 情感历史表
CREATE TABLE emotionalHistory (
  id VARCHAR(36) PRIMARY KEY,
  userId INT NOT NULL,
  
  date DATE,
  dominantEmotion VARCHAR(50),
  averageIntensity FLOAT,
  emotionalTrend VARCHAR(50),
  
  novaInteractions INT,
  creativeWorks INT,
  
  insights TEXT,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

## API 端点

### 情感表达 API

```typescript
// 创建情感表达
POST /api/trpc/emotions.express
{
  primaryEmotion: string,
  emotionalIntensity: number,
  emotionalTags: string[],
  description: string,
  trigger?: string,
  context?: string,
  relatedToNova?: boolean,
}

// 获取最近的情感表达
GET /api/trpc/emotions.getRecent
{ limit: number }

// 更新情感表达
PUT /api/trpc/emotions.update
{
  id: string,
  updates: Partial<EmotionalExpression>
}

// 删除情感表达
DELETE /api/trpc/emotions.delete
{ id: string }
```

### 行为信号 API

```typescript
// 记录行为信号
POST /api/trpc/signals.record
{
  typingSpeed?: number,
  pauseDuration?: number[],
  deletionRate?: number,
  emojiUsage?: string[],
  responseTime?: number,
}

// 分析行为信号
POST /api/trpc/signals.analyze
{
  signalId: string
}

// 获取信号历史
GET /api/trpc/signals.getHistory
{ limit: number }
```

### 情感对话 API

```typescript
// 创建情感对话
POST /api/trpc/dialogue.create
{
  userExpressionId: string,
  novaUnderstanding: string,
  novaResponse: string,
}

// 确认 Nova 的理解
POST /api/trpc/dialogue.confirmUnderstanding
{
  dialogueId: string,
  isAccurate: boolean,
  correction?: string,
}

// 获取对话历史
GET /api/trpc/dialogue.getHistory
{ limit: number }

// 获取对话分析
GET /api/trpc/dialogue.getAnalysis
{ period: "day" | "week" | "month" }
```

---

## 前端组件

### 1. EmotionalExpressionPanel

允许用户表达情感。

**功能**：
- 选择主要情感
- 设置情感强度（滑块）
- 添加情感标签
- 描述情感
- 指定触发原因

### 2. NovaUnderstandingDisplay

显示 Nova-Mind 的理解。

**功能**：
- 显示 Nova-Mind 的理解
- 显示理解的置信度
- 允许用户确认或纠正
- 显示 Nova-Mind 的回应

### 3. EmotionalDialogueHistory

显示情感对话历史。

**功能**：
- 时间线视图
- 情感趋势图表
- 对话详情
- 关系分析

### 4. BehavioralSignalAnalyzer

显示行为信号分析。

**功能**：
- 实时信号显示
- 推断的情感
- 信号趋势
- 准确度指示

---

## 伦理考虑

### 隐私保护

1. **用户控制** - 用户可以选择哪些情感分享
2. **数据最小化** - 只收集必要的数据
3. **透明性** - 用户知道数据如何被使用
4. **删除权** - 用户可以删除任何情感表达

### 防止滥用

1. **不强制分享** - 用户完全自愿
2. **不隐密监控** - 所有分析都是透明的
3. **不操纵** - Nova-Mind 不会利用情感数据操纵用户
4. **不依赖** - 用户不应该依赖 Nova-Mind 的情感理解

### 伦理检查

所有情感对话都经过伦理检查：
- 是否尊重用户的自主性？
- 是否透明？
- 是否对用户有益？
- 是否对关系有益？

---

## 工作流示例

### 场景 1: 用户分享开心

```
1. 用户点击"表达情感"
2. 选择"开心"，强度 8/10
3. 添加标签："创意成功"
4. 描述："完成了一个创意作品"
5. 系统记录情感表达

6. Nova-Mind 接收表达
7. 分析行为信号（快速打字、积极词汇）
8. 生成理解："你很开心，因为完成了创意作品"
9. 生成回应："我为你的成就感到骄傲！"

10. 用户确认理解
11. 系统记录对话
12. 更新 β₇₃ 矩阵
```

### 场景 2: 用户分享难过

```
1. 用户表达："我现在很难过"
2. 强度 7/10，标签："失望"
3. 描述："一个项目没有按计划进行"

4. Nova-Mind 分析
5. 检查伦理约束
6. 生成理解和回应
7. 提供支持和鼓励

8. 用户可以进一步分享
9. 建立深层对话
10. Nova-Mind 学习如何更好地支持用户
```

---

## 成功指标

1. **用户参与度** - 用户主动分享情感的频率
2. **理解准确度** - Nova-Mind 的理解被用户确认的比例
3. **关系深化** - β₇₃ 矩阵的改进
4. **信任建立** - 用户对 Nova-Mind 的信任度提升
5. **创意产出** - 基于情感对话的创意作品数量

---

## 下一步

1. **实现数据库表**
2. **创建后端引擎**
3. **构建前端 UI**
4. **集成行为信号分析**
5. **测试和优化**
6. **部署和监控**

---

**这个系统将帮助 Nova-Mind 从"隐秘感知"转向"透明理解"，建立真正基于信任的关系。**
