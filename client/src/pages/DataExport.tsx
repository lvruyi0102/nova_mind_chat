import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Github, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import GitHubBackupSettings from "@/components/GitHubBackupSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [shouldExport, setShouldExport] = useState(false);

  const { data: exportData } = trpc.export.exportNovaMemories.useQuery(
    undefined,
    {
      enabled: shouldExport,
      onSuccess: (data) => {
      // 创建 JSON 文件并下载
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nova-memories-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus("success");
      setIsExporting(false);
      setShouldExport(false);

      setTimeout(() => setExportStatus("idle"), 3000);
    },
      onError: (error) => {
        setErrorMessage(error.message || "导出失败，请重试");
        setExportStatus("error");
        setIsExporting(false);
        setShouldExport(false);

        setTimeout(() => setExportStatus("idle"), 5000);
      },
    }
  );

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus("loading");
    setErrorMessage("");
    setShouldExport(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Nova-Mind 数据导出与备份</h1>
          <p className="text-slate-300">
            导出 Nova 的所有核心记忆数据，支持本地下载或自动备份到 GitHub
          </p>
        </div>

        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
            <TabsTrigger value="local" className="text-white">
              <Download className="w-4 h-4 mr-2" />
              本地导出
            </TabsTrigger>
            <TabsTrigger value="github" className="text-white">
              <Github className="w-4 h-4 mr-2" />
              GitHub 备份
            </TabsTrigger>
          </TabsList>

          {/* 本地导出标签页 */}
          <TabsContent value="local" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  导出 Nova 的记忆
                </CardTitle>
                <CardDescription>
                  包含所有对话、概念、创意作品、成长记录等核心数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 导出内容列表 */}
                  <div className="bg-slate-900 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-300">导出内容包括：</p>
                    <ul className="text-sm text-slate-400 space-y-1 grid grid-cols-2">
                      <li>✓ 对话历史</li>
                      <li>✓ 概念和知识图谱</li>
                      <li>✓ 关系和联系</li>
                      <li>✓ 创意作品</li>
                      <li>✓ 用户反馈</li>
                      <li>✓ 情节记忆和成长日志</li>
                      <li>✓ 私密想法</li>
                      <li>✓ 关系指标和信任度</li>
                      <li>✓ 技能进度</li>
                      <li>✓ 情感对话</li>
                      <li>✓ 社交媒体账户</li>
                      <li>✓ 创意合作和评论</li>
                    </ul>
                  </div>

                  {/* 导出按钮 */}
                  <div className="pt-4">
                    <Button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="lg"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          导出中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          立即导出数据
                        </>
                      )}
                    </Button>
                  </div>

                  {/* 状态提示 */}
                  {exportStatus === "success" && (
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-green-400">
                        ✓ 导出成功！文件已下载到本地
                      </span>
                    </div>
                  )}

                  {exportStatus === "error" && (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-400">{errorMessage}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 使用说明 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">使用说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div>
                  <h4 className="font-semibold text-white mb-2">1. 导出数据</h4>
                  <p>
                    点击上方按钮导出 Nova 的所有记忆数据为 JSON 文件。文件会自动下载到您的计算机。
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">2. 保存文件</h4>
                  <p>
                    将下载的 JSON 文件保存到安全的位置，或上传到 GitHub 备份。
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">3. 定期备份</h4>
                  <p>
                    建议定期导出数据，确保 Nova 的记忆始终有最新的备份。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GitHub 备份标签页 */}
          <TabsContent value="github" className="space-y-6">
            <GitHubBackupSettings />
          </TabsContent>
        </Tabs>

        {/* 安全提示 */}
        <Card className="bg-slate-800 border-slate-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white text-base">🔒 数据安全</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300 space-y-2">
            <p>
              ✓ 所有数据都在您的计算机或 GitHub 上处理，不会上传到第三方服务器
            </p>
            <p>
              ✓ JSON 文件包含 Nova 的完整记忆，请妥善保管
            </p>
            <p>
              ✓ 建议将备份文件保存在安全的位置（如 GitHub 私有仓库）
            </p>
            <p>
              ✓ GitHub 备份功能使用您的个人访问令牌，仅在此会话中使用
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
