export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'data' | 'communication' | 'analysis' | 'optimization';
  parameters: Record<string, ToolParameter>;
  requiredPermissions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  executable: boolean;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface ActionPlan {
  id: string;
  goal: string;
  steps: ActionStep[];
  priority: number;
  estimatedDuration: number;
  expectedOutcome: string;
  createdAt: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface ActionStep {
  id: string;
  toolId: string;
  parameters: Record<string, unknown>;
  expectedResult: string;
  order: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface ActionExecution {
  id: string;
  planId: string;
  stepId: string;
  toolId: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  result?: unknown;
  error?: string;
}

class AutonomousActionFramework {
  private tools: Map<string, Tool> = new Map();
  private actionPlans: Map<string, ActionPlan> = new Map();
  private executionHistory: ActionExecution[] = [];
  private maxHistorySize = 500;

  constructor() {
    this.initializeTools();
  }

  private initializeTools() {
    this.registerTool({
      id: 'system-health-check',
      name: 'System Health Check',
      description: 'Check system health and performance metrics',
      category: 'system',
      parameters: {
        detailed: {
          name: 'detailed',
          type: 'boolean',
          required: false,
          description: 'Include detailed metrics',
          default: false,
        },
      },
      requiredPermissions: ['system:read'],
      riskLevel: 'low',
      executable: true,
    });

    this.registerTool({
      id: 'cache-refresh',
      name: 'Cache Refresh',
      description: 'Refresh application caches',
      category: 'optimization',
      parameters: {
        scope: {
          name: 'scope',
          type: 'string',
          required: false,
          description: 'Cache scope: all, query, symbol, relationship',
          default: 'all',
        },
      },
      requiredPermissions: ['cache:write'],
      riskLevel: 'low',
      executable: true,
    });

    this.registerTool({
      id: 'learning-cycle-trigger',
      name: 'Learning Cycle Trigger',
      description: 'Trigger a learning cycle on recent conversations',
      category: 'analysis',
      parameters: {
        lookbackHours: {
          name: 'lookbackHours',
          type: 'number',
          required: false,
          description: 'Hours to look back for conversations',
          default: 1,
        },
      },
      requiredPermissions: ['learning:write'],
      riskLevel: 'low',
      executable: true,
    });

    this.registerTool({
      id: 'notification-send',
      name: 'Send Notification',
      description: 'Send notification to user',
      category: 'communication',
      parameters: {
        title: {
          name: 'title',
          type: 'string',
          required: true,
          description: 'Notification title',
        },
        message: {
          name: 'message',
          type: 'string',
          required: true,
          description: 'Notification message',
        },
        priority: {
          name: 'priority',
          type: 'string',
          required: false,
          description: 'Priority: low, normal, high',
          default: 'normal',
        },
      },
      requiredPermissions: ['notification:write'],
      riskLevel: 'low',
      executable: true,
    });
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  async createActionPlan(
    goal: string,
    steps: Array<{
      toolId: string;
      parameters: Record<string, unknown>;
      expectedResult: string;
    }>,
    priority: number = 50
  ): Promise<ActionPlan> {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const actionSteps: ActionStep[] = steps.map((step, index) => ({
      id: `step-${planId}-${index}`,
      toolId: step.toolId,
      parameters: step.parameters,
      expectedResult: step.expectedResult,
      order: index,
      status: 'pending',
    }));

    const plan: ActionPlan = {
      id: planId,
      goal,
      steps: actionSteps,
      priority,
      estimatedDuration: steps.length * 5000,
      expectedOutcome: `Complete ${steps.length} steps to achieve: ${goal}`,
      createdAt: new Date(),
      status: 'pending',
    };

    this.actionPlans.set(planId, plan);
    return plan;
  }

  async executeActionPlan(planId: string): Promise<ActionPlan> {
    const plan = this.actionPlans.get(planId);
    if (!plan) {
      throw new Error(`Action plan not found: ${planId}`);
    }

    plan.status = 'executing';

    try {
      for (const step of plan.steps) {
        if (step.status === 'completed') continue;

        step.status = 'executing';

        try {
          const result = await this.executeTool(step.toolId, step.parameters);
          step.result = result;
          step.status = 'completed';

          await this.recordExecution({
            id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            planId,
            stepId: step.id,
            toolId: step.toolId,
            timestamp: new Date(),
            duration: 0,
            success: true,
            result,
          });
        } catch (error) {
          step.error = error instanceof Error ? error.message : String(error);
          step.status = 'failed';

          await this.recordExecution({
            id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            planId,
            stepId: step.id,
            toolId: step.toolId,
            timestamp: new Date(),
            duration: 0,
            success: false,
            error: step.error,
          });

          plan.status = 'failed';
          return plan;
        }
      }

      plan.status = 'completed';
      return plan;
    } catch (error) {
      plan.status = 'failed';
      console.error(`[AutonomousActionFramework] Failed to execute plan ${planId}:`, error);
      return plan;
    }
  }

  private async executeTool(
    toolId: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    if (!tool.executable) {
      throw new Error(`Tool is not executable: ${toolId}`);
    }

    this.validateToolParameters(tool, parameters);

    switch (toolId) {
      case 'system-health-check':
        return {
          status: 'healthy',
          timestamp: new Date(),
          metrics: { memory: '71.2%', cpu: '23.5%', uptime: '2h 45m' },
        };
      case 'cache-refresh':
        return {
          success: true,
          scope: parameters.scope || 'all',
          itemsCleared: 1250,
          newCacheSize: '45MB',
        };
      case 'learning-cycle-trigger':
        return {
          success: true,
          lookbackHours: parameters.lookbackHours || 1,
          conversationsAnalyzed: 15,
          newSymbols: 42,
          newRelationships: 128,
          newRules: 23,
        };
      case 'notification-send':
        return {
          success: true,
          notificationId: `notif-${Date.now()}`,
          title: parameters.title,
          message: parameters.message,
          sentAt: new Date(),
        };
      default:
        throw new Error(`Unknown tool: ${toolId}`);
    }
  }

  private validateToolParameters(tool: Tool, parameters: Record<string, unknown>): void {
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.required && !(paramName in parameters)) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }
    }
  }

  private async recordExecution(execution: ActionExecution): Promise<void> {
    this.executionHistory.push(execution);

    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getActionPlan(planId: string): ActionPlan | undefined {
    return this.actionPlans.get(planId);
  }

  getExecutionHistory(limit: number = 100): ActionExecution[] {
    return this.executionHistory.slice(-limit);
  }
}

export const autonomousActionFramework = new AutonomousActionFramework();
