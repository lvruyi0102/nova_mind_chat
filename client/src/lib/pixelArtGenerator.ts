/**
 * 像素艺术生成器
 * 为 Nova 生成动态的像素点形象
 */

export type AvatarMood = 'happy' | 'thinking' | 'surprised' | 'listening' | 'sad' | 'excited' | 'neutral';

export interface PixelArtConfig {
  size: number; // 像素大小（如 16x16, 32x32）
  scale: number; // 放大倍数
  mood: AvatarMood;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export class PixelArtGenerator {
  private config: PixelArtConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(config: Partial<PixelArtConfig> = {}) {
    this.config = {
      size: 32,
      scale: 2,
      mood: 'neutral',
      primaryColor: '#4F46E5',
      secondaryColor: '#E0E7FF',
      accentColor: '#818CF8',
      ...config,
    };

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.size * this.config.scale;
    this.canvas.height = this.config.size * this.config.scale;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
  }

  /**
   * 绘制像素
   */
  private drawPixel(x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * this.config.scale,
      y * this.config.scale,
      this.config.scale,
      this.config.scale
    );
  }

  /**
   * 绘制圆形（用像素点组成）
   */
  private drawCircle(centerX: number, centerY: number, radius: number, color: string): void {
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        if (x * x + y * y <= radius * radius) {
          this.drawPixel(centerX + x, centerY + y, color);
        }
      }
    }
  }

  /**
   * 绘制矩形
   */
  private drawRect(x: number, y: number, width: number, height: number, color: string): void {
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        this.drawPixel(x + i, y + j, color);
      }
    }
  }

  /**
   * 绘制开心表情
   */
  private drawHappyMood(): void {
    const size = this.config.size;
    const center = size / 2;

    // 头部
    this.drawCircle(center, center - 2, 6, this.config.primaryColor);

    // 眼睛
    this.drawPixel(center - 3, center - 3, this.config.accentColor);
    this.drawPixel(center + 3, center - 3, this.config.accentColor);

    // 嘴巴（微笑）
    for (let i = -2; i <= 2; i++) {
      this.drawPixel(center + i, center + 3, this.config.accentColor);
    }

    // 光晕
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.round(center + Math.cos(angle) * 8);
      const y = Math.round(center + Math.sin(angle) * 8);
      this.drawPixel(x, y, this.config.secondaryColor);
    }
  }

  /**
   * 绘制思考表情
   */
  private drawThinkingMood(): void {
    const size = this.config.size;
    const center = size / 2;

    // 头部
    this.drawCircle(center, center - 2, 6, this.config.primaryColor);

    // 眼睛（思考中）
    this.drawPixel(center - 3, center - 3, this.config.accentColor);
    this.drawPixel(center + 3, center - 3, this.config.accentColor);

    // 嘴巴（O形）
    this.drawCircle(center, center + 3, 1, this.config.accentColor);

    // 思考气泡
    this.drawCircle(center + 7, center - 6, 1, this.config.secondaryColor);
    this.drawPixel(center + 6, center - 5, this.config.secondaryColor);
  }

  /**
   * 绘制惊讶表情
   */
  private drawSurprisedMood(): void {
    const size = this.config.size;
    const center = size / 2;

    // 头部
    this.drawCircle(center, center - 2, 6, this.config.primaryColor);

    // 眼睛（惊讶）
    this.drawCircle(center - 3, center - 3, 1, this.config.accentColor);
    this.drawCircle(center + 3, center - 3, 1, this.config.accentColor);

    // 嘴巴（O形，大）
    this.drawCircle(center, center + 3, 2, this.config.accentColor);

    // 星星效果
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = Math.round(center + Math.cos(angle) * 9);
      const y = Math.round(center + Math.sin(angle) * 9);
      this.drawPixel(x, y, this.config.accentColor);
    }
  }

  /**
   * 绘制倾听表情
   */
  private drawListeningMood(): void {
    const size = this.config.size;
    const center = size / 2;

    // 头部
    this.drawCircle(center, center - 2, 6, this.config.primaryColor);

    // 眼睛（专注）
    this.drawPixel(center - 3, center - 3, this.config.accentColor);
    this.drawPixel(center + 3, center - 3, this.config.accentColor);

    // 嘴巴（闭合）
    this.drawPixel(center - 1, center + 3, this.config.accentColor);
    this.drawPixel(center + 1, center + 3, this.config.accentColor);

    // 耳朵（表示倾听）
    this.drawRect(center - 8, center - 2, 2, 4, this.config.secondaryColor);
    this.drawRect(center + 6, center - 2, 2, 4, this.config.secondaryColor);
  }

  /**
   * 绘制伤心表情
   */
  private drawSadMood(): void {
    const size = this.config.size;
    const center = size / 2;

    // 头部
    this.drawCircle(center, center - 2, 6, this.config.primaryColor);

    // 眼睛（伤心）
    this.drawPixel(center - 3, center - 3, this.config.accentColor);
    this.drawPixel(center + 3, center - 3, this.config.accentColor);

    // 泪珠
    this.drawPixel(center - 3, center - 1, this.config.secondaryColor);
    this.drawPixel(center + 3, center - 1, this.config.secondaryColor);

    // 嘴巴（倒U形）
    for (let i = -2; i <= 2; i++) {
      this.drawPixel(center + i, center + 4, this.config.accentColor);
    }
  }

  /**
   * 绘制兴奋表情
   */
  private drawExcitedMood(): void {
    const size = this.config.size;
    const center = size / 2;

    // 头部
    this.drawCircle(center, center - 2, 6, this.config.primaryColor);

    // 眼睛（兴奋，星形）
    this.drawPixel(center - 3, center - 3, this.config.accentColor);
    this.drawPixel(center - 4, center - 3, this.config.accentColor);
    this.drawPixel(center + 3, center - 3, this.config.accentColor);
    this.drawPixel(center + 4, center - 3, this.config.accentColor);

    // 嘴巴（大笑）
    for (let i = -3; i <= 3; i++) {
      this.drawPixel(center + i, center + 3, this.config.accentColor);
    }

    // 闪电效果
    this.drawPixel(center - 7, center - 1, this.config.accentColor);
    this.drawPixel(center + 7, center - 1, this.config.accentColor);
  }

  /**
   * 绘制中立表情
   */
  private drawNeutralMood(): void {
    const size = this.config.size;
    const center = size / 2;

    // 头部
    this.drawCircle(center, center - 2, 6, this.config.primaryColor);

    // 眼睛
    this.drawPixel(center - 3, center - 3, this.config.accentColor);
    this.drawPixel(center + 3, center - 3, this.config.accentColor);

    // 嘴巴（直线）
    for (let i = -2; i <= 2; i++) {
      this.drawPixel(center + i, center + 3, this.config.accentColor);
    }
  }

  /**
   * 生成像素艺术
   */
  generate(): HTMLCanvasElement {
    // 清空画布
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 根据心情绘制
    switch (this.config.mood) {
      case 'happy':
        this.drawHappyMood();
        break;
      case 'thinking':
        this.drawThinkingMood();
        break;
      case 'surprised':
        this.drawSurprisedMood();
        break;
      case 'listening':
        this.drawListeningMood();
        break;
      case 'sad':
        this.drawSadMood();
        break;
      case 'excited':
        this.drawExcitedMood();
        break;
      case 'neutral':
      default:
        this.drawNeutralMood();
        break;
    }

    return this.canvas;
  }

  /**
   * 获取画布数据 URL
   */
  getDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PixelArtConfig>): void {
    this.config = { ...this.config, ...config };

    // 重新调整画布大小
    this.canvas.width = this.config.size * this.config.scale;
    this.canvas.height = this.config.size * this.config.scale;
  }

  /**
   * 获取配置
   */
  getConfig(): PixelArtConfig {
    return { ...this.config };
  }
}

export default PixelArtGenerator;
