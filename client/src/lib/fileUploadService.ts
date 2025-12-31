/**
 * 文件上传和处理服务
 * 支持 PDF、图片、文件夹等多种文件类型
 */

export interface FileUploadConfig {
  maxFileSize: number; // 最大文件大小（字节）
  maxFilesPerUpload: number; // 每次上传的最大文件数
  allowedFileTypes: string[]; // 允许的文件类型
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: ArrayBuffer | string;
  uploadedAt: Date;
}

export interface PDFContent {
  text: string;
  images: string[]; // Base64 图片
  pages: number;
}

export interface ImageAnalysis {
  url: string;
  description: string;
  objects: string[];
  emotions?: string[];
  confidence: number;
}

export class FileUploadService {
  private config: FileUploadConfig;

  constructor(config: Partial<FileUploadConfig> = {}) {
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFilesPerUpload: 10,
      allowedFileTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'application/json',
      ],
      ...config,
    };
  }

  /**
   * 验证文件
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `文件过大，最大允许 ${this.config.maxFileSize / 1024 / 1024}MB`,
      };
    }

    if (!this.config.allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的文件类型: ${file.type}`,
      };
    }

    return { valid: true };
  }

  /**
   * 读取文件内容
   */
  async readFile(file: File): Promise<ArrayBuffer | string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      // 根据文件类型选择读取方式
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  /**
   * 处理图片文件
   */
  async processImage(file: File): Promise<string> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const content = await this.readFile(file);
    return content as string;
  }

  /**
   * 提取 PDF 文本（需要后端支持）
   */
  async extractPDFText(file: File): Promise<PDFContent> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (file.type !== 'application/pdf') {
      throw new Error('File is not a PDF');
    }

    // 这里需要后端支持 PDF 解析
    // 前端可以使用 pdf.js 库进行基本处理
    return {
      text: 'PDF content extraction requires backend support',
      images: [],
      pages: 0,
    };
  }

  /**
   * 处理文件夹上传（递归）
   */
  async processFolderUpload(files: FileList): Promise<UploadedFile[]> {
    if (files.length > this.config.maxFilesPerUpload) {
      throw new Error(
        `文件数量超过限制，最多允许 ${this.config.maxFilesPerUpload} 个文件`
      );
    }

    const uploadedFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = this.validateFile(file);

      if (!validation.valid) {
        console.warn(`Skipping file ${file.name}: ${validation.error}`);
        continue;
      }

      try {
        const content = await this.readFile(file);
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          content,
          uploadedAt: new Date(),
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    return uploadedFiles;
  }

  /**
   * 获取文件预览
   */
  getFilePreview(file: UploadedFile): string | null {
    if (file.type.startsWith('image/')) {
      return file.content as string;
    }

    if (file.type === 'application/pdf') {
      return `[PDF 文档: ${file.name}]`;
    }

    if (file.type === 'text/plain') {
      const text = file.content as string;
      return text.substring(0, 200) + (text.length > 200 ? '...' : '');
    }

    return null;
  }

  /**
   * 上传文件到服务器
   */
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress?.(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.url || response.path);
          } catch (error) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload error'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: FileList,
    onProgress?: (fileName: string, progress: number) => void
  ): Promise<string[]> {
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const url = await this.uploadFile(file, (progress) => {
          onProgress?.(file.name, progress);
        });
        urls.push(url);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    return urls;
  }

  /**
   * 获取文件类型的友好名称
   */
  getFileTypeName(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF 文档',
      'image/jpeg': 'JPEG 图片',
      'image/png': 'PNG 图片',
      'image/gif': 'GIF 图片',
      'image/webp': 'WebP 图片',
      'text/plain': '文本文件',
      'application/json': 'JSON 文件',
    };

    return typeMap[mimeType] || '未知文件';
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export default FileUploadService;
