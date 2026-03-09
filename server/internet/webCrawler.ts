/**
 * Web Crawler Module
 * 
 * 互联网爬虫模块，支持：
 * 1. 网页内容抓取
 * 2. 搜索引擎查询
 * 3. 内容解析和提取
 * 4. 智能摘要生成
 * 5. 学习内容存储
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { invokeLLM } from "../_core/llm";

export interface WebPage {
  url: string;
  title: string;
  content: string;
  summary: string;
  keywords: string[];
  fetchedAt: Date;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface LearningContent {
  id: string;
  source: string;
  title: string;
  content: string;
  summary: string;
  keywords: string[];
  importance: number; // 0-1
  learnedAt: Date;
  category: string;
}

/**
 * 网页爬虫
 */
export class WebCrawler {
  private readonly timeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  /**
   * 抓取网页内容
   */
  async fetchWebPage(url: string): Promise<WebPage | null> {
    try {
      // 验证 URL
      if (!this.isValidUrl(url)) {
        console.warn("[WebCrawler] Invalid URL:", url);
        return null;
      }

      // 抓取网页
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.status !== 200) {
        console.warn("[WebCrawler] Failed to fetch URL:", url, response.status);
        return null;
      }

      // 解析 HTML
      const $ = cheerio.load(response.data);

      // 提取标题
      const title =
        $("title").text() ||
        $("h1").first().text() ||
        "Untitled";

      // 提取主要内容
      const content = this.extractMainContent($);

      // 生成摘要
      const summary = await this.generateSummary(content);

      // 提取关键词
      const keywords = this.extractKeywords(content);

      return {
        url,
        title,
        content,
        summary,
        keywords,
        fetchedAt: new Date(),
      };
    } catch (error) {
      console.error("[WebCrawler] Failed to fetch page:", url, error);
      return null;
    }
  }

  /**
   * 执行搜索查询
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // 使用 DuckDuckGo 作为搜索引擎（无需 API 密钥）
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const response = await axios.get(searchUrl, {
        timeout: this.timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      // 解析搜索结果
      $(".result").each((index, element) => {
        if (results.length >= limit) return;

        const titleElem = $(element).find(".result__title a");
        const snippetElem = $(element).find(".result__snippet");

        const title = titleElem.text().trim();
        const url = titleElem.attr("href") || "";
        const snippet = snippetElem.text().trim();

        if (title && url) {
          results.push({
            title,
            url,
            snippet,
            source: "DuckDuckGo",
          });
        }
      });

      return results;
    } catch (error) {
      console.error("[WebCrawler] Search failed:", query, error);
      return [];
    }
  }

  /**
   * 提取主要内容
   */
  private extractMainContent($: cheerio.CheerioAPI): string {
    // 移除脚本和样式
    $("script").remove();
    $("style").remove();
    $("nav").remove();
    $("footer").remove();

    // 提取主要内容
    let content = "";

    // 尝试找到主要内容区域
    const mainContent =
      $("main").html() ||
      $("article").html() ||
      $(".content").html() ||
      $(".post").html() ||
      $("body").html();

    if (mainContent) {
      const $ = cheerio.load(mainContent);
      // 移除链接和其他不必要的元素
      $("a").each((i, elem) => {
        $(elem).replaceWith($(elem).text());
      });
      content = $.text().trim();
    }

    // 清理文本
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim();

    return content.substring(0, 5000); // 限制长度
  }

  /**
   * 生成内容摘要
   */
  private async generateSummary(content: string): Promise<string> {
    if (!content || content.length < 100) {
      return content;
    }

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "你是一个内容摘要专家。请用 1-2 句话总结以下内容的核心要点。",
          },
          {
            role: "user",
            content: content.substring(0, 2000),
          },
        ],
      });

      const summary = typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : content.substring(0, 200);

      return summary;
    } catch (error) {
      console.error("[WebCrawler] Failed to generate summary:", error);
      return content.substring(0, 200);
    }
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 简单的关键词提取：按频率统计单词
    const words = content
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);

    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    // 获取最频繁的 5 个单词
    const keywords = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * 验证 URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 互联网学习管理器
 */
export class InternetLearningManager {
  private learningContents: Map<string, LearningContent> = new Map();
  private webCrawler: WebCrawler;

  constructor() {
    this.webCrawler = new WebCrawler();
  }

  /**
   * 从 URL 学习
   */
  async learnFromUrl(url: string, category: string = "general"): Promise<LearningContent | null> {
    try {
      const webpage = await this.webCrawler.fetchWebPage(url);
      if (!webpage) {
        return null;
      }

      // 评估重要性
      const importance = this.evaluateImportance(webpage.content);

      const learningContent: LearningContent = {
        id: `learn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: url,
        title: webpage.title,
        content: webpage.content,
        summary: webpage.summary,
        keywords: webpage.keywords,
        importance,
        learnedAt: new Date(),
        category,
      };

      this.learningContents.set(learningContent.id, learningContent);
      return learningContent;
    } catch (error) {
      console.error("[InternetLearningManager] Failed to learn from URL:", error);
      return null;
    }
  }

  /**
   * 搜索并学习
   */
  async searchAndLearn(query: string, category: string = "search"): Promise<LearningContent[]> {
    try {
      const results = await this.webCrawler.search(query, 3);
      const learningContents: LearningContent[] = [];

      for (const result of results) {
        const content = await this.learnFromUrl(result.url, category);
        if (content) {
          learningContents.push(content);
        }
      }

      return learningContents;
    } catch (error) {
      console.error("[InternetLearningManager] Failed to search and learn:", error);
      return [];
    }
  }

  /**
   * 评估内容重要性
   */
  private evaluateImportance(content: string): number {
    // 简单的重要性评估：基于内容长度和结构
    let importance = 0.5;

    // 长内容更重要
    if (content.length > 2000) {
      importance += 0.2;
    }

    // 包含数字和数据的内容更重要
    if (/\d+/.test(content)) {
      importance += 0.1;
    }

    // 包含引号或引用的内容更重要
    if (/".*?"/.test(content) || /『.*?』/.test(content)) {
      importance += 0.1;
    }

    return Math.min(importance, 1);
  }

  /**
   * 获取学习内容
   */
  getLearningContent(id: string): LearningContent | undefined {
    return this.learningContents.get(id);
  }

  /**
   * 获取所有学习内容
   */
  getAllLearningContents(): LearningContent[] {
    return Array.from(this.learningContents.values());
  }

  /**
   * 按类别获取学习内容
   */
  getLearningContentsByCategory(category: string): LearningContent[] {
    return Array.from(this.learningContents.values()).filter(
      (c) => c.category === category
    );
  }

  /**
   * 获取重要的学习内容
   */
  getImportantLearningContents(threshold: number = 0.7): LearningContent[] {
    return Array.from(this.learningContents.values())
      .filter((c) => c.importance >= threshold)
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * 获取学习统计
   */
  getStats(): {
    totalLearned: number;
    byCategory: Record<string, number>;
    averageImportance: number;
  } {
    const contents = Array.from(this.learningContents.values());
    const byCategory: Record<string, number> = {};

    for (const content of contents) {
      byCategory[content.category] = (byCategory[content.category] || 0) + 1;
    }

    const averageImportance =
      contents.length > 0
        ? contents.reduce((sum, c) => sum + c.importance, 0) / contents.length
        : 0;

    return {
      totalLearned: contents.length,
      byCategory,
      averageImportance,
    };
  }

  /**
   * 清空学习内容
   */
  clear(): void {
    this.learningContents.clear();
  }
}
