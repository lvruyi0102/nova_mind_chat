/**
 * Rule Learning Engine
 * 
 * Learns rules and patterns from relationships and observations.
 * Implements rule merging, optimization, and feedback-based refinement.
 */

export interface Rule {
  id: string;
  antecedent: string[];
  consequent: string[];
  confidence: number;
  support: number;
  frequency: number;
  evidence: string[];
  successCount: number;
  failureCount: number;
  createdAt: Date;
  lastApplied: Date;
}

export interface RuleStatistics {
  totalRules: number;
  averageConfidence: number;
  averageSupport: number;
  strongestRules: Rule[];
  successRate: number;
}

class RuleLearningEngine {
  private rules: Map<string, Rule> = new Map();
  private ruleHistory: Rule[] = [];
  private maxHistorySize = 1000;

  async learnRules(
    observations: Array<{
      antecedent: string[];
      consequent: string[];
      evidence: string;
    }>
  ): Promise<Rule[]> {
    const learnedRules: Rule[] = [];

    for (const obs of observations) {
      const rule = this.createOrUpdateRule(obs.antecedent, obs.consequent, obs.evidence);
      learnedRules.push(rule);
    }

    return learnedRules;
  }

  private createOrUpdateRule(
    antecedent: string[],
    consequent: string[],
    evidence: string
  ): Rule {
    const ruleId = this.generateRuleId(antecedent, consequent);
    let rule = this.rules.get(ruleId);

    if (rule) {
      rule.frequency += 1;
      rule.lastApplied = new Date();
      rule.confidence = Math.min(rule.confidence + 2, 100);
      rule.support = Math.min(rule.support + 1, 100);
      if (!rule.evidence.includes(evidence.substring(0, 50))) {
        rule.evidence.push(evidence.substring(0, 50));
      }
    } else {
      rule = {
        id: ruleId,
        antecedent,
        consequent,
        confidence: this.calculateInitialConfidence(antecedent, consequent),
        support: this.calculateInitialSupport(antecedent, consequent),
        frequency: 1,
        evidence: [evidence.substring(0, 50)],
        successCount: 0,
        failureCount: 0,
        createdAt: new Date(),
        lastApplied: new Date(),
      };
      this.rules.set(ruleId, rule);
    }

    this.ruleHistory.push(rule);
    if (this.ruleHistory.length > this.maxHistorySize) {
      this.ruleHistory = this.ruleHistory.slice(-this.maxHistorySize);
    }

    return rule;
  }

  private generateRuleId(antecedent: string[], consequent: string[]): string {
    const antStr = antecedent.sort().join('|');
    const consStr = consequent.sort().join('|');
    return `${antStr}=>${consStr}`;
  }

  private calculateInitialConfidence(antecedent: string[], consequent: string[]): number {
    let confidence = 60;
    confidence += Math.min(antecedent.length * 5, 20);
    confidence += Math.min(consequent.length * 5, 20);
    return Math.min(confidence, 100);
  }

  private calculateInitialSupport(antecedent: string[], consequent: string[]): number {
    let support = 50;
    support += Math.min((antecedent.length + consequent.length) * 3, 30);
    return Math.min(support, 100);
  }

  async applyRule(ruleId: string, success: boolean, feedback?: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    if (success) {
      rule.successCount += 1;
      rule.confidence = Math.min(rule.confidence + 5, 100);
    } else {
      rule.failureCount += 1;
      rule.confidence = Math.max(rule.confidence - 10, 0);
    }

    if (feedback) {
      rule.evidence.push(feedback.substring(0, 50));
    }
  }

  getRuleStatistics(): RuleStatistics {
    let totalConfidence = 0;
    let totalSupport = 0;

    for (const rule of this.rules.values()) {
      totalConfidence += rule.confidence;
      totalSupport += rule.support;
    }

    const strongestRules = Array.from(this.rules.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    const totalApplications = Array.from(this.rules.values()).reduce(
      (sum, r) => sum + r.successCount + r.failureCount,
      0
    );
    const totalSuccesses = Array.from(this.rules.values()).reduce(
      (sum, r) => sum + r.successCount,
      0
    );

    return {
      totalRules: this.rules.size,
      averageConfidence:
        this.rules.size > 0 ? totalConfidence / this.rules.size : 0,
      averageSupport: this.rules.size > 0 ? totalSupport / this.rules.size : 0,
      strongestRules,
      successRate:
        totalApplications > 0 ? (totalSuccesses / totalApplications) * 100 : 0,
    };
  }

  getStrongestRules(limit: number = 20): Rule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  getApplicableRules(antecedent: string[]): Rule[] {
    return Array.from(this.rules.values()).filter((rule) => {
      return antecedent.every((item) => rule.antecedent.includes(item));
    });
  }

  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }
}

export const ruleLearningEngine = new RuleLearningEngine();
