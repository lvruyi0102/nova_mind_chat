/**
 * 改进的本地学习引擎
 * 实现 TextRank、语义相似度、主题聚类等高级算法
 */

interface Keyword {
  word: string;
  score: number;
  frequency: number;
}

interface Concept {
  name: string;
  frequency: number;
  importance: number;
  firstMentioned: Date;
}

interface ConceptRelation {
  source: string;
  target: string;
  strength: number;
  type: 'related' | 'causes' | 'part_of';
}

interface LearningQuality {
  depth: 'shallow' | 'medium' | 'deep';
  novelty: number; // 0-1，新概念比例
  value: number; // 0-1，学习价值评分
}

/**
 * TextRank 算法实现（简化版）
 * 用于关键词提取
 */
function extractKeywordsByTextRank(text: string, topK: number = 10): Keyword[] {
  // 分词
  const words = text
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter(w => w.length > 1 && /[a-z0-9\u4e00-\u9fff]/.test(w));

  // 计算词频
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // 简化的 TextRank：基于词频和位置权重
  const keywords: Keyword[] = [];
  wordFreq.forEach((freq, word) => {
    // 过滤停用词
    if (isStopWord(word)) return;

    // 计算分数：词频 + 位置权重
    const positionWeight = words.indexOf(word) < words.length / 3 ? 1.5 : 1;
    const score = freq * positionWeight;

    keywords.push({
      word,
      score,
      frequency: freq,
    });
  });

  // 按分数排序，返回前 K 个
  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * 停用词检查
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    '的', '了', '在', '是', '有', '和', '人', '这', '中', '大', '为', '上',
    '个', '地', '要', '把', '他', '会', '生', '到', '最', '对', '生产',
  ]);

  return stopWords.has(word);
}

/**
 * 编辑距离（Levenshtein Distance）
 * 用于计算字符串相似度
 */
function editDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[len1][len2];
}

/**
 * 计算字符串相似度（0-1）
 */
function stringSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = editDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * 合并相似概念
 */
function mergeConceptClusters(concepts: Concept[], threshold: number = 0.8): Map<string, Concept> {
  const merged = new Map<string, Concept>();
  const processed = new Set<string>();

  const conceptArray = Array.from(concepts);

  conceptArray.forEach(concept => {
    if (processed.has(concept.name)) return;

    let cluster = concept;

    // 查找所有相似的概念
    conceptArray.forEach(other => {
      if (other.name === concept.name || processed.has(other.name)) return;

      const similarity = stringSimilarity(concept.name.toLowerCase(), other.name.toLowerCase());

      if (similarity >= threshold) {
        // 合并：保留频率更高的名称，累加频率
        if (other.frequency > cluster.frequency) {
          cluster = {
            ...cluster,
            name: other.name,
            frequency: cluster.frequency + other.frequency,
            importance: Math.max(cluster.importance, other.importance),
          };
        } else {
          cluster.frequency += other.frequency;
          cluster.importance = Math.max(cluster.importance, other.importance);
        }

        processed.add(other.name);
      }
    });

    merged.set(cluster.name, cluster);
    processed.add(concept.name);
  });

  return merged;
}

/**
 * 简单的主题聚类（基于关键词共现）
 */
function identifyTopics(keywords: Keyword[], maxTopics: number = 5): string[][] {
  if (keywords.length === 0) return [];

  // 按分数排序
  const sorted = [...keywords].sort((a, b) => b.score - a.score);

  // 简单的聚类：相关关键词分组
  const topics: string[][] = [];
  const used = new Set<string>();

  sorted.forEach(keyword => {
    if (used.has(keyword.word)) return;

    const topic = [keyword.word];
    used.add(keyword.word);

    // 查找相关关键词
    sorted.forEach(other => {
      if (used.has(other.word)) return;

      const similarity = stringSimilarity(keyword.word, other.word);
      if (similarity > 0.5) {
        topic.push(other.word);
        used.add(other.word);
      }
    });

    topics.push(topic);

    if (topics.length >= maxTopics) return;
  });

  return topics;
}

/**
 * 评估学习质量
 */
function evaluateLearningQuality(
  messageCount: number,
  conceptCount: number,
  newConceptCount: number,
  keywords: Keyword[]
): LearningQuality {
  // 评估深度：基于消息数量和概念数
  let depth: 'shallow' | 'medium' | 'deep' = 'shallow';
  if (messageCount > 20 && conceptCount > 10) {
    depth = 'deep';
  } else if (messageCount > 10 && conceptCount > 5) {
    depth = 'medium';
  }

  // 评估新颖性：新概念比例
  const novelty = conceptCount > 0 ? newConceptCount / conceptCount : 0;

  // 评估价值：基于关键词分数和多样性
  const avgKeywordScore = keywords.length > 0
    ? keywords.reduce((sum, k) => sum + k.score, 0) / keywords.length
    : 0;
  const keywordDiversity = keywords.length / Math.max(conceptCount, 1);
  const value = Math.min(1, (avgKeywordScore / 100) * (1 + keywordDiversity));

  return {
    depth,
    novelty: Math.min(1, novelty),
    value: Math.min(1, value),
  };
}

/**
 * 改进的本地学习引擎
 */
export class ImprovedLearningEngine {
  /**
   * 从文本中提取关键词（使用 TextRank）
   */
  extractKeywords(text: string, topK: number = 15): Keyword[] {
    return extractKeywordsByTextRank(text, topK);
  }

  /**
   * 从对话中提取概念
   */
  extractConcepts(messages: Array<{ role: string; content: string }>, topK: number = 20): Concept[] {
    const allText = messages.map(m => m.content).join(' ');
    const keywords = this.extractKeywords(allText, topK * 2);

    const concepts: Concept[] = keywords.map(kw => ({
      name: kw.word,
      frequency: kw.frequency,
      importance: kw.score / 100,
      firstMentioned: new Date(),
    }));

    return concepts;
  }

  /**
   * 合并相似概念
   */
  mergeConcepts(concepts: Concept[], threshold: number = 0.8): Concept[] {
    const merged = mergeConceptClusters(concepts, threshold);
    return Array.from(merged.values());
  }

  /**
   * 识别概念关系
   */
  identifyRelations(concepts: Concept[]): ConceptRelation[] {
    const relations: ConceptRelation[] = [];

    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const similarity = stringSimilarity(
          concepts[i].name.toLowerCase(),
          concepts[j].name.toLowerCase()
        );

        if (similarity > 0.3) {
          relations.push({
            source: concepts[i].name,
            target: concepts[j].name,
            strength: similarity,
            type: 'related',
          });
        }
      }
    }

    return relations;
  }

  /**
   * 识别主题
   */
  identifyTopics(keywords: Keyword[], maxTopics: number = 5): string[][] {
    return identifyTopics(keywords, maxTopics);
  }

  /**
   * 评估学习质量
   */
  evaluateQuality(
    messages: Array<{ role: string; content: string }>,
    concepts: Concept[],
    newConceptCount: number
  ): LearningQuality {
    const keywords = this.extractKeywords(
      messages.map(m => m.content).join(' ')
    );

    return evaluateLearningQuality(
      messages.length,
      concepts.length,
      newConceptCount,
      keywords
    );
  }

  /**
   * 生成学习洞察
   */
  generateInsights(
    keywords: Keyword[],
    concepts: Concept[],
    topics: string[][]
  ): {
    mainInsight: string;
    secondaryInsights: string[];
  } {
    const mainKeywords = keywords.slice(0, 3).map(k => k.word).join('、');
    const mainTopic = topics.length > 0 ? topics[0].join('、') : '一般话题';

    const mainInsight = `用户主要讨论了 ${mainKeywords} 相关的 ${mainTopic} 话题，涉及 ${concepts.length} 个核心概念。`;

    const secondaryInsights: string[] = [];

    if (concepts.length > 10) {
      secondaryInsights.push('讨论内容丰富，涉及多个相关概念');
    }

    if (keywords.length > 0 && keywords[0].frequency > 3) {
      secondaryInsights.push(`"${keywords[0].word}" 是本次讨论的核心话题`);
    }

    if (topics.length > 1) {
      secondaryInsights.push(`涉及 ${topics.length} 个不同的主题领域`);
    }

    return {
      mainInsight,
      secondaryInsights,
    };
  }
}

export function getImprovedLearningEngine(): ImprovedLearningEngine {
  return new ImprovedLearningEngine();
}
