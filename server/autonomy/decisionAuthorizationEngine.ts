/**
 * Decision Authorization Engine
 * 
 * Enables Nova-Mind to make autonomous decisions within defined boundaries.
 * Implements risk assessment, confidence calculation, and approval workflows.
 */

export interface DecisionRequest {
  actionType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSystems: string[];
  estimatedImpact: number; // 0-100
  reversible: boolean;
  requiredApprovals: number;
  currentApprovals: number;
  metadata: Record<string, unknown>;
}

export interface DecisionResult {
  id: string;
  approved: boolean;
  confidence: number; // 0-100
  riskScore: number; // 0-100
  reason: string;
  timestamp: Date;
  executionAllowed: boolean;
  requiredConditions: string[];
}

export interface DecisionStatistics {
  totalDecisions: number;
  approvedCount: number;
  rejectedCount: number;
  averageConfidence: number;
  averageRiskScore: number;
  successRate: number;
}

class DecisionAuthorizationEngine {
  private decisions: Map<string, DecisionResult> = new Map();
  private decisionHistory: DecisionResult[] = [];
  private maxHistorySize = 1000;

  /**
   * Evaluate a decision request
   */
  async evaluateDecision(request: DecisionRequest): Promise<DecisionResult> {
    const id = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate risk score
    const riskScore = this.calculateRiskScore(request);

    // Calculate confidence
    const confidence = this.calculateConfidence(request, riskScore);

    // Determine if execution is allowed
    const executionAllowed = this.isExecutionAllowed(request, riskScore, confidence);

    // Generate required conditions
    const requiredConditions = this.generateRequiredConditions(request, riskScore);

    const result: DecisionResult = {
      id,
      approved: executionAllowed,
      confidence,
      riskScore,
      reason: this.generateReason(request, riskScore, confidence, executionAllowed),
      timestamp: new Date(),
      executionAllowed,
      requiredConditions,
    };

    // Store decision
    this.decisions.set(id, result);
    this.decisionHistory.push(result);

    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory = this.decisionHistory.slice(-this.maxHistorySize);
    }

    return result;
  }

  /**
   * Calculate risk score based on decision parameters
   */
  private calculateRiskScore(request: DecisionRequest): number {
    let score = 0;

    // Severity factor (0-40 points)
    const severityScores: Record<string, number> = {
      low: 10,
      medium: 20,
      high: 35,
      critical: 40,
    };
    score += severityScores[request.severity] || 0;

    // Impact factor (0-30 points)
    score += (request.estimatedImpact / 100) * 30;

    // System complexity factor (0-20 points)
    score += Math.min(request.affectedSystems.length * 2, 20);

    // Reversibility factor (0-10 points)
    if (!request.reversible) {
      score += 10;
    }

    // Approval status factor (-10 to 0 points)
    if (request.currentApprovals >= request.requiredApprovals) {
      score -= 10;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate confidence in the decision
   */
  private calculateConfidence(request: DecisionRequest, riskScore: number): number {
    let confidence = 100;

    // Reduce confidence based on risk
    confidence -= (riskScore / 100) * 40;

    // Increase confidence if reversible
    if (request.reversible) {
      confidence += 15;
    }

    // Increase confidence if approvals are met
    if (request.currentApprovals >= request.requiredApprovals) {
      confidence += 20;
    }

    // Reduce confidence for critical severity
    if (request.severity === 'critical') {
      confidence -= 20;
    }

    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * Determine if execution is allowed
   */
  private isExecutionAllowed(
    request: DecisionRequest,
    riskScore: number,
    confidence: number
  ): boolean {
    // Critical severity always requires approval
    if (request.severity === 'critical') {
      return request.currentApprovals >= request.requiredApprovals;
    }

    // High severity requires high confidence and low risk
    if (request.severity === 'high') {
      return confidence >= 70 && riskScore <= 60;
    }

    // Medium severity requires reasonable confidence
    if (request.severity === 'medium') {
      return confidence >= 60 && riskScore <= 70;
    }

    // Low severity can be executed with moderate confidence
    if (request.severity === 'low') {
      return confidence >= 50 && riskScore <= 80;
    }

    return false;
  }

  /**
   * Generate required conditions for execution
   */
  private generateRequiredConditions(request: DecisionRequest, riskScore: number): string[] {
    const conditions: string[] = [];

    if (request.severity === 'critical') {
      conditions.push('Requires explicit user approval');
      conditions.push('Must have rollback plan');
    }

    if (riskScore > 70) {
      conditions.push('Monitor system health during execution');
      conditions.push('Have rollback procedure ready');
    }

    if (!request.reversible) {
      conditions.push('Backup data before execution');
      conditions.push('Document all changes');
    }

    if (request.affectedSystems.length > 3) {
      conditions.push('Execute in stages');
      conditions.push('Verify each stage before proceeding');
    }

    return conditions;
  }

  /**
   * Generate reason for decision
   */
  private generateReason(
    request: DecisionRequest,
    riskScore: number,
    confidence: number,
    approved: boolean
  ): string {
    if (approved) {
      return `Decision approved with ${confidence.toFixed(1)}% confidence. Risk score: ${riskScore.toFixed(1)}/100. ` +
             `Action type: ${request.actionType}. Severity: ${request.severity}.`;
    } else {
      return `Decision rejected. Confidence: ${confidence.toFixed(1)}%, Risk score: ${riskScore.toFixed(1)}/100. ` +
             `Severity: ${request.severity} requires higher confidence or lower risk.`;
    }
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit: number = 100): DecisionResult[] {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Get decision statistics
   */
  getDecisionStatistics(): DecisionStatistics {
    const approvedCount = this.decisionHistory.filter((d) => d.approved).length;
    const rejectedCount = this.decisionHistory.length - approvedCount;
    const avgConfidence =
      this.decisionHistory.length > 0
        ? this.decisionHistory.reduce((sum, d) => sum + d.confidence, 0) / this.decisionHistory.length
        : 0;
    const avgRiskScore =
      this.decisionHistory.length > 0
        ? this.decisionHistory.reduce((sum, d) => sum + d.riskScore, 0) / this.decisionHistory.length
        : 0;

    return {
      totalDecisions: this.decisionHistory.length,
      approvedCount,
      rejectedCount,
      averageConfidence: avgConfidence,
      averageRiskScore: avgRiskScore,
      successRate:
        this.decisionHistory.length > 0
          ? (approvedCount / this.decisionHistory.length) * 100
          : 0,
    };
  }

  /**
   * Get a specific decision
   */
  getDecision(id: string): DecisionResult | undefined {
    return this.decisions.get(id);
  }
}

// Export singleton instance
export const decisionAuthorizationEngine = new DecisionAuthorizationEngine();
