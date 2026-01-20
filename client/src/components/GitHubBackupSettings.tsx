// @ts-ignore - Type mismatches with tRPC routes
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertCircle, Github } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface GitHubBackupSettingsProps {
  onBackupComplete?: () => void;
}

export default function GitHubBackupSettings({ onBackupComplete }: GitHubBackupSettingsProps) {
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("nova_mind_chat");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 验证 GitHub 令牌
  const verifyTokenMutation = trpc.export.verifyGitHubToken.useMutation({
    onSuccess: (data) => {
      setTokenValid(true);
      setOwner(data.user.login);
      toast.success(`✓ GitHub 令牌验证成功！欢迎 ${data.user.name || data.user.login}`);
      
      // 获取仓库列表
      getRepositoriesMutation.mutate({ token });
    },
    onError: (error) => {
      setTokenValid(false);
      toast.error(`✗ 令牌验证失败: ${error.message}`);
    },
  });

  // 获取仓库列表
  const getRepositoriesMutation = trpc.export.getGitHubRepositories.useMutation({
    onSuccess: (data) => {
      setRepositories(data);
      if (data.length > 0) {
        setRepo(data[0].name);
      }
    },
    onError: (error) => {
      toast.error(`✗ 获取仓库列表失败: ${error.message}`);
    },
  });

  // 备份到 GitHub
  const backupMutation = trpc.export.backupToGitHub.useMutation({
    onSuccess: (data) => {
      setIsBackingUp(false);
      if (data.success) {
        toast.success("✓ 数据已成功备份到 GitHub！");
        getHistoryMutation.mutate({ token, owner, repo });
        onBackupComplete?.();
      } else {
        toast.error(`✗ 备份失败: ${data.message}`);
      }
    },
    onError: (error) => {
      setIsBackingUp(false);
      toast.error(`✗ 备份失败: ${error.message}`);
    },
  });

  // 获取备份历史
  const getHistoryMutation = trpc.export.getBackupHistory.useMutation({
    onSuccess: (data) => {
      setBackupHistory(data);
      setShowHistory(true);
    },
    onError: (error) => {
      toast.error(`✗ 获取备份历史失败: ${error.message}`);
    },
  });

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      toast.error("请输入 GitHub 令牌");
      return;
    }
    setIsVerifying(true);
    verifyTokenMutation.mutate({ token });
    setIsVerifying(false);
  };

  const handleBackup = async () => {
    if (!tokenValid) {
      toast.error("请先验证 GitHub 令牌");
      return;
    }
    if (!owner || !repo) {
      toast.error("请选择目标仓库");
      return;
    }
    setIsBackingUp(true);
    backupMutation.mutate({ token, owner, repo });
  };

  const handleGetHistory = () => {
    if (!tokenValid) {
      toast.error("请先验证 GitHub 令牌");
      return;
    }
    getHistoryMutation.mutate({ token, owner, repo });
  };

  return (
    <div className="space-y-6">
      {/* GitHub 令牌输入 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub 令牌配置
          </CardTitle>
          <CardDescription>
            输入您的 GitHub Personal Access Token 以启用自动备份功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="github-token" className="text-slate-300">
              GitHub Personal Access Token
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="github-token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={tokenValid}
                className="bg-slate-900 border-slate-600 text-white"
              />
              <Button
                onClick={handleVerifyToken}
                disabled={isVerifying || tokenValid}
                variant={tokenValid ? "default" : "outline"}
                className={tokenValid ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : tokenValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    已验证
                  </>
                ) : (
                  "验证令牌"
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              需要创建令牌？访问{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                GitHub Settings
              </a>
              ，选择 "repo" 权限
            </p>
          </div>

          {tokenValid && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-400">✓ 令牌有效，准备备份</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 仓库选择 */}
      {tokenValid && repositories.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">选择目标仓库</CardTitle>
            <CardDescription>
              选择要备份数据的 GitHub 仓库
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="repo-select" className="text-slate-300">
                仓库
              </Label>
              <Select value={repo} onValueChange={setRepo}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-600">
                  {repositories.map((r) => (
                    <SelectItem key={r.name} value={r.name} className="text-white">
                      {r.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-900 rounded-lg p-3 text-sm text-slate-300">
              <p className="font-semibold mb-2">备份位置：</p>
              <code className="text-xs bg-slate-800 p-2 rounded block">
                {owner}/{repo}/nova-memories-backup/
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 备份操作 */}
      {tokenValid && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">立即备份</CardTitle>
            <CardDescription>
              将 Nova 的所有记忆数据备份到 GitHub
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleBackup}
              disabled={isBackingUp || !tokenValid}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  备份中...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4 mr-2" />
                  备份到 GitHub
                </>
              )}
            </Button>

            <Button
              onClick={handleGetHistory}
              variant="outline"
              className="w-full"
              disabled={!tokenValid}
            >
              查看备份历史
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 备份历史 */}
      {showHistory && backupHistory.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">备份历史</CardTitle>
            <CardDescription>
              最近的 Nova-Mind 备份记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backupHistory.map((backup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-900 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{backup.name}</p>
                    <p className="text-xs text-slate-400">{backup.date}</p>
                  </div>
                  <a
                    href={backup.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    查看
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 帮助信息 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">🔒 安全提示</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-2">
          <p>
            ✓ 令牌仅用于此会话，不会被保存或上传到服务器
          </p>
          <p>
            ✓ 备份数据将保存在您的 GitHub 私有仓库中
          </p>
          <p>
            ✓ 建议使用具有 "repo" 权限的 Personal Access Token
          </p>
          <p>
            ✓ 可以随时撤销令牌以停止备份功能
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
