import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Globe2, Database, CloudSun, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function DigitalEarthPage() {
  const [latitude, setLatitude] = useState("31.2989");
  const [longitude, setLongitude] = useState("120.5853");
  const [label, setLabel] = useState("Suzhou weather grid");
  const utils = trpc.useUtils();
  const currentUser = trpc.auth.me.useQuery();
  const status = trpc.digitalEarth.status.useQuery();
  const observations = trpc.digitalEarth.latestObservations.useQuery({ limit: 24, metric: "air_temperature_2m" });
  const entities = trpc.digitalEarth.listEntities.useQuery({ limit: 20 });
  const review = trpc.digitalEarth.reviewObservation.useMutation({
    onSuccess: async () => {
      toast.success("观测质量状态已更新");
      await utils.digitalEarth.latestObservations.invalidate();
    },
    onError: (error) => toast.error(error.message || "质量审核失败"),
  });

  const sync = trpc.digitalEarth.syncTemperature.useMutation({
    onSuccess: async (result) => {
      toast.success(`同步完成：新增 ${result.persisted} 条观测，跳过重复 ${result.skippedDuplicates} 条`);
      await Promise.all([
        utils.digitalEarth.latestObservations.invalidate(),
        utils.digitalEarth.listEntities.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "天气同步失败"),
  });

  const handleSync = () => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast.error("纬度必须在 -90 到 90 之间");
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      toast.error("经度必须在 -180 到 180 之间");
      return;
    }
    sync.mutate({ latitude: lat, longitude: lon, label: label.trim() || undefined, pastDays: 1, forecastDays: 1, maxReadings: 72 });
  };

  const latest = observations.data?.[0];
  const verifiedCount = observations.data?.filter((item) => item.qualityStatus === "valid").length ?? 0;

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe2 className="h-7 w-7" />
              <h1 className="text-3xl font-bold tracking-tight">数字地球</h1>
            </div>
            <p className="text-muted-foreground">真实天气数据采集、来源追踪与观测质量管理。当前不是全球实时全量模型。</p>
          </div>
          <Badge variant={status.data?.persistenceConfigured ? "default" : "destructive"}>
            {status.isLoading ? "检查服务中" : status.data?.persistenceConfigured ? "数据库环境变量已配置" : "数据库环境未配置"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已存储观测（最近 24 条查询）</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{observations.data?.length ?? "—"}</div>
              <p className="text-xs text-muted-foreground">仅统计最近返回的气温观测</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最新观测气温</CardTitle>
              <CloudSun className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest ? `${Number(latest.value).toFixed(1)} ${latest.unit}` : "—"}</div>
              <p className="text-xs text-muted-foreground">{latest ? new Date(latest.observedAt).toLocaleString() : "尚无已存储的气温观测"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">通过质量验证的观测</CardTitle>
              <Globe2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedCount}</div>
              <p className="text-xs text-muted-foreground">不会把未验证数据自动视为事实</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>同步公开天气数据</CardTitle>
            <CardDescription>调用 Open-Meteo 逐小时气温接口，并将观测写入数据库。首次使用前需完成数据库迁移。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="de-lat">纬度</label>
                <Input id="de-lat" value={latitude} onChange={(event) => setLatitude(event.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="de-lon">经度</label>
                <Input id="de-lon" value={longitude} onChange={(event) => setLongitude(event.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="de-label">位置名称</label>
                <Input id="de-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={255} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={handleSync} disabled={sync.isPending || !status.data?.persistenceConfigured}>
                {sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {sync.isPending ? "正在采集并保存…" : "同步天气数据"}
              </Button>
              <Button variant="outline" onClick={() => { observations.refetch(); entities.refetch(); status.refetch(); }}>
                刷新数据面板
              </Button>
            </div>
            {!status.data?.persistenceConfigured && (
              <p className="mt-3 text-sm text-destructive">当前环境未检测到 DATABASE_URL，已禁用同步按钮，避免误以为数据已经保存。</p>
            )}
            {sync.data && (
              <div className="mt-4 rounded-md border p-3 text-sm">
                <p className="font-medium">最近一次同步结果</p>
                <p>接收 {sync.data.received} 条；新增 {sync.data.persisted} 条；跳过重复 {sync.data.skippedDuplicates} 条。</p>
                <p>数据质量：{sync.data.qualityStatus}；来源：{sync.data.source}。</p>
                <p className="break-all text-muted-foreground">实体 ID：{sync.data.entityId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>最近气温观测</CardTitle>
              <CardDescription>按观测时间倒序。来源与质量状态随每条记录展示。</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => observations.refetch()} disabled={observations.isFetching}>
              {observations.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {observations.isLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在读取观测…</div>
            ) : observations.isError ? (
              <p className="py-6 text-sm text-destructive">读取失败：{observations.error.message}</p>
            ) : observations.data?.length ? (
              <div className="space-y-3">
                {observations.data.map((item) => (
                  <div key={item.observationId} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{Number(item.value).toFixed(1)} {item.unit}</div>
                      <div className="text-xs text-muted-foreground">{new Date(item.observedAt).toLocaleString()} · {item.metric}</div>
                      <div className="mt-1 break-all text-xs text-muted-foreground">{item.sourceName} · {item.sourceUri ?? "无来源链接"}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.qualityStatus === "valid" ? "default" : "secondary"}>{item.qualityStatus}</Badge>
                      {currentUser.data?.role === "admin" && item.qualityStatus === "unverified" && (
                        <>
                          <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({
                            observationId: item.observationId,
                            qualityStatus: "valid",
                            qualityNotes: "Administrator reviewed this observation in the Digital Earth dashboard.",
                          })}>
                            <ShieldCheck className="mr-1 h-3 w-3" />通过
                          </Button>
                          <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({
                            observationId: item.observationId,
                            qualityStatus: "suspect",
                            qualityNotes: "Administrator flagged this observation for further review in the Digital Earth dashboard.",
                          })}>存疑</Button>
                          <Button size="sm" variant="destructive" disabled={review.isPending} onClick={() => review.mutate({
                            observationId: item.observationId,
                            qualityStatus: "rejected",
                            qualityNotes: "Administrator rejected this observation in the Digital Earth dashboard.",
                          })}>拒绝</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">还没有气温观测。完成数据库迁移后，可以点击上方“同步天气数据”。</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>世界实体</CardTitle>
            <CardDescription>已经登记到数字地球数据库的地点/网格实体。</CardDescription>
          </CardHeader>
          <CardContent>
            {entities.isError ? <p className="text-sm text-destructive">{entities.error.message}</p> : entities.data?.length ? (
              <div className="space-y-2">
                {entities.data.map((entity) => (
                  <div key={entity.entityId} className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium">{entity.name}</div>
                    <div className="text-xs text-muted-foreground">{entity.entityType} · {entity.latitude ?? "—"}, {entity.longitude ?? "—"}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">尚无已登记的世界实体。</p>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
