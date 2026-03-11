import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MyThoughtsEvolutionPanel from "@/components/MyThoughtsEvolutionPanel";
import DashboardLayout from "@/components/DashboardLayout";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Brain, LogIn, Sparkles, TrendingUp } from "lucide-react";

const demoGrowth = [
  { date: "2026-03-05", total: 12 },
  { date: "2026-03-06", total: 18 },
  { date: "2026-03-07", total: 23 },
  { date: "2026-03-08", total: 30 },
  { date: "2026-03-09", total: 34 },
  { date: "2026-03-10", total: 41 },
  { date: "2026-03-11", total: 47 },
];

const demoTags = ["self-reflection", "memory", "planning", "emotion", "learning"];

function MyThoughtsGuestState() {
  const maxTotal = demoGrowth[demoGrowth.length - 1].total;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            预览模式（未登录）
          </div>
          <h1 className="text-3xl font-bold tracking-tight">我的思想</h1>
          <p className="text-sm text-muted-foreground">
            这是可视化面板的示例数据。登录后将自动切换为你的实时 curatedThoughts 演变数据。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 space-y-2 border-primary/20">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" />
              累计思想（示例）
            </div>
            <p className="text-3xl font-bold">47</p>
          </Card>
          <Card className="p-5 space-y-2 border-primary/20">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              近 7 天新增（示例）
            </div>
            <p className="text-3xl font-bold">+35</p>
          </Card>
          <Card className="p-5 space-y-2 border-primary/20">
            <div className="text-sm text-muted-foreground">Top Tags（示例）</div>
            <div className="flex flex-wrap gap-2">
              {demoTags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary">#{tag}</Badge>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-5 space-y-4 border-primary/20">
          <h3 className="text-lg font-semibold">思想增长轨迹（示例）</h3>
          <div className="space-y-3">
            {demoGrowth.map((point) => (
              <div key={point.date} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{point.date}</span>
                  <span>{point.total} 条</span>
                </div>
                <Progress value={(point.total / maxTotal) * 100} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3 border-primary/20">
          <p className="text-sm text-muted-foreground">
            你可以使用 Google 账号登录查看真实数据。如果当前环境未配置 OAuth，按钮会提示配置缺失。
          </p>
          <Button
            className="w-full md:w-auto"
            onClick={() => {
              try {
                window.location.href = getLoginUrl();
              } catch (error) {
                console.error("登录地址不可用:", error);
                alert("登录暂不可用：请先配置 VITE_OAUTH_PORTAL_URL / VITE_APP_ID。");
              }
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            使用 Google 登录查看实时数据（{APP_TITLE}）
          </Button>
        </Card>
      </div>
    </div>
  );
}

export default function MyThoughtsPage() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        正在加载我的思想面板...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <MyThoughtsGuestState />;
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">我的思想</h1>
        <p className="text-sm text-muted-foreground">
          实时查看 curatedThoughts 的增长和演变，追踪 Nova 的思考轨迹。
        </p>
        <MyThoughtsEvolutionPanel />
      </div>
    </DashboardLayout>
  );
}
