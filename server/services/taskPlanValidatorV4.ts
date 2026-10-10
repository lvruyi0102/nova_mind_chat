/**
 * Deterministic validation for model-proposed V4 task plans.
 * A model may propose a DAG; this module decides whether that proposal is safe
 * and structurally valid enough to persist. It never executes tools.
 */

export interface ProposedPlanStepV4 {
  id: string;
  description: string;
  capabilityId: string;
  dependsOn: string[];
  acceptanceCriteria: string[];
  estimatedCost?: number;
  estimatedDurationMs?: number;
}

export interface ProposedTaskPlanV4 {
  goal: string;
  steps: ProposedPlanStepV4[];
  finalAcceptanceCriteria: string[];
}

export interface PlanValidationOptionsV4 {
  allowedCapabilityIds: ReadonlySet<string>;
  maxSteps?: number;
  maxTotalEstimatedCost?: number;
  maxTotalEstimatedDurationMs?: number;
}

export interface PlanValidationResultV4 {
  valid: boolean;
  errors: string[];
  topologicalOrder: string[];
  estimatedCost: number;
  estimatedDurationMs: number;
}

function topologicalSort(steps: ProposedPlanStepV4[]): {
  order: string[];
  cycle: boolean;
} {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const step of steps) {
    indegree.set(step.id, step.dependsOn.length);
    for (const dependency of step.dependsOn) {
      const list = dependents.get(dependency) ?? [];
      list.push(step.id);
      dependents.set(dependency, list);
    }
  }

  const ready = steps.filter((step) => indegree.get(step.id) === 0).map((step) => step.id);
  const order: string[] = [];

  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    for (const dependentId of dependents.get(id) ?? []) {
      const next = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, next);
      if (next === 0) ready.push(dependentId);
    }
  }

  return { order, cycle: order.length !== byId.size };
}

export function validateProposedTaskPlanV4(
  plan: ProposedTaskPlanV4,
  options: PlanValidationOptionsV4,
): PlanValidationResultV4 {
  const errors: string[] = [];
  const maxSteps = options.maxSteps ?? 30;

  if (!plan.goal.trim()) errors.push("Plan goal must not be empty");
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    errors.push("Plan must contain at least one step");
  }
  if (plan.steps.length > maxSteps) {
    errors.push(`Plan has ${plan.steps.length} steps; limit is ${maxSteps}`);
  }
  if (!Array.isArray(plan.finalAcceptanceCriteria) || plan.finalAcceptanceCriteria.length === 0) {
    errors.push("Plan must declare final acceptance criteria");
  }

  const seen = new Set<string>();
  for (const step of plan.steps) {
    if (!step.id.trim()) errors.push("Every step must have a non-empty id");
    if (seen.has(step.id)) errors.push(`Duplicate step id: ${step.id}`);
    seen.add(step.id);

    if (!step.description.trim()) errors.push(`Step ${step.id || "(empty id)"} must have a description`);
    if (!step.capabilityId.trim()) errors.push(`Step ${step.id} must declare a capabilityId`);
    else if (!options.allowedCapabilityIds.has(step.capabilityId)) {
      errors.push(`Step ${step.id} uses unregistered capability: ${step.capabilityId}`);
    }

    if (!Array.isArray(step.dependsOn)) {
      errors.push(`Step ${step.id} dependsOn must be an array`);
    } else {
      const dependencySet = new Set<string>();
      for (const dependency of step.dependsOn) {
        if (dependency === step.id) errors.push(`Step ${step.id} cannot depend on itself`);
        if (dependencySet.has(dependency)) errors.push(`Step ${step.id} repeats dependency ${dependency}`);
        dependencySet.add(dependency);
      }
    }

    if (!Array.isArray(step.acceptanceCriteria) || step.acceptanceCriteria.length === 0 ||
        step.acceptanceCriteria.some((criterion) => !criterion.trim())) {
      errors.push(`Step ${step.id} must have non-empty acceptance criteria`);
    }
    if (step.estimatedCost !== undefined &&
        (!Number.isFinite(step.estimatedCost) || step.estimatedCost < 0)) {
      errors.push(`Step ${step.id} has invalid estimatedCost`);
    }
    if (step.estimatedDurationMs !== undefined &&
        (!Number.isFinite(step.estimatedDurationMs) || step.estimatedDurationMs < 0)) {
      errors.push(`Step ${step.id} has invalid estimatedDurationMs`);
    }
  }

  for (const step of plan.steps) {
    for (const dependency of step.dependsOn ?? []) {
      if (!seen.has(dependency)) {
        errors.push(`Step ${step.id} depends on unknown step: ${dependency}`);
      }
    }
  }

  const sorted = topologicalSort(plan.steps);
  if (sorted.cycle) errors.push("Plan dependency graph contains a cycle");

  const estimatedCost = plan.steps.reduce((sum, step) => sum + (step.estimatedCost ?? 0), 0);
  const estimatedDurationMs = plan.steps.reduce((sum, step) => sum + (step.estimatedDurationMs ?? 0), 0);

  if (options.maxTotalEstimatedCost !== undefined && estimatedCost > options.maxTotalEstimatedCost) {
    errors.push(`Estimated cost ${estimatedCost} exceeds budget ${options.maxTotalEstimatedCost}`);
  }
  if (
    options.maxTotalEstimatedDurationMs !== undefined &&
    estimatedDurationMs > options.maxTotalEstimatedDurationMs
  ) {
    errors.push(
      `Estimated duration ${estimatedDurationMs}ms exceeds budget ${options.maxTotalEstimatedDurationMs}ms`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    topologicalOrder: sorted.order,
    estimatedCost,
    estimatedDurationMs,
  };
}
