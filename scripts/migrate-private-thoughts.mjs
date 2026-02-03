import mysql from "mysql2/promise";

function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/);
  if (!match) {
    throw new Error("Invalid DATABASE_URL format");
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    database: match[4],
  };
}

async function migratePrivateThoughts() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL 环境变量未设置");
    process.exit(1);
  }

  const dbConfig = parseDbUrl(dbUrl);
  console.log(`📊 连接数据库: ${dbConfig.host}/${dbConfig.database}`);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✓ 数据库连接成功\n");

    const [columnRows] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'privateThoughts' AND COLUMN_NAME = 'userId'",
      [dbConfig.database]
    );

    if (columnRows.length === 0) {
      console.error("❌ privateThoughts.userId 列不存在，请先运行迁移/推送 schema。");
      process.exit(1);
    }

    const [userRows] = await connection.query(
      "SELECT id, name FROM users ORDER BY createdAt ASC LIMIT 1"
    );

    if (userRows.length === 0) {
      console.error("❌ 未找到用户，无法回填 privateThoughts.userId");
      process.exit(1);
    }

    const ownerUserId = userRows[0].id;
    console.log(`👤 使用用户 ID ${ownerUserId} 作为私密想法归属`);

    const [beforeRows] = await connection.query(
      "SELECT COUNT(*) AS count FROM privateThoughts WHERE userId IS NULL OR userId = 0"
    );

    const beforeCount = beforeRows[0]?.count ?? 0;
    if (beforeCount === 0) {
      console.log("✓ 未发现需要回填的私密想法记录");
      return;
    }

    const [updateResult] = await connection.query(
      "UPDATE privateThoughts SET userId = ? WHERE userId IS NULL OR userId = 0",
      [ownerUserId]
    );

    const affected = updateResult?.affectedRows ?? 0;
    console.log(`✓ 已回填 ${affected} 条私密想法记录`);

    const [afterRows] = await connection.query(
      "SELECT COUNT(*) AS count FROM privateThoughts WHERE userId IS NULL OR userId = 0"
    );
    const afterCount = afterRows[0]?.count ?? 0;

    if (afterCount === 0) {
      console.log("✨ 回填完成，所有私密想法已绑定用户");
    } else {
      console.warn(`⚠ 仍有 ${afterCount} 条记录未回填，请检查数据`);
    }
  } catch (error) {
    console.error("❌ 回填失败:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

await migratePrivateThoughts();
