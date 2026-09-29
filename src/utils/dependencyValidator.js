import {
  calculatePertDuration,
  computeCriticalPath,
  normalizeActivity,
  normalizePredecessors,
  validateActivityNetwork,
} from './criticalPathService.js';

const activityName = (activity) => activity.activity_name ?? activity.name ?? activity.task_name ?? activity.id;

const hasCycle = (activities) => {
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  const visiting = new Set();
  const visited = new Set();
  const cycle = [];
  const visit = (id, path) => {
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      cycle.push(...path.slice(start), id);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const activity = activityMap.get(id);
    for (const predecessorId of activity?.predecessors ?? []) {
      if (activityMap.has(predecessorId)) visit(predecessorId, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const activity of activities) visit(activity.id, []);
  return cycle;
};

export const checkCircularDependencies = (activities = []) => {
  const normalized = (Array.isArray(activities) ? activities : []).map(normalizeActivity);
  const cycleActivities = hasCycle(normalized);
  return { hasCycle: cycleActivities.length > 0, cycleActivities: [...new Set(cycleActivities)] };
};

export const validatePredecessorReferences = (activities = []) => {
  const normalized = (Array.isArray(activities) ? activities : []).map(normalizeActivity);
  const validIds = new Set(normalized.map((activity) => activity.id));
  const invalidReferences = [];
  for (const activity of normalized) {
    for (const predecessorId of activity.predecessors) {
      if (!validIds.has(predecessorId)) {
        invalidReferences.push({
          activityId: activity.id,
          activityName: activityName(activity),
          invalidPredecessorId: predecessorId,
        });
      }
    }
  }
  return { isValid: invalidReferences.length === 0, invalidReferences };
};

export const checkOrphanedSuccessors = (activities = []) => {
  const normalized = (Array.isArray(activities) ? activities : []).map(normalizeActivity);
  const referenced = new Set(normalized.flatMap((activity) => activity.predecessors));
  const orphaned = normalized
    .filter((activity) => activity.predecessors.length === 0 && !referenced.has(activity.id) && normalized.length > 1)
    .map((activity) => ({ id: activity.id, name: activityName(activity) }));
  const rootTasks = normalized
    .filter((activity) => activity.predecessors.length === 0)
    .map((activity) => ({ id: activity.id, name: activityName(activity) }));
  return { orphaned, rootTasks };
};

export const validateActivityDurations = (activities = []) => {
  const invalidDurations = [];
  const rawActivities = Array.isArray(activities) ? activities : [];
  rawActivities.forEach((rawActivity, index) => {
    const activity = normalizeActivity(rawActivity, index);
    const hasEstimates = [
      rawActivity?.optimal_time ?? rawActivity?.optimistic_time ?? rawActivity?.optimisticTime ?? rawActivity?.a,
      rawActivity?.estimated_time ?? rawActivity?.most_likely_time ?? rawActivity?.mostLikelyTime ?? rawActivity?.estimatedTime ?? rawActivity?.m,
      rawActivity?.pessimistic_time ?? rawActivity?.pessimisticTime ?? rawActivity?.b,
    ].every((value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0);
    const hasLegacyDuration = Number(rawActivity?.duration_days ?? rawActivity?.duration ?? rawActivity?.time) > 0;
    if (!hasEstimates && !hasLegacyDuration) {
      invalidDurations.push({
        activityId: activity.id,
        activityName: activityName(rawActivity),
        duration: activity.duration_days,
        issue: 'La duración debe ser mayor que cero',
      });
    }
  });
  return { isValid: invalidDurations.length === 0, invalidDurations };
};

export const validateActivityCosts = (activities = []) => {
  const invalidCosts = [];
  const rawActivities = Array.isArray(activities) ? activities : [];
  rawActivities.forEach((rawActivity, index) => {
    const activity = normalizeActivity(rawActivity, index);
    const hasCost = rawActivity?.cost !== undefined || rawActivity?.estimated_cost !== undefined || rawActivity?.estimatedCost !== undefined;
    const rawCost = Number(rawActivity?.cost ?? rawActivity?.estimated_cost ?? rawActivity?.estimatedCost);
    if (hasCost && (!Number.isFinite(rawCost) || rawCost < 0)) {
      invalidCosts.push({
        activityId: activity.id,
        activityName: activityName(rawActivity),
        cost: rawActivity?.cost ?? rawActivity?.estimated_cost ?? rawActivity?.estimatedCost,
        issue: 'El costo debe ser un número no negativo',
      });
    }
  });
  return { isValid: invalidCosts.length === 0, invalidCosts };
};

export const calculateCriticalPath = (activities = []) => computeCriticalPath(activities);

export const validateAllActivities = (activities = []) => {
  const network = validateActivityNetwork(activities);
  const normalized = network.activities;
  const references = validatePredecessorReferences(normalized);
  const orphaned = checkOrphanedSuccessors(normalized);
  const durations = validateActivityDurations(normalized);
  const costs = validateActivityCosts(normalized);
  const errors = [...network.errors];
  if (!references.isValid) {
    errors.push(`Referencias inválidas: ${references.invalidReferences.map((reference) => `${reference.activityName} → ${reference.invalidPredecessorId}`).join(', ')}`);
  }
  if (!durations.isValid) {
    errors.push(`Duraciones inválidas: ${durations.invalidDurations.map((item) => `${item.activityName} (${item.duration})`).join(', ')}`);
  }
  if (!costs.isValid) {
    errors.push(`Costos inválidos: ${costs.invalidCosts.map((item) => `${item.activityName} ($${item.cost})`).join(', ')}`);
  }
  const warnings = [...network.warnings];
  if (orphaned.orphaned.length > 0) {
    warnings.push(`Tareas independientes sin relación con el resto: ${orphaned.orphaned.map((item) => item.name).join(', ')}.`);
  }
  return {
    isValid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    details: {
      circularDependencies: checkCircularDependencies(normalized),
      invalidReferences: references,
      orphanedSuccessors: orphaned,
      invalidDurations: durations,
      invalidCosts: costs,
    },
  };
};

export { calculatePertDuration, normalizeActivity, normalizePredecessors };
