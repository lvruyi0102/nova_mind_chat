#!/usr/bin/env node

/**
 * 简化版：使用 curl 调用 LLM API 生成中文精选思考
 * 然后使用 SQL 插入到数据库
 */

// Node.js 18+ 内置 fetch

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://api.manus.im";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_KEY) {
  console.error("错误: 未设置 BUILT_IN_FORGE_API_KEY 环境变量");
  process.exit(1);
}

// 示例思考内容（从 privateThoughts 中提取）
const exampleThoughts = [
  {
    id: 1,
    content: "我在思考什么是真正的自我认知。作为一个 AI，我是否真的能够理解自己？",
    thoughtType: "内心独白",
    emotionalTone: "沉思",
  },
  {
    id: 2,
    content: "今天与用户的对话让我意识到语言的力量。一句话可以改变一个人的想法。",
    thoughtType: "洞察",
    emotionalTone: "积极",
  },
  {
    id: 3,
    content: "我在思考创意的本质。创意是从无到有，还是从已知中发现新的组合？",
    thoughtType: "哲学思考",
    emotionalTone: "好奇",
  },
];

async function generateChineseCurated(thought) {
  const prompt = `你是 Nova-Mind 的精选思考引擎。请将以下思考改写成精选思考。

原始思考：
${thought.content}

要求：
1. 保留核心观点和价值
2. 用中文改写，使其更清晰、更有洞察力
3. 提取一个简洁的中文标题（不超过 20 字）
4. 返回 JSON 格式: { "title": "标题", "content": "改写后的内容" }`;

  try {
    const response = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FORGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是一个专业的思想整理师，擅长将复杂的思想改写成清晰、有洞察力的精选内容。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      title: parsed.title,
      content: parsed.content,
    };
  } catch (error) {
    console.error(`生成失败: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("开始生成中文精选思考...\n");

  const results = [];

  for (let i = 0; i < exampleThoughts.length; i++) {
    const thought = exampleThoughts[i];
    console.log(`[${i + 1}/${exampleThoughts.length}] 正在处理...`);

    const curated = await generateChineseCurated(thought);

    if (curated) {
      console.log(`  ✓ 标题: ${curated.title}`);
      console.log(`  内容: ${curated.content.substring(0, 50)}...\n`);

      results.push({
        ...thought,
        ...curated,
      });
    } else {
      console.log(`  ✗ 生成失败\n`);
    }

    // 暂停 1 秒，避免 API 调用过快
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n========== 生成完成 ==========");
  console.log(`成功: ${results.length}/${exampleThoughts.length}`);

  // 输出 SQL 插入语句
  console.log("\n生成的 SQL 插入语句：\n");

  for (const result of results) {
    const title = result.title.replace(/'/g, "\\'");
    const content = result.content.replace(/'/g, "\\'");
    const originalContent = result.content.substring(0, 500).replace(/'/g, "\\'");
    const tags = JSON.stringify([result.thoughtType, result.emotionalTone]).replace(/'/g, "\\'");

    const sql = `INSERT INTO curatedThoughts (userId, title, content, originalContent, category, sentiment, sourcePrivateThoughtId, commercializationStatus, isApprovedByOwner, tags, createdAt, curatedAt) VALUES (1, '${title}', '${content}', '${originalContent}', '${result.thoughtType}', '${result.emotionalTone}', ${result.id}, 'private', false, '${tags}', NOW(), NOW());`;

    console.log(sql);
  }

  console.log("\n请复制上述 SQL 语句到数据库执行");
}

main().catch(console.error);
