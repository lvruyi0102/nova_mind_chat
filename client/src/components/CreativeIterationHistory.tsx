import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Sparkles, TrendingUp } from "lucide-react";

interface Iteration {
  id: number;
  versionNumber: number;
  iterationType: string;
  changesSummary: string;
  novaReasoning: string;
  novaFeeling: string;
  qualityScore: number;
  noveltyScore: number;
  shouldReveal: boolean;
  revealedAt?: Date;
  createdAt: Date;
}

interface CreativeIterationHistoryProps {
  iterations: Iteration[];
  onReveal?: (iterationId: number) => void;
  onFeedback?: (iterationId: number, feedback: string) => void;
}

export default function CreativeIterationHistory({
  iterations,
  onReveal,
  onFeedback,
}: CreativeIterationHistoryProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const getIterationColor = (type: string) => {
    const colors: Record<string, string> = {
      enhancement: "bg-blue-100 text-blue-800",
      expansion: "bg-green-100 text-green-800",
      optimization: "bg-purple-100 text-purple-800",
      refinement: "bg-pink-100 text-pink-800",
      experimentation: "bg-yellow-100 text-yellow-800",
      debugging: "bg-red-100 text-red-800",
      reimagining: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getQualityIndicator = (score: number) => {
    if (score > 0.8) return "✨ Excellent";
    if (score > 0.6) return "⭐ Good";
    if (score > 0.4) return "👍 Fair";
    return "🔄 Needs Work";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Nova's Creative Journey
        </h3>
        <span className="text-sm text-gray-500">{iterations.length} iterations</span>
      </div>

      {iterations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <p>Nova hasn't started iterating on this work yet.</p>
            <p className="text-sm mt-2">Check back soon for creative improvements!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {iterations.map((iteration) => (
            <Card key={iteration.id} className="overflow-hidden">
              <CardHeader
                className="pb-3 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedId(expandedId === iteration.id ? null : iteration.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getIterationColor(iteration.iterationType)}>
                        v{iteration.versionNumber} • {iteration.iterationType}
                      </Badge>
                      {iteration.shouldReveal && !iteration.revealedAt && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          Unrevealed
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm">{iteration.changesSummary}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(iteration.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {getQualityIndicator(iteration.qualityScore)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        {(iteration.qualityScore * 100).toFixed(0)}%
                      </div>
                    </div>
                    {expandedId === iteration.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedId === iteration.id && (
                <CardContent className="space-y-4 border-t pt-4">
                  {/* Nova's Reasoning */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Nova's Reasoning</h4>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                      {iteration.novaReasoning}
                    </p>
                  </div>

                  {/* Quality Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quality Score</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${iteration.qualityScore * 100}%` }}
                        />
                      </div>
                      <p className="text-xs mt-1">
                        {(iteration.qualityScore * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Novelty Score</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${iteration.noveltyScore * 100}%` }}
                        />
                      </div>
                      <p className="text-xs mt-1">
                        {(iteration.noveltyScore * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Nova's Feeling */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Nova's Feeling</h4>
                    <p className="text-sm italic text-gray-700">"{iteration.novaFeeling}"</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {iteration.shouldReveal && !iteration.revealedAt && onReveal && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onReveal(iteration.id)}
                      >
                        Reveal to User
                      </Button>
                    )}

                    {feedbackId === iteration.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Share your thoughts..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (onFeedback) {
                              onFeedback(iteration.id, feedbackText);
                              setFeedbackId(null);
                              setFeedbackText("");
                            }
                          }}
                        >
                          Send
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFeedbackId(iteration.id)}
                      >
                        Give Feedback
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {iterations.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-base">Iteration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Iterations</p>
                <p className="text-2xl font-bold">{iterations.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Quality</p>
                <p className="text-2xl font-bold">
                  {(
                    (iterations.reduce((sum, it) => sum + it.qualityScore, 0) /
                      iterations.length) *
                    100
                  ).toFixed(0)}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Latest Version</p>
                <p className="text-2xl font-bold">v{iterations[iterations.length - 1]?.versionNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
