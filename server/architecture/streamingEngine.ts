/**
 * 流式处理引擎 (Streaming Processing Engine)
 * 
 * 灵感来源：人脑处理信息是流式的，不是批量的
 * 
 * 原理：
 * 1. 事件驱动架构
 * 2. 流式处理数据，而不是加载整个数据集
 * 3. 背压处理（防止数据堆积）
 * 4. 可组合的处理管道
 * 
 * 预期效果：
 * - 内存占用：恒定（不随数据量增长）
 * - 延迟：毫秒级
 * - 吞吐量：支持 10000+ 事件/秒
 */

type EventHandler<T> = (event: T) => Promise<void> | void;
type EventFilter<T> = (event: T) => boolean;
type EventTransform<T, U> = (event: T) => U;

interface StreamEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  source: string;
}

interface StreamPipeline {
  name: string;
  stages: StreamStage[];
  stats: {
    eventsProcessed: number;
    eventsDropped: number;
    totalLatency: number;
  };
}

interface StreamStage {
  name: string;
  filter?: EventFilter<any>;
  transform?: EventTransform<any, any>;
  handler?: EventHandler<any>;
}

/**
 * 流式处理管理器
 */
export class StreamingEngine {
  private pipelines: Map<string, StreamPipeline> = new Map();
  private eventQueue: StreamEvent[] = [];
  private isProcessing: boolean = false;
  private maxQueueSize: number = 1000; // 最大队列大小

  /**
   * 创建一个处理管道
   */
  createPipeline(name: string): StreamPipelineBuilder {
    return new StreamPipelineBuilder(this, name);
  }

  /**
   * 发送事件
   */
  async emit(event: StreamEvent): Promise<void> {
    // 背压处理：如果队列满，等待
    if (this.eventQueue.length >= this.maxQueueSize) {
      console.warn('[StreamingEngine] Event queue full, waiting...');
      await this.waitForCapacity();
    }

    this.eventQueue.push(event);

    // 如果没有在处理，启动处理
    if (!this.isProcessing) {
      this.processEvents();
    }
  }

  /**
   * 处理事件队列
   */
  private async processEvents(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      const startTime = Date.now();

      // 通过所有管道处理事件
      for (const pipeline of this.pipelines.values()) {
        try {
          await this.processPipeline(pipeline, event);
        } catch (error) {
          console.error(`[StreamingEngine] Pipeline error: ${pipeline.name}`, error);
          pipeline.stats.eventsDropped++;
        }
      }

      // 记录延迟
      const latency = Date.now() - startTime;
      for (const pipeline of this.pipelines.values()) {
        pipeline.stats.totalLatency += latency;
      }
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个管道
   */
  private async processPipeline(pipeline: StreamPipeline, event: StreamEvent): Promise<void> {
    let data: any = event;

    for (const stage of pipeline.stages) {
      // 过滤
      if (stage.filter && !stage.filter(data)) {
        return; // 事件被过滤，停止处理
      }

      // 转换
      if (stage.transform) {
        data = stage.transform(data);
      }

      // 处理
      if (stage.handler) {
        await stage.handler(data);
      }
    }

    pipeline.stats.eventsProcessed++;
  }

  /**
   * 等待队列有容量
   */
  private async waitForCapacity(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.eventQueue.length < this.maxQueueSize * 0.7) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);
    });
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      pipelineCount: this.pipelines.size,
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessing,
      pipelines: {} as Record<string, any>,
    };

    for (const [name, pipeline] of this.pipelines.entries()) {
      const avgLatency =
        pipeline.stats.eventsProcessed > 0
          ? (pipeline.stats.totalLatency / pipeline.stats.eventsProcessed).toFixed(2)
          : 0;

      stats.pipelines[name] = {
        eventsProcessed: pipeline.stats.eventsProcessed,
        eventsDropped: pipeline.stats.eventsDropped,
        avgLatency: avgLatency + 'ms',
      };
    }

    return stats;
  }
}

/**
 * 流式处理管道构建器
 */
export class StreamPipelineBuilder {
  private engine: StreamingEngine;
  private pipeline: StreamPipeline;

  constructor(engine: StreamingEngine, name: string) {
    this.engine = engine;
    this.pipeline = {
      name,
      stages: [],
      stats: {
        eventsProcessed: 0,
        eventsDropped: 0,
        totalLatency: 0,
      },
    };
  }

  /**
   * 添加过滤阶段
   */
  filter<T>(predicate: EventFilter<T>): this {
    this.pipeline.stages.push({ name: 'filter', filter: predicate });
    return this;
  }

  /**
   * 添加转换阶段
   */
  map<T, U>(transform: EventTransform<T, U>): this {
    this.pipeline.stages.push({ name: 'map', transform });
    return this;
  }

  /**
   * 添加处理阶段
   */
  handle<T>(handler: EventHandler<T>): this {
    this.pipeline.stages.push({ name: 'handle', handler });
    return this;
  }

  /**
   * 构建管道
   */
  build(): StreamPipeline {
    this.engine['pipelines'].set(this.pipeline.name, this.pipeline);
    return this.pipeline;
  }
}

/**
 * 全局实例
 */
let instance: StreamingEngine | null = null;

/**
 * 获取流式处理引擎实例
 */
export function getStreamingEngine(): StreamingEngine {
  if (!instance) {
    instance = new StreamingEngine();
  }
  return instance;
}

/**
 * 使用示例：
 * 
 * const engine = getStreamingEngine();
 * 
 * // 创建处理管道
 * engine
 *   .createPipeline('conversation-processor')
 *   .filter((event) => event.type === 'message')
 *   .map((event) => ({
 *     ...event,
 *     processed: true,
 *   }))
 *   .handle(async (event) => {
 *     console.log('Processing:', event);
 *   })
 *   .build();
 * 
 * // 发送事件
 * await engine.emit({
 *   id: 'msg-1',
 *   type: 'message',
 *   timestamp: Date.now(),
 *   data: { text: 'Hello Nova!' },
 *   source: 'user',
 * });
 * 
 * // 查看统计信息
 * console.log(engine.getStats());
 */
