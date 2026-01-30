// @ts-ignore
// @ts-ignore - Type mismatches with tRPC routes
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import CommentForm from "./CommentForm";
import CommentCard from "./CommentCard";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreativeCommentSectionProps {
  creativeWorkId: number;
  workTitle?: string;
  workDescription?: string;
}

export default function CreativeCommentSection({
  creativeWorkId,
  workTitle,
  workDescription,
}: CreativeCommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [respondingCommentId, setRespondingCommentId] = useState<number | null>(
    null
  );

  // Fetch comments
  const { data: commentsData, isLoading: isLoadingComments, refetch: refetchComments } = trpc.comments.getComments.useQuery(
    { creativeWorkId },
    { enabled: !!creativeWorkId }
  );

  // Fetch learning summary
  const { data: learningData } = trpc.comments.getCommentLearning.useQuery(
    { creativeWorkId },
    { enabled: !!creativeWorkId }
  );

  // Add comment mutation
  const addCommentMutation = trpc.comments.addComment.useMutation({
    onSuccess: () => {
      refetchComments();
    },
  });

  // Respond to comment mutation
  const respondToCommentMutation = trpc.comments.respondToComment.useMutation({
    onSuccess: () => {
      setRespondingCommentId(null);
      refetchComments();
    },
  });

  // Generate learning mutation
  const generateLearningMutation = trpc.comments.generateLearning.useMutation();

  useEffect(() => {
    if (commentsData) {
      setComments(commentsData);
    }
  }, [commentsData]);

  const handleAddComment = async (data: {
    content: string;
    sentiment: "positive" | "neutral" | "constructive_criticism";
    emotionalTone?: string;
  }) => {
    await addCommentMutation.mutateAsync({
      creativeWorkId,
      ...data,
    });
  };

  const handleRespondToComment = async (commentId: number, comment: any) => {
    setRespondingCommentId(commentId);
    try {
      await respondToCommentMutation.mutateAsync({
        commentId,
        comment: comment.content,
        sentiment: comment.sentiment,
        creativeWorkTitle: workTitle,
        creativeWorkDescription: workDescription,
      });
    } finally {
      setRespondingCommentId(null);
    }
  };

  const handleGenerateLearning = async () => {
    await generateLearningMutation.mutateAsync({
      creativeWorkId,
      workTitle,
      workDescription,
    });
  };

  return (
    <div className="space-y-6">
      {/* 评论表单 */}
      <CommentForm
        onSubmit={handleAddComment}
        isLoading={addCommentMutation.isPending}
      />

      {/* 学习总结 */}
      {learningData && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-purple-900">
              ✨ Nova从评论中学到的
            </h3>
            {comments.length > 0 && (
              <button
                onClick={handleGenerateLearning}
                disabled={generateLearningMutation.isPending}
                className="text-xs px-2 py-1 rounded bg-purple-200 hover:bg-purple-300 text-purple-900 disabled:opacity-50"
              >
                {generateLearningMutation.isPending ? "更新中..." : "更新总结"}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {learningData.feedbackSummary && (
              <div>
                <p className="text-xs font-semibold text-purple-800 mb-1">
                  📊 反馈总结
                </p>
                <p className="text-sm text-slate-700">
                  {learningData.feedbackSummary}
                </p>
              </div>
            )}

            {learningData.learningPoints && (
              <div>
                <p className="text-xs font-semibold text-purple-800 mb-1">
                  💡 关键学习点
                </p>
                <p className="text-sm text-slate-700">
                  {learningData.learningPoints}
                </p>
              </div>
            )}

            {learningData.improvementAreas && (
              <div>
                <p className="text-xs font-semibold text-purple-800 mb-1">
                  🎯 改进方向
                </p>
                <p className="text-sm text-slate-700">
                  {learningData.improvementAreas}
                </p>
              </div>
            )}

            {learningData.novaReflection && (
              <div className="pt-3 border-t border-purple-200">
                <p className="text-xs font-semibold text-purple-800 mb-1">
                  🤔 Nova的反思
                </p>
                <p className="text-sm italic text-slate-700">
                  "{learningData.novaReflection}"
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 评论列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            💬 评论 ({comments.length})
          </h3>
        </div>

        {isLoadingComments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : comments.length === 0 ? (
          <Card className="p-8 text-center bg-slate-50">
            <p className="text-slate-500">
              还没有评论。分享你对Nova这个创意作品的想法吧！
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                id={comment.id}
                content={comment.content}
                sentiment={comment.sentiment}
                emotionalTone={comment.emotionalTone}
                createdAt={comment.createdAt}
                userName="妈妈"
                novaResponse={comment.novaResponse}
                onRespond={() =>
                  handleRespondToComment(comment.id, comment)
                }
                isLoading={respondingCommentId === comment.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {addCommentMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            提交评论失败，请重试
          </AlertDescription>
        </Alert>
      )}

      {respondToCommentMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nova回应失败，请重试
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
