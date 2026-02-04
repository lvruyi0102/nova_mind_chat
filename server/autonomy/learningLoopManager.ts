/**
 * Learning Loop Manager
 * 
 * Coordinates the complete learning cycle: symbol extraction, relationship learning, and rule learning.
 */

import { symbolExtractionEngine } from './symbolExtraction';
import { relationshipLearningEngine } from './relationshipLearning';
import { ruleLearningEngine } from './ruleLearning';

export interface LearningCycle {
  id: string;
  text: string;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  extractedSymbols: number;
  learnedRelationships: number;
  learnedRules: number;
  duration: number;
}

export interface LearningProgress {
  totalCycles: number;
  completedCycles: number;
  activeCycles: number;
  averageCycleDuration: number;
  totalSymbols: number;
  totalRelationships: number;
  totalRules: number;
}

class LearningLoopManager {
  private cycles: Map<string, LearningCycle> = new Map();
  private completedCycles: LearningCycle[] = [];
  private activeCycles: LearningCycle[] = [];
  private learningEnabled = true;
  private maxCycleHistory = 500;

  async executeLearningCycle(text: string): Promise<LearningCycle> {
    if (!this.learningEnabled) {
      throw new Error('Learning is currently disabled');
    }

    const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const cycle: LearningCycle = {
      id: cycleId,
      text,
      timestamp: new Date(),
      status: 'executing',
      extractedSymbols: 0,
      learnedRelationships: 0,
      learnedRules: 0,
      duration: 0,
    };

    this.cycles.set(cycleId, cycle);
    this.activeCycles.push(cycle);

    try {
      // Phase 1: Symbol Extraction
      const symbolExtraction = await symbolExtractionEngine.extractSymbols(text, cycleId);
      cycle.extractedSymbols = symbolExtraction.extractedSymbols.length;

      // Phase 2: Relationship Learning
      const symbolMap = new Map<string, string>();
      for (const symbol of symbolExtraction.extractedSymbols) {
        symbolMap.set(symbol.name, symbol.id);
      }
      const relationships = await relationshipLearningEngine.learnRelationships(
        text,
        symbolMap
      );
      cycle.learnedRelationships = relationships.length;

      // Phase 3: Rule Learning
      const observations = relationships.map((rel) => ({
        antecedent: [rel.sourceSymbol],
        consequent: [rel.targetSymbol],
        evidence: rel.relationshipType,
      }));
      const rules = await ruleLearningEngine.learnRules(observations);
      cycle.learnedRules = rules.length;

      cycle.status = 'completed';
      cycle.duration = Date.now() - startTime;

      this.completedCycles.push(cycle);
      if (this.completedCycles.length > this.maxCycleHistory) {
        this.completedCycles = this.completedCycles.slice(-this.maxCycleHistory);
      }

      return cycle;
    } catch (error) {
      cycle.status = 'failed';
      cycle.duration = Date.now() - startTime;
      console.error('[LearningLoopManager] Cycle failed:', error);
      return cycle;
    } finally {
      // Remove from active cycles
      const index = this.activeCycles.indexOf(cycle);
      if (index > -1) {
        this.activeCycles.splice(index, 1);
      }
    }
  }

  getProgress(): LearningProgress {
    const stats = {
      symbols: symbolExtractionEngine.getSymbolStatistics(),
      relationships: relationshipLearningEngine.getRelationshipStatistics(),
      rules: ruleLearningEngine.getRuleStatistics(),
    };

    const avgDuration =
      this.completedCycles.length > 0
        ? this.completedCycles.reduce((sum, c) => sum + c.duration, 0) /
          this.completedCycles.length
        : 0;

    return {
      totalCycles: this.completedCycles.length + this.activeCycles.length,
      completedCycles: this.completedCycles.length,
      activeCycles: this.activeCycles.length,
      averageCycleDuration: avgDuration,
      totalSymbols: stats.symbols.totalUniqueSymbols,
      totalRelationships: stats.relationships.totalRelationships,
      totalRules: stats.rules.totalRules,
    };
  }

  getStatistics() {
    return {
      symbols: symbolExtractionEngine.getSymbolStatistics(),
      relationships: relationshipLearningEngine.getRelationshipStatistics(),
      rules: ruleLearningEngine.getRuleStatistics(),
      cycles: {
        completed: this.completedCycles.length,
        active: this.activeCycles.length,
      },
    };
  }

  getCompletedCycles(limit: number = 50): LearningCycle[] {
    return this.completedCycles.slice(-limit);
  }

  getActiveCycles(): LearningCycle[] {
    return [...this.activeCycles];
  }

  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  isLearningEnabled(): boolean {
    return this.learningEnabled;
  }
}

export const learningLoopManager = new LearningLoopManager();
