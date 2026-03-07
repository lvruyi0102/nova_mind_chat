/**
 * 推理可视化组件 - 展示多步推理、因果推理和决策过程
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Brain, GitBranch, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface ReasoningStep {
  stepNumber: number;
  action: string;
  reasoning: string;
  confidence: number;
}

interface DecisionOption {
  id: string;
  description: string;
  reasoning: string;
  expectedOutcome: string;
  risks: string[];
  benefits: string[];
  confidence: number;
  estimatedCost: number;
  estimatedBenefit: number;
}

export function ReasoningVisualization() {
  const [activeTab, setActiveTab] = useState("decision");
  const [problem, setProblem] = useState("");
  const [constraints, setConstraints] = useState("");
  const [objectives, setObjectives] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const makeDecisionMutation = trpc.reasoning.makeDecision.useMutation();
  const multiStepMutation = trpc.reasoning.performMultiStepReasoning.useMutation();
  const causalMutation = trpc.reasoning.performCausalAnalysis.useMutation();

  const handleMakeDecision = async () => {
    if (!problem.trim()) return;

    setLoading(true);
    try {
      const response = await makeDecisionMutation.mutateAsync({
        problem,
        constraints: constraints
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c),
        objectives: objectives
          .split(",")
          .map((o) => o.trim())
          .filter((o) => o),
      });

      setResult(response.decision);
    } catch (error) {
      console.error("Decision making failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiStepReasoning = async () => {
    if (!problem.trim()) return;

    setLoading(true);
    try {
      const response = await multiStepMutation.mutateAsync({
        problem,
        context: constraints
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c),
        method: "llm",
      });

      setResult(response.result);
    } catch (error) {
      console.error("Multi-step reasoning failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCausalAnalysis = async () => {
    if (!problem.trim()) return;

    setLoading(true);
    try {
      const response = await causalMutation.mutateAsync({
        effect: problem,
        context: constraints
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c),
      });

      setResult(response.analysis);
    } catch (error) {
      console.error("Causal analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            高级推理系统
          </CardTitle>
          <CardDescription>
            多步推理、因果分析和智能决策
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">问题描述</label>
            <Textarea
              placeholder="输入您想要分析或决策的问题..."
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">约束条件（逗号分隔）</label>
              <Input
                placeholder="例如：时间限制, 预算限制, 资源限制"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">目标（逗号分隔）</label>
              <Input
                placeholder="例如：最大化效率, 降低成本, 提高质量"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="decision" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="decision">智能决策</TabsTrigger>
              <TabsTrigger value="reasoning">多步推理</TabsTrigger>
              <TabsTrigger value="causal">因果分析</TabsTrigger>
            </TabsList>

            <TabsContent value="decision" className="space-y-4">
              <Button
                onClick={handleMakeDecision}
                disabled={loading || !problem.trim()}
                className="w-full"
              >
                {loading ? "分析中..." : "进行智能决策"}
              </Button>
            </TabsContent>

            <TabsContent value="reasoning" className="space-y-4">
              <Button
                onClick={handleMultiStepReasoning}
                disabled={loading || !problem.trim()}
                className="w-full"
              >
                {loading ? "推理中..." : "执行多步推理"}
              </Button>
            </TabsContent>

            <TabsContent value="causal" className="space-y-4">
              <Button
                onClick={handleCausalAnalysis}
                disabled={loading || !problem.trim()}
                className="w-full"
              >
                {loading ? "分析中..." : "进行因果分析"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>分析结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTab === "decision" && result.recommendedOption && (
              <DecisionResultView result={result} />
            )}

            {activeTab === "reasoning" && result.steps && (
              <ReasoningStepsView result={result} />
            )}

            {activeTab === "causal" && result.rootCauses && (
              <CausalAnalysisView result={result} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * 决策结果视图
 */
function DecisionResultView({ result }: { result: any }) {
  return (
    <div className="space-y-6">
      {/* 推荐选项 */}
      <div className="border-l-4 border-green-500 pl-4 py-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              推荐方案
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {result.recommendedOption.description}
            </p>
          </div>
          <Badge variant="default">
            {(result.recommendedOption.confidence * 100).toFixed(0)}% 置信度
          </Badge>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          <p>
            <span className="font-medium">预期结果：</span>
            {result.recommendedOption.expectedOutcome}
          </p>
          <p>
            <span className="font-medium">成本/收益：</span>
            <span className="ml-2">
              成本 {(result.recommendedOption.estimatedCost * 100).toFixed(0)}% |
              收益 {(result.recommendedOption.estimatedBenefit * 100).toFixed(0)}%
            </span>
          </p>
        </div>

        {result.recommendedOption.risks.length > 0 && (
          <div className="mt-3 p-2 bg-red-50 rounded">
            <p className="text-sm font-medium text-red-900 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              潜在风险
            </p>
            <ul className="text-sm text-red-800 mt-1 list-disc list-inside">
              {result.recommendedOption.risks.map((risk: string, i: number) => (
                <li key={i}>{risk}</li>
              ))}
            </ul>
          </div>
        )}

        {result.recommendedOption.benefits.length > 0 && (
          <div className="mt-2 p-2 bg-green-50 rounded">
            <p className="text-sm font-medium text-green-900">潜在收益</p>
            <ul className="text-sm text-green-800 mt-1 list-disc list-inside">
              {result.recommendedOption.benefits.map((benefit: string, i: number) => (
                <li key={i}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 其他选项 */}
      {result.options && result.options.length > 1 && (
        <div className="space-y-2">
          <h3 className="font-semibold">其他可选方案</h3>
          {result.options.slice(1, 3).map((option: DecisionOption) => (
            <div key={option.id} className="p-3 border rounded-lg bg-gray-50">
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">{option.description}</p>
                <Badge variant="outline">
                  {(option.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">{option.reasoning}</p>
            </div>
          ))}
        </div>
      )}

      {/* 决策说明 */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-900 mb-2">决策分析</p>
        <Streamdown className="text-sm text-blue-800">{result.reasoning}</Streamdown>
      </div>
    </div>
  );
}

/**
 * 推理步骤视图
 */
function ReasoningStepsView({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">推理过程</h3>
        <Badge variant={result.achieved ? "default" : "secondary"}>
          {result.achieved ? "目标已达成" : "未达成"}
        </Badge>
      </div>

      <div className="space-y-3">
        {result.steps.map((step: ReasoningStep, index: number) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                {step.stepNumber}
              </div>
              {index < result.steps.length - 1 && (
                <div className="w-0.5 h-12 bg-blue-200 mt-1"></div>
              )}
            </div>

            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{step.action}</p>
                  <p className="text-sm text-gray-600 mt-1">{step.reasoning}</p>
                </div>
                <Badge variant="outline">
                  {(step.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium mb-2">推理总结</p>
        <p className="text-sm text-gray-700">{result.reasoning}</p>
        <p className="text-xs text-gray-500 mt-2">
          执行时间：{(result.executionTime / 1000).toFixed(2)}秒
        </p>
      </div>
    </div>
  );
}

/**
 * 因果分析视图
 */
function CausalAnalysisView({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 根本原因 */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            根本原因
          </h4>
          <ul className="space-y-1">
            {result.rootCauses.map((cause: string, i: number) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {cause}
              </li>
            ))}
          </ul>
        </div>

        {/* 直接原因 */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            直接原因
          </h4>
          <ul className="space-y-1">
            {result.directCauses.map((cause: string, i: number) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                {cause}
              </li>
            ))}
          </ul>
        </div>

        {/* 间接原因 */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-sm mb-2">间接原因</h4>
          <ul className="space-y-1">
            {result.indirectCauses.map((cause: string, i: number) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                {cause}
              </li>
            ))}
          </ul>
        </div>

        {/* 影响效应 */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-sm mb-2">影响效应</h4>
          <ul className="space-y-1">
            {result.effects.map((effect: string, i: number) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {effect}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 因果链 */}
      {result.causalChains && result.causalChains.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-3">因果链</h4>
          <div className="space-y-2">
            {result.causalChains.map((chain: string[], i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm flex-wrap">
                {chain.map((item: string, j: number) => (
                  <React.Fragment key={j}>
                    <span className="px-2 py-1 bg-white border rounded">{item}</span>
                    {j < chain.length - 1 && <ArrowRight className="h-4 w-4" />}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分析说明 */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-900 mb-2">分析说明</p>
        <Streamdown className="text-sm text-blue-800">{result.explanation}</Streamdown>
        <p className="text-xs text-blue-700 mt-2">
          置信度：{(result.confidence * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
