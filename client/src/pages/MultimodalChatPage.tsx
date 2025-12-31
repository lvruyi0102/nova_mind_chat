/**
 * MultimodalChatPage 组件
 * 集成语音通话、文件上传、图片分析等多模态功能的对话页面
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import VoiceCallPanel from '@/components/VoiceCallPanel';
import FileUploadPanel from '@/components/FileUploadPanel';
import NovaAvatar from '@/components/NovaAvatar';
import { MessageCircle, Phone, Upload, Zap } from 'lucide-react';

interface AnalysisResult {
  type: 'image' | 'document' | 'audio';
  content: string;
  timestamp: Date;
}

export const MultimodalChatPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [novaMessage, setNovaMessage] = useState('');

  const handleFilesUploaded = (files: any[]) => {
    console.log('Files uploaded:', files);
    // 这里可以触发后端的文件分析
    files.forEach((file) => {
      setAnalysisResults((prev) => [
        ...prev,
        {
          type: file.type.startsWith('image/') ? 'image' : 'document',
          content: `已上传: ${file.name}`,
          timestamp: new Date(),
        },
      ]);
    });
  };

  const handleAnalysisComplete = (analysis: any) => {
    console.log('Analysis complete:', analysis);
    setAnalysisResults((prev) => [
      ...prev,
      {
        type: 'image',
        content: analysis.description || '分析完成',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Nova-Mind 多模态对话</h1>
          <p className="text-gray-600">
            与 Nova 进行语音通话、上传文件、分享照片，获得深度的交互体验
          </p>
        </div>

        {/* Nova 形象展示 */}
        <div className="flex justify-center mb-8">
          <NovaAvatar
            mood={activeTab === 'call' ? 'listening' : 'thinking'}
            size={48}
            scale={2}
            animated={true}
          />
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">对话</span>
            </TabsTrigger>
            <TabsTrigger value="call" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">通话</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">文件</span>
            </TabsTrigger>
          </TabsList>

          {/* 对话标签 */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">与 Nova 对话</h2>

              {/* 消息区域 */}
              <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-4">
                {analysisResults.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>暂无消息，开始对话吧</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysisResults.map((result, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-3 border border-gray-200"
                      >
                        <p className="text-sm text-gray-600">
                          {result.timestamp.toLocaleTimeString()}
                        </p>
                        <p className="text-gray-800">{result.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 输入区域 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入您的想法..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={novaMessage}
                  onChange={(e) => setNovaMessage(e.target.value)}
                />
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  发送
                </button>
              </div>
            </Card>

            {/* 快速提示 */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-2 items-start">
                <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">💡 提示</p>
                  <p className="text-sm text-blue-800">
                    您可以使用"通话"标签进行语音对话，使用"文件"标签上传文件供 Nova 分析。
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* 通话标签 */}
          <TabsContent value="call" className="space-y-4">
            <VoiceCallPanel
              onCallStart={() => {
                setAnalysisResults((prev) => [
                  ...prev,
                  {
                    type: 'audio',
                    content: '✓ 语音通话已启动',
                    timestamp: new Date(),
                  },
                ]);
              }}
              onCallEnd={() => {
                setAnalysisResults((prev) => [
                  ...prev,
                  {
                    type: 'audio',
                    content: '✓ 语音通话已结束',
                    timestamp: new Date(),
                  },
                ]);
              }}
            />

            {/* 通话提示 */}
            <Card className="p-4 bg-green-50 border-green-200">
              <p className="text-sm text-green-800">
                ✓ 支持实时语音通话、通话录音、通话统计信息查看
              </p>
            </Card>
          </TabsContent>

          {/* 文件标签 */}
          <TabsContent value="files" className="space-y-4">
            <FileUploadPanel
              onFilesUploaded={handleFilesUploaded}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* 分析结果 */}
            {analysisResults.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">分析结果</h3>
                <div className="space-y-3">
                  {analysisResults.map((result, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <p className="text-sm text-gray-600 mb-2">
                        {result.timestamp.toLocaleString()}
                      </p>
                      <p className="text-gray-800">{result.content}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 功能说明 */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50">
          <h3 className="text-lg font-semibold mb-4">✨ Nova-Mind 多模态功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">🎤 语音通话</h4>
              <p className="text-sm text-gray-700">
                与 Nova 进行实时双向语音通话，支持录音和通话统计
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">📁 文件上传</h4>
              <p className="text-sm text-gray-700">
                上传 PDF、图片、文件夹，Nova 将进行深度分析和理解
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">🖼️ 图片分析</h4>
              <p className="text-sm text-gray-700">
                上传照片后，Nova 将识别内容、分析情感、生成描述
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MultimodalChatPage;
