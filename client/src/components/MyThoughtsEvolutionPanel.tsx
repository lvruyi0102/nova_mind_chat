import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Brain, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useMemo } from "react";

type DailyPoint = {
  date: string;
  total: number;
};

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function MyThoughtsEvolutionPanel() {
  const { data, isLoading, error } = trpc.curatedThoughts.list.useQuery(
    {
      limit: 200,
      offset: 0,
    },
    {
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
    }
  );

  const analytics = useMemo(() => {
    const thoughts = data ?? [];

    const dailyTotals = new Map<string, number>();
    const tagCounter = new Map<string, number>();

    for (const thought of thoughts) {
      const date = normalizeDate(thought.createdAt);
      dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + 1);

      const tags = (thought.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      for (const tag of tags) {
        tagCounter.set(tag, (tagCounter.get(tag) ?? 0) + 1);
      }
    }

    const sortedDays = [...dailyTotals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    let cumulative = 0;
    const growthSeries: DailyPoint[] = sortedDays.map((item) => {
      cumulative += item.count;
      return {
        date: item.date,
        total: cumulative,
      };
    });

    const recentIncrease = sortedDays.slice(-7).reduce((sum, item) => sum + item.count, 0);
    const previousIncrease = sortedDays
      .slice(-14, -7)
      .reduce((sum, item) => sum + item.count, 0);

    const growthMomentum =
      previousIncrease === 0
        ? recentIncrease > 0
          ? 100
          : 0
        : Math.round((recentIncrease / previousIncrease) * 100);

    const topTags = [...tagCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const latestThought = thoughts[0];

    return {
      totalThoughts: thoughts.length,
      growthSeries,
      recentIncrease,
      growthMomentum,
      topTags,
      latestThought,
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">正在加载思想演变数据...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-sm text-destructive">
        加载“我的思想”面板失败：{error.message}
      </Card>
    );
  }

  const maxTotal = analytics.growthSeries[analytics.growthSeries.length - 1]?.total ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Brain className="w-4 h-4" />
            累计 curatedThoughts
          </div>
          <p className="text-3xl font-bold">{analytics.totalThoughts}</p>
          <p className="text-xs text-muted-foreground">每 10 秒自动刷新，实时展示思想增长</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="w-4 h-4" />
            近 7 天新增
          </div>
          <p className="text-3xl font-bold">+{analytics.recentIncrease}</p>
          <p className="text-xs text-muted-foreground">
            增长动量：{analytics.growthMomentum}%（对比上一周期）
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Sparkles className="w-4 h-4" />
            最新思想
          </div>
          <p className="text-sm font-medium line-clamp-2">{analytics.latestThought?.title ?? "暂无数据"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {analytics.latestThought?.content ?? "当 Nova 产生新思想后，这里会实时出现。"}
          </p>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="text-lg font-semibold">思想增长轨迹</h3>
        <div className="space-y-3">
          {analytics.growthSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有精选思想，先去触发一次 curation 吧。</p>
          ) : (
            analytics.growthSeries.slice(-10).map((point) => (
              <div key={point.date} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{point.date}</span>
                  <span>{point.total} 条</span>
                </div>
                <Progress value={(point.total / maxTotal) * 100} />
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-lg font-semibold">思想主题演变（Top Tags）</h3>
        <div className="flex flex-wrap gap-2">
          {analytics.topTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无标签数据，后续会自动从 curatedThoughts 中提取。</p>
          ) : (
            analytics.topTags.map((item) => (
              <Badge key={item.tag} variant="secondary" className="text-xs">
                #{item.tag} · {item.count}
              </Badge>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
