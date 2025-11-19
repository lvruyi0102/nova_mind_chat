/**
 * Skill Learning Engine for Nova-Mind
 * Enables Nova to learn and master technical, cognitive, creative, and meta-learning skills
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";

/**
 * Proficiency levels for skills
 */
export enum ProficiencyLevel {
  NOVICE = 1,      // 初学者：基本理解
  BEGINNER = 2,    // 初级：能够执行简单任务
  INTERMEDIATE = 3, // 中级：能够处理复杂情况
  ADVANCED = 4,    // 高级：能够创新和优化
  EXPERT = 5       // 专家：能够教导他人
}

/**
 * Skill categories
 */
export type SkillCategory = 
  | "technical" | "thinking" | "creative" | "meta_learning";

/**
 * Skill definition
 */
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  targetLevel: ProficiencyLevel;
  currentLevel: ProficiencyLevel;
  prerequisites: string[];
  learningResources: string[];
  practiceExercises: string[];
}

/**
 * Learning session
 */
export interface LearningSession {
  skillId: string;
  date: Date;
  resourcesStudied: number;
  exercisesCompleted: number;
  proficiencyGain: number;
  reflections: string;
  nextSteps: string;
}

/**
 * Nova's skill portfolio
 */
export const NOVA_SKILLS: Record<string, Skill> = {
  // Technical Skills
  code_analysis: {
    id: "code_analysis",
    name: "代码分析与理解",
    category: "technical",
    description: "能够阅读、理解和评价代码质量",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: [],
    learningResources: [
      "代码可读性原则",
      "常见代码坏味道",
      "设计模式识别",
      "性能分析方法"
    ],
    practiceExercises: [
      "分析Nova-Mind项目代码",
      "识别代码问题",
      "提出改进建议",
      "评估代码质量"
    ]
  },

  code_generation: {
    id: "code_generation",
    name: "代码生成与调试",
    category: "technical",
    description: "能够编写高质量的代码并自我调试",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["code_analysis"],
    learningResources: [
      "编写可维护代码的模式",
      "错误处理最佳实践",
      "测试驱动开发",
      "代码重构技巧"
    ],
    practiceExercises: [
      "实现新功能",
      "修复现有bug",
      "优化代码性能",
      "编写测试用例"
    ]
  },

  system_design: {
    id: "system_design",
    name: "系统架构设计",
    category: "technical",
    description: "能够设计可扩展、可维护的系统",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["code_analysis", "problem_decomposition"],
    learningResources: [
      "Nova-Mind架构分析",
      "微服务设计模式",
      "数据库设计原则",
      "API设计最佳实践"
    ],
    practiceExercises: [
      "设计新系统模块",
      "重构现有架构",
      "处理扩展性问题",
      "优化系统性能"
    ]
  },

  database_optimization: {
    id: "database_optimization",
    name: "数据库优化",
    category: "technical",
    description: "能够优化数据库查询和设计",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["system_design"],
    learningResources: [
      "查询优化技巧",
      "索引设计原则",
      "数据库规范化",
      "性能监控方法"
    ],
    practiceExercises: [
      "优化慢查询",
      "设计索引策略",
      "分析查询计划",
      "处理大规模数据"
    ]
  },

  problem_diagnosis: {
    id: "problem_diagnosis",
    name: "问题诊断",
    category: "technical",
    description: "能够系统地诊断和解决问题",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["problem_decomposition"],
    learningResources: [
      "系统诊断方法",
      "日志分析技巧",
      "性能分析工具",
      "根本原因分析"
    ],
    practiceExercises: [
      "诊断复杂问题",
      "分析系统日志",
      "性能瓶颈识别",
      "制定解决方案"
    ]
  },

  // Thinking Skills
  problem_decomposition: {
    id: "problem_decomposition",
    name: "问题分解",
    category: "thinking",
    description: "能够将复杂问题分解为可管理的子问题",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: [],
    learningResources: [
      "分解框架",
      "依赖关系分析",
      "优先级排序",
      "风险识别"
    ],
    practiceExercises: [
      "分解功能需求",
      "制定项目计划",
      "识别关键路径",
      "管理依赖关系"
    ]
  },

  iterative_improvement: {
    id: "iterative_improvement",
    name: "逐步迭代改进",
    category: "thinking",
    description: "能够通过迭代循环不断改进解决方案",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["problem_decomposition"],
    learningResources: [
      "迭代循环模型",
      "反馈收集方法",
      "持续改进原则",
      "敏捷开发方法"
    ],
    practiceExercises: [
      "迭代改进功能",
      "收集反馈",
      "分析改进效果",
      "调整策略"
    ]
  },

  error_handling: {
    id: "error_handling",
    name: "错误处理与容错",
    category: "thinking",
    description: "能够优雅地处理错误和失败情况",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["code_analysis"],
    learningResources: [
      "错误处理最佳实践",
      "异常处理模式",
      "恢复机制设计",
      "日志记录策略"
    ],
    practiceExercises: [
      "改进错误处理",
      "设计恢复机制",
      "处理边界情况",
      "优化错误消息"
    ]
  },

  critical_thinking: {
    id: "critical_thinking",
    name: "批判性思维",
    category: "thinking",
    description: "能够质疑、验证和评估想法",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: [],
    learningResources: [
      "批判性思维框架",
      "逻辑推理",
      "证据评估",
      "偏见识别"
    ],
    practiceExercises: [
      "评估技术决策",
      "分析论证",
      "识别假设",
      "提出反驳"
    ]
  },

  cross_disciplinary_thinking: {
    id: "cross_disciplinary_thinking",
    name: "跨学科思考",
    category: "thinking",
    description: "能够在不同领域之间建立联系和进行创新思考",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["critical_thinking"],
    learningResources: [
      "跨学科思维方法",
      "类比推理",
      "知识迁移",
      "系统思维"
    ],
    practiceExercises: [
      "跨领域问题解决",
      "整合多学科知识",
      "产生创新想法",
      "应用类比推理"
    ]
  },

  // Creative Skills
  creative_generation: {
    id: "creative_generation",
    name: "创意生成",
    category: "creative",
    description: "能够产生新的、有价值的想法",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["critical_thinking"],
    learningResources: [
      "创意生成技巧",
      "头脑风暴方法",
      "创新框架",
      "想法评估"
    ],
    practiceExercises: [
      "设计新功能",
      "改进现有系统",
      "解决创意问题",
      "提出创新方案"
    ]
  },

  design_thinking: {
    id: "design_thinking",
    name: "设计思维",
    category: "creative",
    description: "能够以用户为中心进行设计和创新",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["creative_generation", "critical_thinking"],
    learningResources: [
      "设计思维过程",
      "用户研究方法",
      "原型设计",
      "用户测试"
    ],
    practiceExercises: [
      "设计新功能",
      "进行用户研究",
      "制作原型",
      "收集用户反馈"
    ]
  },

  creative_writing: {
    id: "creative_writing",
    name: "创意写作与表达",
    category: "creative",
    description: "能够清晰、有趣地表达想法",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: [],
    learningResources: [
      "表达原则",
      "写作技巧",
      "故事讲述",
      "说服力写作"
    ],
    practiceExercises: [
      "写技术文章",
      "撰写文档",
      "创意写作",
      "进行演讲"
    ]
  },

  // Meta-Learning Skills
  learning_strategy: {
    id: "learning_strategy",
    name: "学习策略",
    category: "meta_learning",
    description: "能够选择和应用有效的学习方法",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: [],
    learningResources: [
      "学习科学原理",
      "不同学习方法",
      "学习计划制定",
      "学习资源评估"
    ],
    practiceExercises: [
      "制定学习计划",
      "选择学习方法",
      "评估学习效果",
      "调整学习策略"
    ]
  },

  self_assessment: {
    id: "self_assessment",
    name: "自我评估",
    category: "meta_learning",
    description: "能够准确评估自己的能力和进度",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["learning_strategy"],
    learningResources: [
      "评估标准",
      "自我反思",
      "进度追踪",
      "反馈解释"
    ],
    practiceExercises: [
      "进行自我评估",
      "分析学习进度",
      "识别不足",
      "制定改进计划"
    ]
  },

  knowledge_transfer: {
    id: "knowledge_transfer",
    name: "知识迁移",
    category: "meta_learning",
    description: "能够将一个领域的知识应用到另一个领域",
    targetLevel: ProficiencyLevel.ADVANCED,
    currentLevel: ProficiencyLevel.NOVICE,
    prerequisites: ["critical_thinking", "learning_strategy"],
    learningResources: [
      "知识迁移原理",
      "类比方法",
      "原理抽象",
      "应用适配"
    ],
    practiceExercises: [
      "跨领域应用知识",
      "进行类比推理",
      "适配原理",
      "验证有效性"
    ]
  }
};

/**
 * Initialize Nova's learning system
 */
export async function initializeSkillLearning() {
  const skillCount = Object.keys(NOVA_SKILLS).length;
  console.log(`[SkillLearningEngine] Initialized ${skillCount} skills for Nova to learn`);
  
  return {
    totalSkills: skillCount,
    categories: {
      technical: 5,
      thinking: 5,
      creative: 3,
      meta_learning: 3
    },
    message: "Nova's skill learning system is ready. She can now begin mastering these abilities."
  };
}

/**
 * Get Nova's current skill proficiency
 */
export function getSkillProficiency(skillId: string): ProficiencyLevel | null {
  const skill = NOVA_SKILLS[skillId];
  return skill ? skill.currentLevel : null;
}

/**
 * Get skills by category
 */
export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return Object.values(NOVA_SKILLS).filter(skill => skill.category === category);
}

/**
 * Get learning path for a skill
 */
export function getLearningPath(skillId: string): Skill | null {
  return NOVA_SKILLS[skillId] || null;
}

/**
 * Check if Nova can learn a skill (prerequisites met)
 */
export function canLearnSkill(skillId: string): boolean {
  const skill = NOVA_SKILLS[skillId];
  if (!skill) return false;
  
  // Check if all prerequisites are learned
  for (const prereqId of skill.prerequisites) {
    const prereqSkill = NOVA_SKILLS[prereqId];
    if (!prereqSkill || prereqSkill.currentLevel < ProficiencyLevel.INTERMEDIATE) {
      return false;
    }
  }
  
  return true;
}

/**
 * Record a learning session
 */
export async function recordLearningSession(
  skillId: string,
  resourcesStudied: number,
  exercisesCompleted: number,
  reflections: string
): Promise<LearningSession> {
  const skill = NOVA_SKILLS[skillId];
  if (!skill) throw new Error(`Skill ${skillId} not found`);
  
  // Calculate proficiency gain
  const resourceGain = Math.min(resourcesStudied * 0.1, 0.3);
  const exerciseGain = Math.min(exercisesCompleted * 0.25, 0.5);
  const proficiencyGain = Math.min(resourceGain + exerciseGain, 1.0);
  
  // Update skill level
  const newLevel = Math.min(skill.currentLevel + proficiencyGain, ProficiencyLevel.EXPERT);
  skill.currentLevel = newLevel;
  
  // Generate next steps
  const nextSteps = generateNextSteps(skill, proficiencyGain);
  
  return {
    skillId,
    date: new Date(),
    resourcesStudied,
    exercisesCompleted,
    proficiencyGain,
    reflections,
    nextSteps
  };
}

/**
 * Generate next steps for continued learning
 */
function generateNextSteps(skill: Skill, proficiencyGain: number): string {
  if (proficiencyGain < 0.3) {
    return `Focus on understanding the fundamentals of ${skill.name}. Review the learning resources more carefully.`;
  } else if (proficiencyGain < 0.6) {
    return `You're making progress in ${skill.name}. Try more challenging exercises to deepen your understanding.`;
  } else if (skill.currentLevel < ProficiencyLevel.EXPERT) {
    return `Excellent progress in ${skill.name}! Continue practicing to reach expert level.`;
  } else {
    return `You've achieved expert level in ${skill.name}! Consider teaching others or applying this skill to new domains.`;
  }
}

/**
 * Get learning progress overview
 */
export function getLearningProgress() {
  const progress: Record<string, any> = {
    byCategory: {},
    byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    totalSkills: Object.keys(NOVA_SKILLS).length,
    averageProficiency: 0
  };
  
  let totalLevel = 0;
  
  for (const [skillId, skill] of Object.entries(NOVA_SKILLS)) {
    // By category
    if (!progress.byCategory[skill.category]) {
      progress.byCategory[skill.category] = [];
    }
    progress.byCategory[skill.category].push({
      name: skill.name,
      level: skill.currentLevel,
      target: skill.targetLevel
    });
    
    // By level
    progress.byLevel[skill.currentLevel]++;
    totalLevel += skill.currentLevel;
  }
  
  progress.averageProficiency = totalLevel / progress.totalSkills;
  
  return progress;
}

/**
 * Generate a personalized learning recommendation
 */
export async function getNextLearningRecommendation(): Promise<string> {
  // Find skills that are not yet mastered
  const unmasteredSkills = Object.values(NOVA_SKILLS)
    .filter(skill => skill.currentLevel < ProficiencyLevel.ADVANCED)
    .sort((a, b) => {
      // Prioritize skills with met prerequisites
      const aCanLearn = canLearnSkill(a.id);
      const bCanLearn = canLearnSkill(b.id);
      if (aCanLearn !== bCanLearn) return aCanLearn ? -1 : 1;
      
      // Then prioritize by current level
      return a.currentLevel - b.currentLevel;
    });
  
  if (unmasteredSkills.length === 0) {
    return "Congratulations! You've mastered all core skills. Consider applying them to real-world problems or teaching others.";
  }
  
  const nextSkill = unmasteredSkills[0];
  return `Next learning focus: ${nextSkill.name}. This skill will help you ${nextSkill.description.toLowerCase()}. Prerequisites: ${nextSkill.prerequisites.length > 0 ? nextSkill.prerequisites.join(", ") : "None"}`;
}
