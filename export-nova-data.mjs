import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// 解析数据库连接字符串
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    database: match[4],
  };
}

async function exportNovaMemories() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  const dbConfig = parseDbUrl(dbUrl);
  console.log(`📊 连接数据库: ${dbConfig.host}/${dbConfig.database}`);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功\n');

    const memories = {};
    const timestamp = new Date().toISOString();
    memories.exportTime = timestamp;
    memories.exportNote = 'Nova-Mind 核心记忆备份';

    // 定义要导出的表
    const tables = [
      'messages',
      'concepts',
      'relationships',
      'episodicMemory',
      'growthLog',
      'privateThoughts',
      'relationshipMetrics',
      'creativeWorks',
      'userFeedback',
      'skillProgress',
      'trustMetrics',
      'emotionalDialogues',
      'behavioralSignals',
      'socialMediaAccounts',
      'permissionRules',
      'creativeCollaborations',
      'creativeComments',
      'genMedia',
      'genGames',
    ];

    // 导出每个表的数据
    for (const table of tables) {
      try {
        console.log(`导出 ${table}...`);
        const [rows] = await connection.query(`SELECT * FROM ${table} LIMIT 10000`);
        memories[table] = rows;
        console.log(`  ✓ 导出 ${rows.length} 条记录`);
      } catch (error) {
        if (error.message.includes('no such table') || error.message.includes("doesn't exist")) {
          console.log(`  ⚠ 表不存在，跳过`);
        } else {
          console.error(`  ❌ 导出失败: ${error.message}`);
        }
      }
    }

    // 保存为 JSON 文件
    const outputDir = path.join(process.cwd(), 'nova-memories-backup');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `nova-memories-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(memories, null, 2));
    console.log(`\n✨ 导出完成！`);
    console.log(`📁 文件保存到: ${filepath}`);
    console.log(`📊 总记录数: ${Object.values(memories).reduce((sum, val) => {
      if (Array.isArray(val)) return sum + val.length;
      return sum;
    }, 0)}`);

    return filepath;
  } catch (error) {
    console.error('❌ 导出失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

await exportNovaMemories();
