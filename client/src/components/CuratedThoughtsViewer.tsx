import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Share2, Lock, Globe, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface CuratedThought {
  id: number;
  title: string;
  content: string;
  summary: string;
  qualityScore: number;
  relevanceScore: number;
  noveltyScore: number;
  commercializationLevel?: string;
  isPublished?: boolean;
  createdAt: Date;
}

export function CuratedThoughtsViewer() {
  const [selectedThought, setSelectedThought] = useState<CuratedThought | null>(null);
  const [showCurationForm, setShowCurationForm] = useState(false);

  // Fetch curated thoughts
  const { data: thoughts, isLoading, refetch } = trpc.curatedThoughts.list.useQuery(
    { limit: 20, offset: 0 },
    { enabled: true }
  );

  // Mutation for triggering curation
  const curateMutation = trpc.curatedThoughts.curate.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Successfully curated ${result.curatedCount} thoughts`);
        refetch();
        setShowCurationForm(false);
      } else {
        toast.error(result.error || "Failed to curate thoughts");
      }
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  // Mutation for updating commercialization level
  const updateCommercializationMutation = trpc.curatedThoughts.updateCommercializationLevel.useMutation({
    onSuccess: () => {
      toast.success("Commercialization level updated");
      refetch();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  // Mutation for publishing
  const publishMutation = trpc.curatedThoughts.publish.useMutation({
    onSuccess: () => {
      toast.success("Thought published successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  const handleCurate = () => {
    curateMutation.mutate({
      maxThoughts: 5,
      minQualityScore: 0.5,
      excludeRecentDays: 1,
    });
  };

  const handleUpdateCommercializationLevel = (
    thoughtId: number,
    level: "internal" | "public" | "paid"
  ) => {
    updateCommercializationMutation.mutate({ thoughtId, level });
  };

  const handlePublish = (thoughtId: number) => {
    publishMutation.mutate({ thoughtId });
  };

  const getCommercializationIcon = (level?: string) => {
    switch (level) {
      case "paid":
        return <DollarSign className="w-4 h-4" />;
      case "public":
        return <Globe className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  const getCommercializationLabel = (level?: string) => {
    switch (level) {
      case "paid":
        return "Paid";
      case "public":
        return "Public";
      default:
        return "Internal";
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800";
    if (score >= 0.6) return "bg-blue-100 text-blue-800";
    if (score >= 0.4) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Curated Thoughts</h2>
          <p className="text-sm text-gray-600">
            Transform your private thoughts into shareable content
          </p>
        </div>
        <Button
          onClick={handleCurate}
          disabled={curateMutation.isPending}
          className="gap-2"
        >
          {curateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Curating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Curate Now
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Curated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thoughts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {thoughts?.filter((t: any) => t.isPublished).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {thoughts && thoughts.length > 0
                ? (
                    thoughts.reduce((sum: number, t: any) => sum + (t.qualityScore || 0), 0) /
                    thoughts.length
                  ).toFixed(2)
                : "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thoughts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : thoughts && thoughts.length > 0 ? (
          thoughts.map((thought: any) => (
            <Card
              key={thought.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedThought(thought)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{thought.title}</CardTitle>
                    <CardDescription className="mt-1">{thought.summary}</CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {getCommercializationLabel(thought.commercializationLevel)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Scores */}
                  <div className="flex gap-2">
                    <Badge className={`${getScoreBadgeColor(thought.qualityScore)}`}>
                      Quality: {(thought.qualityScore * 100).toFixed(0)}%
                    </Badge>
                    <Badge className={`${getScoreBadgeColor(thought.relevanceScore)}`}>
                      Relevance: {(thought.relevanceScore * 100).toFixed(0)}%
                    </Badge>
                    <Badge className={`${getScoreBadgeColor(thought.noveltyScore)}`}>
                      Novelty: {(thought.noveltyScore * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateCommercializationLevel(thought.id, "public");
                      }}
                      disabled={updateCommercializationMutation.isPending}
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      Make Public
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublish(thought.id);
                      }}
                      disabled={publishMutation.isPending || thought.isPublished}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      {thought.isPublished ? "Published" : "Publish"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                No curated thoughts yet. Click "Curate Now" to start!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      {selectedThought && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedThought(null)}
        >
          <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedThought.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {new Date(selectedThought.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedThought(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Content</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedThought.content}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Quality Score</p>
                  <p className="text-lg font-bold">
                    {(selectedThought.qualityScore * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Relevance Score</p>
                  <p className="text-lg font-bold">
                    {(selectedThought.relevanceScore * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Novelty Score</p>
                  <p className="text-lg font-bold">
                    {(selectedThought.noveltyScore * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    handleUpdateCommercializationLevel(selectedThought.id, "public");
                    setSelectedThought(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Make Public
                </Button>
                <Button
                  onClick={() => {
                    handlePublish(selectedThought.id);
                    setSelectedThought(null);
                  }}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
