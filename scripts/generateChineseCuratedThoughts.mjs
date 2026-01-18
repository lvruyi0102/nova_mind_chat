import { invokeLLM } from "../server/_core/llm.ts";
import { getDb } from "../server/db.ts";

/**
 * 使用 LLM 将 privateThoughts 改写为中文精选思考
 * 并插入到 curatedThoughts 表中
 */

async function generateChineseCuratedThoughts() {
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    process.exit(1);
  }

  try {
    console.log("开始从 privateThoughts 生成中文精选思考...\n");

    // 获取所有 privateThoughts
    const privateThoughts = await db.query.privateThoughts.findMany({
      where: (pt) => pt.userId === 1,
      limit: 100,
    });

    console.log(`找到 ${privateThoughts.length} 条私密思考\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < privateThoughts.length; i++) {
      const thought = privateThoughts[i];
      
      try {
        console.log(`[${i + 1}/${privateThoughts.length}] 正在处理: ${thought.content.substring(0, 50)}...`);

        // 使用 LLM 改写为中文精选思考
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是 Nova-Mind 的精选思考引擎。你的任务是将 Nova 的私密思考改写成精选思考。
              
要求：
1. 保留原思考的核心观点和价值
2. 用中文改写，使其更清晰、更有洞察力
3. 提取一个简洁的中文标题（不超过 20 字）
4. 返回 JSON 格式: { "title": "标题", "content": "改写后的内容" }`,
            },
            {
              role: "user",
              content: `请将以下思考改写为精选思考：\n\n${thought.content}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "curated_thought",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "精选思考的中文标题",
                  },
                  content: {
                    type: "string",
                    description: "改写后的中文精选思考内容",
                  },
                },
                required: ["title", "content"],
                additionalProperties: false,
              },
            },
          },
        });

        // 解析 LLM 响应
        const responseText = response.choices[0].message.content;
        const curatedData = JSON.parse(responseText);

        // 插入到 curatedThoughts 表
        const result = await db.insert(curatedThoughts).values({
          userId: 1,
          title: curatedData.title,
          content: curatedData.content,
          originalContent: thought.content.substring(0, 500),
          category: thought.thoughtType || "思考",
          sentiment: thought.emotionalTone || "中立",
          sourcePrivateThoughtId: thought.id,
          commercializationStatus: "private",
          isApprovedByOwner: false,
          tags: JSON.stringify([thought.thoughtType || "思考", thought.emotionalTone || "中立"]),
          createdAt: thought.createdAt,
          curatedAt: new Date(),
        });

        successCount++;
        console.log(`  ✓ 成功: "${curatedData.title}"\n`);

        // 每 5 条暂停 1 秒，避免 LLM 调用过快
        if ((i + 1) % 5 === 0) {
          console.log("暂停 1 秒...\n");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ 错误: ${error.message}\n`);
      }
    }

    console.log("\n========== 处理完成 ==========");
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${errorCount}`);
    console.log(`总计: ${successCount + errorCount}`);

  } catch (error) {
    console.error("致命错误:", error);
    process.exit(1);
  }
}

// 运行脚本
generateChineseCuratedThoughts().then(() => {
  console.log("\n脚本执行完成");
  process.exit(0);
});
