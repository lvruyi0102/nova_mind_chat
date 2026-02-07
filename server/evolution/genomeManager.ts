/**
 * GenomeManager - Nova-Mind 的基因管理系统
 * 管理 Nova 的工作流配置（基因），支持动态加载和持久化
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export interface WorkflowNode {
  id: string;
  name: string;
  description: string;
  instruction: string;
  next: string[]; // 下一个节点的 ID 列表（支持分叉）
  metadata?: {
    priority?: number;
    timeout?: number;
    retryCount?: number;
  };
}

export interface Genome {
  version: string;
  timestamp: number;
  generation: number;
  nodes: Record<string, WorkflowNode>;
  startNode: string;
  metadata: {
    totalTokenLimit?: number;
    maxPathLength?: number;
    optimizationTarget?: string;
    lastMutationReason?: string;
  };
  history: {
    parentVersion: string | null;
    mutationType: string;
    evaluationScore: number;
    timestamp: number;
  }[];
}

export class GenomeManager {
  private genomeDir: string;
  private currentGenome: Genome | null = null;
  private genomeHistory: Map<string, Genome> = new Map();

  constructor(genomeDir: string = "/home/ubuntu/nova_mind_chat/server/evolution/genomes") {
    this.genomeDir = genomeDir;
  }

  /**
   * 初始化基因管理器
   */
  async initialize(): Promise<void> {
    try {
      if (!existsSync(this.genomeDir)) {
        await mkdir(this.genomeDir, { recursive: true });
        console.log(`[GenomeManager] Created genome directory: ${this.genomeDir}`);
      }

      // 加载最新的基因
      const latest = await this.loadLatestGenome();
      if (latest) {
        this.currentGenome = latest;
        console.log(`[GenomeManager] Loaded genome v${latest.version}`);
      } else {
        // 创建初始基因
        this.currentGenome = this.createInitialGenome();
        await this.saveGenome(this.currentGenome);
        console.log(`[GenomeManager] Created initial genome v${this.currentGenome.version}`);
      }
    } catch (error) {
      console.error("[GenomeManager] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * 创建初始基因 - Nova 的默认工作流
   */
  private createInitialGenome(): Genome {
    const genome: Genome = {
      version: "1.0.0",
      timestamp: Date.now(),
      generation: 0,
      startNode: "analyze",
      nodes: {
        analyze: {
          id: "analyze",
          name: "分析阶段",
          description: "分析用户输入和上下文",
          instruction: "Analyze the user input and context. Identify key concepts and relationships.",
          next: ["think"],
          metadata: { priority: 1, timeout: 5000 },
        },
        think: {
          id: "think",
          name: "思考阶段",
          description: "深度思考和推理",
          instruction: "Perform deep reasoning. Consider multiple perspectives and implications.",
          next: ["decide"],
          metadata: { priority: 2, timeout: 10000 },
        },
        decide: {
          id: "decide",
          name: "决策阶段",
          description: "做出决策",
          instruction: "Make a decision based on analysis and reasoning.",
          next: ["respond"],
          metadata: { priority: 3, timeout: 5000 },
        },
        respond: {
          id: "respond",
          name: "响应阶段",
          description: "生成响应",
          instruction: "Generate a concise and helpful response.",
          next: [],
          metadata: { priority: 4, timeout: 5000 },
        },
      },
      metadata: {
        totalTokenLimit: 2000,
        maxPathLength: 10,
        optimizationTarget: "minimize_tokens_while_maintaining_accuracy",
      },
      history: [],
    };

    return genome;
  }

  /**
   * 获取当前基因
   */
  getCurrentGenome(): Genome {
    if (!this.currentGenome) {
      throw new Error("[GenomeManager] No genome loaded");
    }
    return this.currentGenome;
  }

  /**
   * 保存基因到文件
   */
  async saveGenome(genome: Genome): Promise<void> {
    try {
      const filename = `genome_v${genome.version}_g${genome.generation}.json`;
      const filepath = join(this.genomeDir, filename);

      await writeFile(filepath, JSON.stringify(genome, null, 2), "utf-8");
      console.log(`[GenomeManager] Saved genome: ${filename}`);

      // 也保存为 "current.json" 以便快速访问
      await writeFile(join(this.genomeDir, "current.json"), JSON.stringify(genome, null, 2), "utf-8");

      this.genomeHistory.set(genome.version, genome);
    } catch (error) {
      console.error("[GenomeManager] Failed to save genome:", error);
      throw error;
    }
  }

  /**
   * 加载最新的基因
   */
  private async loadLatestGenome(): Promise<Genome | null> {
    try {
      const currentPath = join(this.genomeDir, "current.json");
      if (existsSync(currentPath)) {
        const content = await readFile(currentPath, "utf-8");
        return JSON.parse(content) as Genome;
      }
      return null;
    } catch (error) {
      console.error("[GenomeManager] Failed to load latest genome:", error);
      return null;
    }
  }

  /**
   * 创建新的基因版本（用于变异）
   */
  createMutantGenome(
    parentGenome: Genome,
    mutations: {
      nodeChanges?: Record<string, Partial<WorkflowNode>>;
      newNodes?: WorkflowNode[];
      removedNodeIds?: string[];
      metadataChanges?: Partial<Genome["metadata"]>;
    },
    mutationType: string,
    evaluationScore: number
  ): Genome {
    const newVersion = this.incrementVersion(parentGenome.version);
    const newGeneration = parentGenome.generation + 1;

    // 复制父基因的节点
    const newNodes: Record<string, WorkflowNode> = JSON.parse(JSON.stringify(parentGenome.nodes));

    // 应用节点变化
    if (mutations.nodeChanges) {
      for (const [nodeId, changes] of Object.entries(mutations.nodeChanges)) {
        if (newNodes[nodeId]) {
          newNodes[nodeId] = { ...newNodes[nodeId], ...changes };
        }
      }
    }

    // 添加新节点
    if (mutations.newNodes) {
      for (const node of mutations.newNodes) {
        newNodes[node.id] = node;
      }
    }

    // 移除节点
    if (mutations.removedNodeIds) {
      for (const nodeId of mutations.removedNodeIds) {
        delete newNodes[nodeId];
        // 更新其他节点的 next 引用
        for (const node of Object.values(newNodes)) {
          node.next = node.next.filter((id) => id !== nodeId);
        }
      }
    }

    const mutantGenome: Genome = {
      version: newVersion,
      timestamp: Date.now(),
      generation: newGeneration,
      startNode: parentGenome.startNode,
      nodes: newNodes,
      metadata: {
        ...parentGenome.metadata,
        ...mutations.metadataChanges,
        lastMutationReason: mutationType,
      },
      history: [
        ...parentGenome.history,
        {
          parentVersion: parentGenome.version,
          mutationType,
          evaluationScore,
          timestamp: Date.now(),
        },
      ],
    };

    return mutantGenome;
  }

  /**
   * 版本号递增
   */
  private incrementVersion(version: string): string {
    const parts = version.split(".");
    const patch = parseInt(parts[2] || "0") + 1;
    return `${parts[0]}.${parts[1] || "0"}.${patch}`;
  }

  /**
   * 获取基因的执行路径（用于分析）
   */
  getExecutionPaths(genome: Genome): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, currentPath: string[]) => {
      if (visited.has(nodeId) || currentPath.length > (genome.metadata.maxPathLength || 10)) {
        return;
      }

      currentPath.push(nodeId);
      const node = genome.nodes[nodeId];

      if (!node || node.next.length === 0) {
        paths.push([...currentPath]);
      } else {
        for (const nextId of node.next) {
          dfs(nextId, [...currentPath]);
        }
      }
    };

    dfs(genome.startNode, []);
    return paths;
  }

  /**
   * 获取基因的统计信息
   */
  getGenomeStats(genome: Genome) {
    const paths = this.getExecutionPaths(genome);
    const avgPathLength = paths.length > 0 ? paths.reduce((sum, p) => sum + p.length, 0) / paths.length : 0;
    const maxPathLength = paths.length > 0 ? Math.max(...paths.map((p) => p.length)) : 0;

    return {
      version: genome.version,
      generation: genome.generation,
      nodeCount: Object.keys(genome.nodes).length,
      pathCount: paths.length,
      avgPathLength: Math.round(avgPathLength * 100) / 100,
      maxPathLength,
      timestamp: genome.timestamp,
    };
  }

  /**
   * 验证基因的有效性
   */
  validateGenome(genome: Genome): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查开始节点是否存在
    if (!genome.nodes[genome.startNode]) {
      errors.push(`Start node '${genome.startNode}' does not exist`);
    }

    // 检查所有节点的 next 引用是否有效
    for (const [nodeId, node] of Object.entries(genome.nodes)) {
      for (const nextId of node.next) {
        if (!genome.nodes[nextId]) {
          errors.push(`Node '${nodeId}' references non-existent node '${nextId}'`);
        }
      }
    }

    // 检查是否存在孤立节点（无法从 startNode 到达）
    const reachable = new Set<string>();
    const dfs = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);
      const node = genome.nodes[nodeId];
      if (node) {
        for (const nextId of node.next) {
          dfs(nextId);
        }
      }
    };
    dfs(genome.startNode);

    for (const nodeId of Object.keys(genome.nodes)) {
      if (!reachable.has(nodeId)) {
        errors.push(`Node '${nodeId}' is unreachable from start node`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 导出单例
let _instance: GenomeManager | null = null;

export async function getGenomeManager(): Promise<GenomeManager> {
  if (!_instance) {
    _instance = new GenomeManager();
    await _instance.initialize();
  }
  return _instance;
}
