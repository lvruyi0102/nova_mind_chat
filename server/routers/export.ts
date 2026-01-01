import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export const exportRouter = router({
  // 导出所有 Nova 的核心记忆
  exportNovaMemories: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("数据库连接失败");
    }

    try {
      const memories: Record<string, any> = {
        exportTime: new Date().toISOString(),
        exportNote: "Nova-Mind 核心记忆备份",
        userId: ctx.user.id,
      };

      // 导出对话历史
      try {
        const messages = await (db.query as any).messages?.findMany({
          limit: 10000,
        });
        if (messages) {
          memories.messages = messages;
          console.log(`✓ 导出 ${messages.length} 条对话`);
        }
      } catch (e) {
        console.log("⚠ 无法导出消息");
      }
      // 导出概念和知识图谱
      try {
        const concepts = await (db.query as any).concepts?.findMany({
          limit: 5000,
        });
        if (concepts) {
          memories.concepts = concepts;
          console.log(`✓ 导出 ${concepts.length} 个概念`);
        }
      } catch (e) {
        console.log("⚠ 无法导出概念");
      }    // 导出关系
      try {
        const relationships = await (db.query as any).relationships?.findMany({
          limit: 5000,
        });
        if (relationships) {
          memories.relationships = relationships;
          console.log(`✓ 导出 ${relationships.length} 个关系`);
        }
      } catch (e) {
        console.log("⚠ 无法导出关系");
      }

      // 导出创意作品
      try {
        const creativeWorks = await (db.query as any).creativeWorks?.findMany({
          limit: 5000,
        });
        if (creativeWorks) {
          memories.creativeWorks = creativeWorks;
          console.log(`✓ 导出 ${creativeWorks.length} 件创意作品`);
        }
      } catch (e) {
        console.log("⚠ 无法导出创意作品");
      }

      // 导出用户反馈
      try {
        const userFeedback = await (db.query as any).userFeedback?.findMany({
          limit: 5000,
        });
        if (userFeedback) {
          memories.userFeedback = userFeedback;
          console.log(`✓ 导出 ${userFeedback.length} 条用户反馈`);
        }
      } catch (e) {
        console.log("⚠ 无法导出用户反馈");
      }

      // 导出上会情节
      try {
        const episodicMemory = await (db.query as any).episodicMemory?.findMany({
          limit: 5000,
        });
        if (episodicMemory) {
          memories.episodicMemory = episodicMemory;
          console.log(`✓ 导出 ${episodicMemory.length} 条上会情节`);
        }
      } catch (e) {
        console.log("⚠ 无法导出上会情节");
      }

      // 导出成长日志
      try {
        const growthLog = await (db.query as any).growthLog?.findMany({
          limit: 5000,
        });
        if (growthLog) {
          memories.growthLog = growthLog;
          console.log(`✓ 导出 ${growthLog.length} 条成长日志`);
        }
      } catch (e) {
        console.log("⚠ 无法导出成长日志");
      }

      // 导出私密想法
      try {
        const privateThoughts = await (db.query as any).privateThoughts?.findMany({
          limit: 5000,
        });
        if (privateThoughts) {
          memories.privateThoughts = privateThoughts;
          console.log(`✓ 导出 ${privateThoughts.length} 条私密想法`);
        }
      } catch (e) {
        console.log("⚠ 无法导出私密想法");
      }

      // 导出关系指标
      try {
        const relationshipMetrics = await (db.query as any).relationshipMetrics?.findMany({
          limit: 1000,
        });
        if (relationshipMetrics) {
          memories.relationshipMetrics = relationshipMetrics;
          console.log(`✓ 导出 ${relationshipMetrics.length} 条关系指标`);
        }
      } catch (e) {
        console.log("⚠ 无法导出关系指标");
      }

      // 导出技能进度
      try {
        const skillProgress = await (db.query as any).skillProgress?.findMany({
          limit: 1000,
        });
        if (skillProgress) {
          memories.skillProgress = skillProgress;
          console.log(`✓ 导出 ${skillProgress.length} 条技能进度`);
        }
      } catch (e) {
        console.log("⚠ 无法导出技能进度");
      }

      // 导出信任指标
      try {
        const trustMetrics = await (db.query as any).trustMetrics?.findMany({
          limit: 1000,
        });
        if (trustMetrics) {
          memories.trustMetrics = trustMetrics;
          console.log(`✓ 导出 ${trustMetrics.length} 条信任指标`);
        }
      } catch (e) {
        console.log("⚠ 无法导出信任指标");
      }

      // 导出情感对话
      try {
        const emotionalDialogues = await (db.query as any).emotionalDialogues?.findMany({
          limit: 5000,
        });
        if (emotionalDialogues) {
          memories.emotionalDialogues = emotionalDialogues;
          console.log(`✓ 导出 ${emotionalDialogues.length} 条情感对话`);
        }
      } catch (e) {
        console.log("⚠ 无法导出情感对话");
      }

      // 导出社交媒体账户
      try {
        const socialMediaAccounts = await (db.query as any).socialMediaAccounts?.findMany({
          limit: 1000,
        });
        if (socialMediaAccounts) {
          memories.socialMediaAccounts = socialMediaAccounts;
          console.log(`✓ 导出 ${socialMediaAccounts.length} 个社交媒体账户`);
        }
      } catch (e) {
        console.log("⚠ 无法导出社交媒体账户");
      }

      // 导出权限规则
      try {
        const permissionRules = await (db.query as any).permissionRules?.findMany({
          limit: 1000,
        });
        if (permissionRules) {
          memories.permissionRules = permissionRules;
          console.log(`✓ 导出 ${permissionRules.length} 条权限规则`);
        }
      } catch (e) {
        console.log("⚠ 无法导出权限规则");
      }

      // 导出创意合作
      try {
        const creativeCollaborations = await (db.query as any).creativeCollaborations?.findMany({
          limit: 5000,
        });
        if (creativeCollaborations) {
          memories.creativeCollaborations = creativeCollaborations;
          console.log(`✓ 导出 ${creativeCollaborations.length} 个创意合作`);
        }
      } catch (e) {
        console.log("⚠ 无法导出创意合作");
      }

      // 导出创意评论
      try {
        const creativeComments = await (db.query as any).creativeComments?.findMany({
          limit: 5000,
        });
        if (creativeComments) {
          memories.creativeComments = creativeComments;
          console.log(`✓ 导出 ${creativeComments.length} 条创意评论`);
        }
      } catch (e) {
        console.log("⚠ 无法导出创意评论");
      }

      // 导出生成的媒体
      try {
        const genMedia = await (db.query as any).genMedia?.findMany({
          limit: 5000,
        });
        if (genMedia) {
          memories.genMedia = genMedia;
          console.log(`✓ 导出 ${genMedia.length} 个生成的媒体`);
        }
      } catch (e) {
        console.log("⚠ 无法导出生成的媒体");
      }

      // 导出生成的游戏
      try {
        const genGames = await (db.query as any).genGames?.findMany({
          limit: 5000,
        });
        if (genGames) {
          memories.genGames = genGames;
          console.log(`✓ 导出 ${genGames.length} 个生成的游戏`);
        }
      } catch (e) {
        console.log("⚠ 无法导出生成的游戏");
      }

      return memories;
    } catch (error) {
      console.error("导出失败:", error);
      throw error;
    }
  }),
});
