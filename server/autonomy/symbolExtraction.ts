/**
 * Symbol Extraction Engine
 * 
 * Extracts symbols (entities, concepts, attributes, actions, emotions) from conversations.
 * Tracks frequency, importance, and context for each symbol.
 */

export interface Symbol {
  id: string;
  name: string;
  type: 'entity' | 'concept' | 'attribute' | 'action' | 'emotion';
  frequency: number;
  importance: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  contexts: string[];
  relatedSymbols: string[];
}

export interface SymbolExtraction {
  sourceId?: string;
  timestamp: Date;
  extractedSymbols: Symbol[];
  totalSymbols: number;
}

export interface SymbolStatistics {
  totalUniqueSymbols: number;
  symbolsByType: Record<string, number>;
  averageFrequency: number;
  averageImportance: number;
  topSymbols: Symbol[];
}

class SymbolExtractionEngine {
  private symbols: Map<string, Symbol> = new Map();
  private extractions: SymbolExtraction[] = [];
  private maxExtractionHistory = 500;

  async extractSymbols(text: string, sourceId?: string): Promise<SymbolExtraction> {
    const extractedSymbols: Symbol[] = [];
    const timestamp = new Date();

    const entities = this.extractEntities(text);
    for (const entity of entities) {
      const symbol = this.createOrUpdateSymbol(entity, 'entity', text);
      extractedSymbols.push(symbol);
    }

    const concepts = this.extractConcepts(text);
    for (const concept of concepts) {
      const symbol = this.createOrUpdateSymbol(concept, 'concept', text);
      extractedSymbols.push(symbol);
    }

    const attributes = this.extractAttributes(text);
    for (const attribute of attributes) {
      const symbol = this.createOrUpdateSymbol(attribute, 'attribute', text);
      extractedSymbols.push(symbol);
    }

    const actions = this.extractActions(text);
    for (const action of actions) {
      const symbol = this.createOrUpdateSymbol(action, 'action', text);
      extractedSymbols.push(symbol);
    }

    const emotions = this.extractEmotions(text);
    for (const emotion of emotions) {
      const symbol = this.createOrUpdateSymbol(emotion, 'emotion', text);
      extractedSymbols.push(symbol);
    }

    const extraction: SymbolExtraction = {
      sourceId,
      timestamp,
      extractedSymbols,
      totalSymbols: extractedSymbols.length,
    };

    this.extractions.push(extraction);
    if (this.extractions.length > this.maxExtractionHistory) {
      this.extractions = this.extractions.slice(-this.maxExtractionHistory);
    }

    return extraction;
  }

  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:]/g, '');
      if (word.length > 2 && /^[A-Z]/.test(word)) {
        entities.push(word.toLowerCase());
      }
    }

    return [...new Set(entities)];
  }

  private extractConcepts(text: string): string[] {
    const concepts: string[] = [];
    const conceptPatterns = [
      /\b(learning|knowledge|understanding|growth|development|improvement|optimization|efficiency|performance)\b/gi,
      /\b(system|process|mechanism|framework|architecture|structure|pattern|model)\b/gi,
      /\b(problem|challenge|issue|solution|approach|method|strategy|technique)\b/gi,
    ];

    for (const pattern of conceptPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        concepts.push(match[0].toLowerCase());
      }
    }

    return [...new Set(concepts)];
  }

  private extractAttributes(text: string): string[] {
    const attributes: string[] = [];
    const attributePatterns = [
      /\b(good|bad|excellent|poor|fast|slow|efficient|inefficient|strong|weak|complex|simple)\b/gi,
      /\b(autonomous|intelligent|adaptive|flexible|robust|reliable|scalable|maintainable)\b/gi,
      /\b(high|low|large|small|long|short|deep|shallow|broad|narrow)\b/gi,
    ];

    for (const pattern of attributePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        attributes.push(match[0].toLowerCase());
      }
    }

    return [...new Set(attributes)];
  }

  private extractActions(text: string): string[] {
    const actions: string[] = [];
    const actionPatterns = [
      /\b(execute|implement|optimize|improve|enhance|modify|update|refactor|analyze|evaluate|assess)\b/gi,
      /\b(learn|understand|discover|identify|recognize|classify|categorize|organize)\b/gi,
      /\b(create|build|develop|design|architect|construct|establish|initiate)\b/gi,
      /\b(monitor|track|observe|measure|evaluate|test|verify|validate|check)\b/gi,
    ];

    for (const pattern of actionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        actions.push(match[0].toLowerCase());
      }
    }

    return [...new Set(actions)];
  }

  private extractEmotions(text: string): string[] {
    const emotions: string[] = [];
    const emotionPatterns = [
      /\b(happy|sad|excited|frustrated|confident|uncertain|optimistic|pessimistic)\b/gi,
      /\b(motivated|demotivated|inspired|discouraged|determined|hesitant)\b/gi,
      /\b(satisfied|dissatisfied|pleased|displeased|content|discontent)\b/gi,
    ];

    for (const pattern of emotionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        emotions.push(match[0].toLowerCase());
      }
    }

    return [...new Set(emotions)];
  }

  private createOrUpdateSymbol(
    name: string,
    type: Symbol['type'],
    context: string
  ): Symbol {
    const symbolId = `${type}:${name}`;
    let symbol = this.symbols.get(symbolId);

    if (symbol) {
      symbol.frequency += 1;
      symbol.lastOccurrence = new Date();
      if (!symbol.contexts.includes(context.substring(0, 100))) {
        symbol.contexts.push(context.substring(0, 100));
      }
    } else {
      symbol = {
        id: symbolId,
        name,
        type,
        frequency: 1,
        importance: this.calculateImportance(name, type),
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        contexts: [context.substring(0, 100)],
        relatedSymbols: [],
      };
      this.symbols.set(symbolId, symbol);
    }

    return symbol;
  }

  private calculateImportance(name: string, type: Symbol['type']): number {
    let importance = 50;
    const typeImportance: Record<string, number> = {
      entity: 70,
      concept: 80,
      attribute: 40,
      action: 75,
      emotion: 60,
    };
    importance = typeImportance[type] || 50;
    importance += Math.min(name.length * 2, 20);
    return Math.min(importance, 100);
  }

  getSymbolStatistics(): SymbolStatistics {
    const symbolsByType: Record<string, number> = {
      entity: 0,
      concept: 0,
      attribute: 0,
      action: 0,
      emotion: 0,
    };

    let totalFrequency = 0;
    let totalImportance = 0;

    for (const symbol of this.symbols.values()) {
      symbolsByType[symbol.type]++;
      totalFrequency += symbol.frequency;
      totalImportance += symbol.importance;
    }

    const topSymbols = Array.from(this.symbols.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      totalUniqueSymbols: this.symbols.size,
      symbolsByType,
      averageFrequency: this.symbols.size > 0 ? totalFrequency / this.symbols.size : 0,
      averageImportance: this.symbols.size > 0 ? totalImportance / this.symbols.size : 0,
      topSymbols,
    };
  }

  getTopSymbols(limit: number = 20): Symbol[] {
    return Array.from(this.symbols.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  getSymbol(name: string): Symbol | undefined {
    for (const symbol of this.symbols.values()) {
      if (symbol.name === name.toLowerCase()) {
        return symbol;
      }
    }
    return undefined;
  }

  getAllSymbols(): Symbol[] {
    return Array.from(this.symbols.values());
  }
}

export const symbolExtractionEngine = new SymbolExtractionEngine();
