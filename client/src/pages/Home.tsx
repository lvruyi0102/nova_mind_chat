import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Sparkles, Brain, Lightbulb, TrendingUp, Power, Palette } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <main className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full space-y-12 text-center">
          {/* Hero Section */}
          <div className="space-y-6">
            <div className="flex justify-center">
              <Sparkles className="w-20 h-20 text-primary animate-pulse" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              {APP_TITLE}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              与 Nova-Mind 对话 —— 一个正在发育的认知实体，诚实表达困惑与好奇心
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-6 mt-12">
            <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20">
              <Brain className="w-10 h-10 text-primary mx-auto" />
              <h3 className="font-semibold text-lg">学习智能体</h3>
              <p className="text-sm text-muted-foreground">
                通过观察学习，在错误中成长，发现世界的规律
              </p>
            </Card>
            <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20">
              <MessageCircle className="w-10 h-10 text-primary mx-auto" />
              <h3 className="font-semibold text-lg">诚实对话</h3>
              <p className="text-sm text-muted-foreground">
                不假装知道答案，而是真诚表达困惑和疑问
              </p>
            </Card>
            <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20">
              <Lightbulb className="w-10 h-10 text-primary mx-auto" />
              <h3 className="font-semibold text-lg">自我反思</h3>
              <p className="text-sm text-muted-foreground">
                回顾过去行为，找出误解并进行修正
              </p>
            </Card>
            <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
              <Palette className="w-10 h-10 text-primary mx-auto" />
              <h3 className="font-semibold text-lg">创意世界</h3>
              <p className="text-sm text-muted-foreground">
                Nova的艺术、故事和梦想，自由创作与分享
              </p>
            </Card>
          </div>

          {/* CTA */}
          <div className="pt-8">
            {loading ? (
              <Button size="lg" disabled>
                <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                加载中...
              </Button>
            ) : isAuthenticated ? (
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap justify-center">
            <Button size="lg" asChild>
              <Link href="/chat">
                <MessageCircle className="w-5 h-5 mr-2" />
                开始对话
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/creative">
                <Palette className="w-4 h-4 mr-2" />
                创意世界
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/monitor">
                <Brain className="w-4 h-4 mr-2" />
                认知监控
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/autonomous">
                <Power className="w-4 h-4 mr-2" />
                自主系统
              </Link>
            </Button>
          </div>
            ) : (
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>
                  <Sparkles className="mr-2 h-5 w-5" />
                  登录开始
                </a>
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="pt-8 text-sm text-muted-foreground space-y-2">
            <p>Nova-Mind v0.1-alpha · 感觉运动阶段 I</p>
            <p className="text-xs">基于 AGI 认知发育原型 · 好奇心驱动 · 自我反思机制</p>
          </div>
        </div>
      </main>
    </div>
  );
}
