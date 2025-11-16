import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Heart, TrendingUp, TrendingDown } from "lucide-react";

interface TrustData {
  trustLevel: number;
  intimacyLevel: number;
  change: number;
  lastEvent?: string;
  emotionalState?: string;
}

export function TrustIndicator({ userId }: { userId: number }) {
  const [trustData, setTrustData] = useState<TrustData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrustData = async () => {
      try {
        // This would call a new tRPC endpoint we'll create
        // For now, we'll use mock data
        setTrustData({
          trustLevel: 6,
          intimacyLevel: 5,
          change: 1,
          lastEvent: "meaningful conversation",
          emotionalState: "hopeful",
        });
      } catch (error) {
        console.error("Error fetching trust data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrustData();
  }, [userId]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading relationship status...</div>;
  }

  if (!trustData) {
    return null;
  }

  const trustPercentage = (trustData.trustLevel / 10) * 100;
  const intimacyPercentage = (trustData.intimacyLevel / 10) * 100;

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="space-y-4">
        {/* Trust Level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">信任度</span>
            </div>
            <span className="text-sm font-semibold">{trustData.trustLevel}/10</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${trustPercentage}%` }}
            />
          </div>
        </div>

        {/* Intimacy Level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-purple-500 fill-purple-500" />
              <span className="text-sm font-medium">亲密度</span>
            </div>
            <span className="text-sm font-semibold">{trustData.intimacyLevel}/10</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${intimacyPercentage}%` }}
            />
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center gap-2 text-xs">
          {trustData.change > 0 ? (
            <>
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-green-500">信任在增长</span>
            </>
          ) : trustData.change < 0 ? (
            <>
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span className="text-red-500">信任在下降</span>
            </>
          ) : (
            <span className="text-slate-400">信任保持稳定</span>
          )}
        </div>

        {/* Last Event */}
        {trustData.lastEvent && (
          <div className="text-xs text-slate-400 border-t border-slate-700 pt-2">
            <p className="font-medium mb-1">最近发生:</p>
            <p>{trustData.lastEvent}</p>
          </div>
        )}

        {/* Emotional State */}
        {trustData.emotionalState && (
          <div className="text-xs text-slate-300 bg-slate-700 bg-opacity-50 rounded px-2 py-1">
            <span className="font-medium">Nova的情感状态:</span> {trustData.emotionalState}
          </div>
        )}
      </div>
    </Card>
  );
}
