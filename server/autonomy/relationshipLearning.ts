/**
 * Relationship Learning Engine
 * 
 * Learns relationships between symbols through pattern matching and co-occurrence analysis.
 */

export interface SymbolRelationship {
  id: string;
  sourceSymbol: string;
  targetSymbol: string;
  relationshipType: 'causal' | 'correlative' | 'hierarchical' | 'associative';
  strength: number;
  frequency: number;
  evidence: string[];
  firstDiscovered: Date;
  lastUpdated: Date;
}

export interface RelationshipStatistics {
  totalRelationships: number;
  relationshipsByType: Record<string, number>;
  averageStrength: number;
  strongestRelationships: SymbolRelationship[];
}

class RelationshipLearningEngine {
  private relationships: Map<string, SymbolRelationship> = new Map();
  private relationshipHistory: SymbolRelationship[] = [];
  private maxHistorySize = 1000;

  async learnRelationships(
    text: string,
    sourceSymbols: Map<string, string>
  ): Promise<SymbolRelationship[]> {
    const discovered: SymbolRelationship[] = [];

    // Extract symbol pairs from text
    const symbolArray = Array.from(sourceSymbols.keys());

    for (let i = 0; i < symbolArray.length; i++) {
      for (let j = i + 1; j < symbolArray.length; j++) {
        const symbol1 = symbolArray[i];
        const symbol2 = symbolArray[j];

        // Check for co-occurrence
        if (this.hasCoOccurrence(text, symbol1, symbol2)) {
          const relationship = this.createOrUpdateRelationship(
            symbol1,
            symbol2,
            text
          );
          discovered.push(relationship);
        }
      }
    }

    return discovered;
  }

  private hasCoOccurrence(text: string, symbol1: string, symbol2: string): boolean {
    const regex1 = new RegExp(`\\b${symbol1}\\b`, 'gi');
    const regex2 = new RegExp(`\\b${symbol2}\\b`, 'gi');

    const matches1 = text.match(regex1) || [];
    const matches2 = text.match(regex2) || [];

    return matches1.length > 0 && matches2.length > 0;
  }

  private createOrUpdateRelationship(
    source: string,
    target: string,
    context: string
  ): SymbolRelationship {
    const relationshipId = `${source}-->${target}`;
    let relationship = this.relationships.get(relationshipId);

    if (relationship) {
      relationship.frequency += 1;
      relationship.lastUpdated = new Date();
      relationship.strength = Math.min(relationship.strength + 5, 100);
      if (!relationship.evidence.includes(context.substring(0, 50))) {
        relationship.evidence.push(context.substring(0, 50));
      }
    } else {
      relationship = {
        id: relationshipId,
        sourceSymbol: source,
        targetSymbol: target,
        relationshipType: this.inferRelationshipType(source, target, context),
        strength: this.calculateInitialStrength(source, target),
        frequency: 1,
        evidence: [context.substring(0, 50)],
        firstDiscovered: new Date(),
        lastUpdated: new Date(),
      };
      this.relationships.set(relationshipId, relationship);
    }

    this.relationshipHistory.push(relationship);
    if (this.relationshipHistory.length > this.maxHistorySize) {
      this.relationshipHistory = this.relationshipHistory.slice(-this.maxHistorySize);
    }

    return relationship;
  }

  private inferRelationshipType(
    source: string,
    target: string,
    context: string
  ): SymbolRelationship['relationshipType'] {
    const lowerContext = context.toLowerCase();

    if (
      /\bcause|lead|result|trigger|cause\b/.test(lowerContext)
    ) {
      return 'causal';
    }

    if (/\bcorrelat|associate|relate|connect\b/.test(lowerContext)) {
      return 'correlative';
    }

    if (/\bparent|child|hierarchy|level|above|below\b/.test(lowerContext)) {
      return 'hierarchical';
    }

    return 'associative';
  }

  private calculateInitialStrength(source: string, target: string): number {
    let strength = 50;
    strength += Math.min(source.length + target.length, 20);
    return Math.min(strength, 100);
  }

  getRelationshipStatistics(): RelationshipStatistics {
    const relationshipsByType: Record<string, number> = {
      causal: 0,
      correlative: 0,
      hierarchical: 0,
      associative: 0,
    };

    let totalStrength = 0;

    for (const rel of this.relationships.values()) {
      relationshipsByType[rel.relationshipType]++;
      totalStrength += rel.strength;
    }

    const strongestRelationships = Array.from(this.relationships.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10);

    return {
      totalRelationships: this.relationships.size,
      relationshipsByType,
      averageStrength:
        this.relationships.size > 0
          ? totalStrength / this.relationships.size
          : 0,
      strongestRelationships,
    };
  }

  getStrongestRelationships(limit: number = 20): SymbolRelationship[] {
    return Array.from(this.relationships.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }

  getRelationshipsFor(symbolId: string): SymbolRelationship[] {
    return Array.from(this.relationships.values()).filter(
      (rel) => rel.sourceSymbol === symbolId || rel.targetSymbol === symbolId
    );
  }
}

export const relationshipLearningEngine = new RelationshipLearningEngine();
