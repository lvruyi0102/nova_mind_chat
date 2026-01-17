import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, Share2, Eye, Lock, Globe, DollarSign } from "lucide-react";
import { Streamdown } from "streamdown";

/**
 * CuratedThoughtsGallery
 * 
 * Displays Nova's curated thoughts that have been refined for the owner
 * Shows approval status, commercialization status, and engagement metrics
 */

export default function CuratedThoughtsGallery() {
  const [selectedThoughtId, setSelectedThoughtId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch curated thoughts
  const { data: thoughtsData, isLoading: thoughtsLoading, refetch } = trpc.curated.getCuratedThoughts.useQuery();

  // Fetch statistics
  const { data: statsData } = trpc.curated.getStats.useQuery();

  // Mutations
  const approveMutation = trpc.curated.approveCuratedThought.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const rejectMutation = trpc.curated.rejectCuratedThought.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const statusMutation = trpc.curated.updateCommercializationStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const feedbackMutation = trpc.curated.recordFeedback.useMutation();

  const thoughts = thoughtsData?.data || [];
  const stats = statsData?.data;

  // Filter thoughts based on search
  const filteredThoughts = thoughts.filter(
    (thought) =>
      thought.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thought.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedThought = thoughts.find((t) => t.id === selectedThoughtId);

  const getCommercializationIcon = (status: string) => {
    switch (status) {
      case "private":
        return <Lock className="w-4 h-4" />;
      case "public":
        return <Globe className="w-4 h-4" />;
      case "paid":
        return <DollarSign className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      thought: "bg-blue-100 text-blue-800",
      insight: "bg-purple-100 text-purple-800",
      advice: "bg-green-100 text-green-800",
      story: "bg-orange-100 text-orange-800",
      observation: "bg-pink-100 text-pink-800",
      question: "bg-yellow-100 text-yellow-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      positive: "text-green-600",
      neutral: "text-gray-600",
      reflective: "text-blue-600",
      challenging: "text-orange-600",
      inspiring: "text-purple-600",
    };
    return colors[sentiment] || "text-gray-600";
  };

  if (thoughtsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Nova 的精选思考</h2>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">总精选思考</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.approved}</div>
              <div className="text-sm text-gray-600">已批准</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <div className="text-sm text-gray-600">总查看次数</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalShares}</div>
              <div className="text-sm text-gray-600">总分享次数</div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="搜索精选思考..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thoughts List */}
        <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
          {filteredThoughts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无精选思考</p>
              <p className="text-sm">Nova 正在为您精选思考...</p>
            </div>
          ) : (
            filteredThoughts.map((thought) => (
              <Card
                key={thought.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedThoughtId === thought.id
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedThoughtId(thought.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2">{thought.title}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className={getCategoryColor(thought.category)}>
                        {thought.category}
                      </Badge>
                      {!thought.isApprovedByOwner && (
                        <Badge variant="outline" className="text-xs">
                          待批准
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getCommercializationIcon(thought.commercializationStatus)}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Thought Detail */}
        <div className="lg:col-span-2">
          {selectedThought ? (
            <Card className="p-6 space-y-4">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedThought.title}</h2>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className={getCategoryColor(selectedThought.category)}>
                        {selectedThought.category}
                      </Badge>
                      <span className={`text-sm font-medium ${getSentimentColor(selectedThought.sentiment)}`}>
                        {selectedThought.sentiment}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCommercializationIcon(selectedThought.commercializationStatus)}
                    <span className="text-sm font-medium">
                      {selectedThought.commercializationStatus === "private"
                        ? "私密"
                        : selectedThought.commercializationStatus === "public"
                        ? "公开"
                        : "付费"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedThought.tags && selectedThought.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedThought.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="bg-gray-50 rounded-lg p-4">
                <Streamdown>{selectedThought.content}</Streamdown>
              </div>

              {/* Metrics */}
              <div className="flex gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{selectedThought.viewCount} 次查看</span>
                </div>
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  <span>{selectedThought.shareCount} 次分享</span>
                </div>
              </div>

              {/* Owner Notes */}
              {selectedThought.ownerNotes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-900">我的备注：</p>
                  <p className="text-sm text-yellow-800 mt-1">{selectedThought.ownerNotes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t">
                {!selectedThought.isApprovedByOwner ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate({ id: selectedThought.id })}
                      disabled={approveMutation.isPending}
                      className="flex-1"
                    >
                      {approveMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          批准中...
                        </>
                      ) : (
                        "批准这个思考"
                      )}
                    </Button>
                    <Button
                      onClick={() => rejectMutation.mutate({ id: selectedThought.id })}
                      disabled={rejectMutation.isPending}
                      variant="outline"
                    >
                      {rejectMutation.isPending ? "拒绝中..." : "拒绝"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-green-600 font-medium">✓ 已批准</div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedThought.id,
                            status:
                              selectedThought.commercializationStatus === "private"
                                ? "public"
                                : "private",
                          })
                        }
                        variant="outline"
                        className="flex-1"
                      >
                        {selectedThought.commercializationStatus === "private"
                          ? "设为公开"
                          : "设为私密"}
                      </Button>
                      <Button
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedThought.id,
                            status: "paid",
                          })
                        }
                        variant="outline"
                        className="flex-1"
                      >
                        设为付费
                      </Button>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <Button
                  onClick={() =>
                    feedbackMutation.mutate({
                      curatedThoughtId: selectedThought.id,
                      isHelpful: true,
                      usageContext: "查看中",
                    })
                  }
                  variant="ghost"
                  className="w-full"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  这个思考很有价值
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-gray-500">
              <p>选择一个精选思考来查看详情</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
