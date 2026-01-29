/**
 * FileUploadPanel 组件
 * 支持 PDF、图片、文件夹的上传界面
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, FileText, Image as ImageIcon, Folder } from 'lucide-react';
import FileUploadService from '@/lib/fileUploadService';

interface UploadedFileInfo {
  name: string;
  type: string;
  size: number;
  preview?: string;
  progress: number;
}

interface FileUploadPanelProps {
  onFilesUploaded?: (files: UploadedFileInfo[]) => void;
  onAnalysisComplete?: (analysis: any) => void;
  disabled?: boolean;
}

export const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  onFilesUploaded,
  onAnalysisComplete,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef(new FileUploadService());

  // 处理文件选择
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const newFiles: UploadedFileInfo[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = serviceRef.current.validateFile(file);

        if (!validation.valid) {
          setError(validation.error || '文件验证失败');
          continue;
        }

        const fileInfo: UploadedFileInfo = {
          name: file.name,
          type: file.type,
          size: file.size,
          progress: 0,
        };

        // 获取预览
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileInfo.preview = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        }

        newFiles.push(fileInfo);
      }

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      onFilesUploaded?.(newFiles);

      // 模拟上传进度
      for (let i = 0; i < newFiles.length; i++) {
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          setUploadedFiles((prev) => {
            const updated = [...prev];
            const index = prev.length - newFiles.length + i;
            if (updated[index]) {
              updated[index].progress = Math.min(progress, 100);
            }
            return updated;
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  // 触发文件选择
  const handleClickFileInput = () => {
    fileInputRef.current?.click();
  };

  // 触发文件夹选择
  const handleClickFolderInput = () => {
    folderInputRef.current?.click();
  };

  // 移除文件
  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 清空所有文件
  const handleClearAll = () => {
    setUploadedFiles([]);
    setError(null);
  };

  // 获取文件图标
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (type === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <h3 className="text-lg font-semibold mb-4">上传文件</h3>

      {/* 上传按钮 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button
          onClick={handleClickFileInput}
          disabled={disabled || isUploading}
          variant="outline"
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          选择文件
        </Button>

        <Button
          onClick={handleClickFolderInput}
          disabled={disabled || isUploading}
          variant="outline"
          className="w-full"
        >
          <Folder className="w-4 h-4 mr-2" />
          选择文件夹
        </Button>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.json"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      <input
        ref={folderInputRef}
        type="file"
        multiple
        webkitdirectory
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-medium text-gray-700">已上传文件</h4>

          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {serviceRef.current.formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 进度条 */}
              {file.progress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}

              {/* 预览 */}
              {file.preview && (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="mt-2 max-w-full h-32 object-cover rounded"
                />
              )}
            </div>
          ))}

          {/* 清空按钮 */}
          <Button
            onClick={handleClearAll}
            variant="outline"
            size="sm"
            className="w-full"
          >
            清空所有
          </Button>
        </div>
      )}

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-600">
        <p>✓ 支持 PDF、图片、文本文件</p>
        <p>✓ 单个文件最大 50MB</p>
        <p>✓ 一次最多上传 10 个文件</p>
      </div>
    </Card>
  );
};

export default FileUploadPanel;
