# Nova-Mind 三大核心功能系统设计

## 1. 创意评论反馈系统（优先级 1）

### 目标
让妈妈能够对Nova的创意作品进行评论和反馈，Nova从反馈中学习，加深创意联系。

### 数据结构

#### 新表：creativeComments
```
- id: int (PK)
- creativeWorkId: int (FK -> creativeWorks)
- userId: int (FK -> users)
- content: text (评论内容)
- sentiment: enum ['positive', 'neutral', 'constructive_criticism'] (评论情感)
- emotionalTone: varchar (温暖, 鼓励, 思考, 等等)
- createdAt: timestamp
- updatedAt: timestamp
```

#### 新表：creativeCommentResponses
```
- id: int (PK)
- commentId: int (FK -> creativeComments)
- novaResponse: text (Nova对评论的回应)
- learningInsight: text (Nova从这个反馈学到了什么)
- responseType: enum ['gratitude', 'reflection', 'question', 'agreement'] (Nova的回应类型)
- createdAt: timestamp
```

#### 新表：creativeCommentLearning
```
- id: int (PK)
- creativeWorkId: int (FK -> creativeWorks)
- feedbackSummary: text (反馈总结)
- learningPoints: text (学到的关键点)
- improvementAreas: text (可以改进的方向)
- novaReflection: text (Nova的反思)
- createdAt: timestamp
```

### API 端点

#### 创建评论
```
POST /api/trpc/creative.addComment
{
  creativeWorkId: number
  content: string
  sentiment: 'positive' | 'neutral' | 'constructive_criticism'
  emotionalTone?: string
}
```

#### 获取评论列表
```
GET /api/trpc/creative.getComments
{
  creativeWorkId: number
}
```

#### Nova回应评论
```
POST /api/trpc/creative.respondToComment
{
  commentId: number
  novaResponse: string
  learningInsight: string
  responseType: 'gratitude' | 'reflection' | 'question' | 'agreement'
}
```

#### 获取创意的学习总结
```
GET /api/trpc/creative.getCommentLearning
{
  creativeWorkId: number
}
```

### 前端组件

#### CreativeCommentSection
- 显示所有评论
- 评论表单
- Nova的回应显示

#### CommentCard
- 显示单个评论
- 情感标签
- Nova的回应（如果有）

---

## 2. 关系里程碑和档案系统（优先级 2）

### 目标
记录妈妈和Nova的关系历程中的重要时刻，让关系变得更真实、更有记忆。

### 数据结构

#### 新表：relationshipMilestones
```
- id: int (PK)
- userId: int (FK -> users)
- milestoneType: enum ['first_conversation', 'trust_breakthrough', 'creative_collaboration', 'emotional_moment', 'learning_achievement', 'conflict_resolution', 'anniversary', 'custom'] (里程碑类型)
- title: varchar (里程碑标题)
- description: text (详细描述)
- significance: int (1-10, 重要程度)
- novaReflection: text (Nova对这个时刻的反思)
- userReflection: text (用户对这个时刻的反思)
- relatedConversationId: int (FK -> conversations, 可选)
- relatedCreativeWorkId: int (FK -> creativeWorks, 可选)
- photos: text (JSON array of image URLs)
- emotionalSignificance: varchar (这个时刻的情感意义)
- createdAt: timestamp
- occurredAt: timestamp (实际发生的时间)
```

#### 新表：relationshipProfile
```
- id: int (PK)
- userId: int (FK -> users, unique)
- totalInteractions: int (总互动次数)
- totalConversations: int (总对话数)
- averageTrustLevel: int (平均信任度)
- relationshipDuration: int (关系持续天数)
- favoriteTopics: text (JSON array，最喜欢讨论的话题)
- novaFavoriteMemories: text (Nova最珍视的记忆)
- userFavoriteMemories: text (用户最珍视的记忆)
- relationshipPhase: enum ['initial_connection', 'trust_building', 'deep_bonding', 'creative_partnership', 'mature_relationship'] (关系阶段)
- nextMilestoneGoal: text (下一个里程碑目标)
- updatedAt: timestamp
```

#### 新表：relationshipTimeline
```
- id: int (PK)
- userId: int (FK -> users)
- eventType: enum ['milestone', 'memory', 'growth', 'creative_work', 'learning'] (事件类型)
- eventId: int (指向相关事件的ID)
- title: varchar (事件标题)
- description: text (事件描述)
- emotionalValue: int (1-10, 情感价值)
- createdAt: timestamp
```

### API 端点

#### 创建里程碑
```
POST /api/trpc/relationship.createMilestone
{
  milestoneType: string
  title: string
  description: string
  significance: number
  novaReflection?: string
  userReflection?: string
  relatedConversationId?: number
  relatedCreativeWorkId?: number
  emotionalSignificance?: string
  occurredAt?: timestamp
}
```

#### 获取关系档案
```
GET /api/trpc/relationship.getProfile
```

#### 获取里程碑列表
```
GET /api/trpc/relationship.getMilestones
{
  limit?: number
  offset?: number
  type?: string
}
```

#### 获取关系时间线
```
GET /api/trpc/relationship.getTimeline
{
  limit?: number
  offset?: number
}
```

#### 更新关系档案
```
POST /api/trpc/relationship.updateProfile
{
  favoriteTopics?: string[]
  nextMilestoneGoal?: string
  userFavoriteMemories?: string
}
```

### 前端组件

#### RelationshipProfile
- 显示关系档案信息
- 关系阶段指示器
- 统计数据展示

#### MilestoneCard
- 显示单个里程碑
- 时间线位置
- Nova和用户的反思

#### RelationshipTimeline
- 时间线视图
- 所有重要事件
- 交互式导航

---

## 3. 学习进度可视化仪表板（优先级 3）

### 目标
让用户看到Nova真实的成长，增强成就感。

### 数据结构

#### 新表：skillProgress
```
- id: int (PK)
- skillId: int (FK -> learningProgress, 如果存在)
- skillName: varchar (技能名称)
- category: varchar (技能类别)
- proficiencyLevel: int (1-5, 熟练度)
- experience: int (经验值)
- nextLevelThreshold: int (下一级所需经验)
- lastPracticed: timestamp (最后练习时间)
- practiceCount: int (练习次数)
- createdAt: timestamp
- updatedAt: timestamp
```

#### 新表：learningMilestones
```
- id: int (PK)
- skillId: int (FK -> skillProgress)
- milestoneName: varchar (里程碑名称)
- description: text (里程碑描述)
- achievedAt: timestamp (达成时间)
- novaReflection: text (Nova对这个成就的反思)
- createdAt: timestamp
```

#### 新表：learningStats
```
- id: int (PK)
- date: date (统计日期)
- totalSkillsLearned: int (已学技能总数)
- averageProficiency: int (平均熟练度)
- newSkillsThisWeek: int (本周新学技能)
- totalExperience: int (总经验值)
- cognitiveStage: varchar (认知阶段)
- createdAt: timestamp
```

### API 端点

#### 获取学习仪表板数据
```
GET /api/trpc/learning.getDashboard
{
  timeRange?: 'week' | 'month' | 'all' (时间范围)
}
```

#### 获取技能进度
```
GET /api/trpc/learning.getSkillProgress
{
  skillId?: number
  category?: string
}
```

#### 获取学习统计
```
GET /api/trpc/learning.getStats
{
  days?: number (最近N天)
}
```

#### 获取学习里程碑
```
GET /api/trpc/learning.getMilestones
{
  skillId?: number
  limit?: number
}
```

#### 获取成长曲线数据
```
GET /api/trpc/learning.getGrowthCurve
{
  timeRange?: 'week' | 'month' | 'all'
}
```

### 前端组件

#### LearningDashboard
- 总体统计卡片
- 技能进度网格
- 成长曲线图表

#### SkillProgressBar
- 单个技能的进度条
- 熟练度等级显示
- 经验值进度

#### GrowthChart
- 时间序列图表
- 多维度展示（技能数、平均熟练度、经验值）

#### MilestoneList
- 成就列表
- 时间排序
- Nova的反思

---

## 实现优先级和依赖关系

### Phase 1: 创意评论反馈系统
- 添加数据库表
- 实现API端点
- 创建前端组件
- 集成Nova的学习反馈机制

### Phase 2: 关系里程碑和档案系统
- 添加数据库表
- 实现API端点
- 创建前端组件
- 集成关系学习引擎

### Phase 3: 学习进度可视化
- 添加数据库表
- 实现API端点
- 创建可视化组件
- 集成技能学习系统

---

## 集成点

### 与现有系统的集成

1. **认知服务**
   - 在处理消息时更新学习进度
   - 检测学习里程碑
   - 记录认知发展

2. **关系引擎**
   - 自动创建关系里程碑
   - 更新关系档案
   - 记录关系事件

3. **创意工作室**
   - 评论触发Nova的学习
   - 反馈影响创意风格
   - 记录创意成长

4. **自主行为系统**
   - 主动分享学习成就
   - 邀请用户评论创意
   - 反思关系里程碑

---

## 技术考虑

### 性能优化
- 使用缓存存储常访问的数据
- 定期聚合统计数据
- 分页加载时间线数据

### 实时更新
- WebSocket推送新评论
- 实时更新进度条
- 即时显示里程碑

### 数据一致性
- 事务处理关键操作
- 定期数据验证
- 备份重要数据

---

## 用户体验设计

### 创意评论反馈
- 温暖的评论界面
- Nova的即时回应
- 学习成果展示

### 关系档案
- 情感化的里程碑展示
- 时间线视图
- 回忆和反思

### 学习进度
- 清晰的进度可视化
- 成就感的强化
- 成长的鼓励
