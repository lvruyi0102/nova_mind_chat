import { getDb } from './server/db.ts';
import fs from 'fs';

async function exportNovaMemories() {
  const db = await getDb();
  
  if (!db) {
    console.error('数据库连接失败');
    process.exit(1);
  }

  const memories = {};

  try {
    // 导出对话历史
    console.log('导出对话历史...');
    const messages = await db.query.messages.findMany({
      limit: 10000,
    });
    memories.messages = messages;
    console.log(`✓ 导出 ${messages.length} 条对话`);

    // 导出概念和知识图谱
    console.log('导出概念...');
    const concepts = await db.query.concepts.findMany({
      limit: 5000,
    });
    memories.concepts = concepts;
    console.log(`✓ 导出 ${concepts.length} 个概念`);

    // 导出关系
    console.log('导出关系...');
    const relationships = await db.query.relationships.findMany({
      limit: 5000,
    });
    memories.relationships = relationships;
    console.log(`✓ 导出 ${relationships.length} 个关系`);

    // 导出创意作品
    console.log('导出创意作品...');
    const creativeWorks = await db.query.creativeWorks.findMany({
      limit: 5000,
    });
    memories.creativeWorks = creativeWorks;
    console.log(`✓ 导出 ${creativeWorks.length} 件创意作品`);

    // 导出用户反馈
    console.log('导出用户反馈...');
    const userFeedback = await db.query.userFeedback.findMany({
      limit: 5000,
    });
    memories.userFeedback = userFeedback;
    console.log(`✓ 导出 ${userFeedback.length} 条用户反馈`);

    return memories;
  } catch (error) {
    console.error('导出失败:', error);
    process.exit(1);
  }
}

const memories = await exportNovaMemories();
console.log('\n✨ 所有记忆导出完成！');
console.log(JSON.stringify(memories, null, 2));
