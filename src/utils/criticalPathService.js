const EPSILON = 1e-8;

const firstNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const positiveOrNull = (value) => {
  const number = firstNumber(value);
  return number !== null && number > 0 ? number : null;
};

export const normalizePredecessors = (value) => {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
};

export const getActivityName = (activity) => {
  return String(activity?.activity_name ?? activity?.name ?? activity?.task_name ?? '').trim();
};

export const getActivityEstimates = (activity = {}) => {
  const legacyDuration = firstNumber(activity.duration_days, activity.duration, activity.time);
  const optimistic = firstNumber(
    activity.optimal_time,
    activity.optimistic_time,
    activity.optimisticTime,
    activity.a
  );
  const estimated = firstNumber(
    activity.estimated_time,
    activity.most_likely_time,
    activity.mostLikelyTime,
    activity.estimatedTime,
    activity.m
  );
  const pessimistic = firstNumber(
    activity.pessimistic_time,
    activity.pessimisticTime,
    activity.b
  );
  const fallback = positiveOrNull(legacyDuration) ?? positiveOrNull(estimated) ?? 1;
  return {
    optimistic: positiveOrNull(optimistic) ?? fallback,
    estimated: positiveOrNull(estimated) ?? positiveOrNull(optimistic) ?? fallback,
    pessimistic: positiveOrNull(pessimistic) ?? positiveOrNull(estimated) ?? positiveOrNull(optimistic) ?? fallback,
  };
};

const hasThreePointEstimate = (activity = {}) => {
  return firstNumber(activity.optimal_time, activity.optimistic_time, activity.optimisticTime, activity.a) !== null &&
    firstNumber(activity.estimated_time, activity.most_likely_time, activity.mostLikelyTime, activity.estimatedTime, activity.m) !== null &&
    firstNumber(activity.pessimistic_time, activity.pessimisticTime, activity.b) !== null;
};

export const calculatePertDuration = (activity = {}) => {
  const estimates = getActivityEstimates(activity);
  if (hasThreePointEstimate(activity)) {
    return round((estimates.optimistic + 4 * estimates.estimated + estimates.pessimistic) / 6);
  }
  return round(estimates.estimated);
};

export const normalizeActivity = (activity, index = 0) => {
  const source = activity && typeof activity === 'object' ? activity : {};
  const estimates = getActivityEstimates(source);
  const duration = hasThreePointEstimate(source)
    ? calculatePertDuration(source)
    : positiveOrNull(source.duration_days) ?? positiveOrNull(source.duration) ?? calculatePertDuration(source);
  const id = String(source.id ?? source.task_id ?? `T-${index + 1}`).trim();
  const progress = firstNumber(source.progress_percentage, source.progress) ?? 0;
  const cost = firstNumber(source.cost, source.estimated_cost, source.estimatedCost) ?? 0;
  return {
    ...source,
    id,
    activity_name: getActivityName(source) || `Tarea ${id}`,
    name: getActivityName(source) || `Tarea ${id}`,
    deliverable: String(source.deliverable ?? source.output ?? '').trim(),
    optimal_time: round(estimates.optimistic),
    estimated_time: round(estimates.estimated),
    pessimistic_time: round(estimates.pessimistic),
    duration_days: round(duration || 0),
    cost: round(Math.max(0, cost)),
    progress_percentage: round(Math.min(100, Math.max(0, progress))),
    predecessors: normalizePredecessors(source.predecessors),
    assigned_members: Array.isArray(source.assigned_members) ? source.assigned_members : [],
  };
};

const getCycleActivities = (activities) => {
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  const state = new Map();
  const stack = [];
  const cycles = [];
  const visit = (id) => {
    state.set(id, 1);
    stack.push(id);
    const activity = activityMap.get(id);
    for (const predecessorId of activity?.predecessors ?? []) {
      if (!activityMap.has(predecessorId) || predecessorId === id) continue;
      if (state.get(predecessorId) === 1) {
        const start = stack.indexOf(predecessorId);
        cycles.push([...stack.slice(start), predecessorId]);
      } else if (!state.has(predecessorId)) {
        visit(predecessorId);
      }
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const activity of activities) {
    if (!state.has(activity.id)) visit(activity.id);
  }
  return [...new Set(cycles.flat())];
};

const hasDuplicateIds = (activities) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const activity of activities) {
    if (seen.has(activity.id)) duplicates.add(activity.id);
    seen.add(activity.id);
  }
  return [...duplicates];
};

export const validateActivityNetwork = (rawActivities = []) => {
  const rawList = Array.isArray(rawActivities) ? rawActivities : [];
  const activities = rawList.map((activity, index) => normalizeActivity(activity, index));
  const errors = [];
  const warnings = [];
  if (activities.length === 0) {
    errors.push('Debe ingresar al menos una tarea.');
    return { isValid: false, errors, warnings, activities, details: { duplicateIds: [], cycleActivities: [], isolated: [] } };
  }

  const duplicateIds = hasDuplicateIds(activities);
  if (duplicateIds.length > 0) errors.push(`Los identificadores deben ser únicos: ${duplicateIds.join(', ')}.`);

  const ids = new Set(activities.map((activity) => activity.id));
  for (let index = 0; index < activities.length; index += 1) {
    const raw = rawList[index] && typeof rawList[index] === 'object' ? rawList[index] : {};
    const activity = activities[index];
    const rawId = raw.id ?? raw.task_id;
    const name = getActivityName(raw);
    if (!name) errors.push(`La tarea ${activity.id} no tiene nombre.`);
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
      errors.push(`La tarea ${activity.id} debe tener un identificador.`);
    }
    if (!String(raw.deliverable ?? raw.output ?? '').trim()) warnings.push(`La tarea ${activity.id} no tiene un entregable definido.`);

    const optimistic = firstNumber(raw.optimal_time, raw.optimistic_time, raw.optimisticTime, raw.a);
    const estimated = firstNumber(raw.estimated_time, raw.most_likely_time, raw.mostLikelyTime, raw.estimatedTime, raw.m);
    const pessimistic = firstNumber(raw.pessimistic_time, raw.pessimisticTime, raw.b);
    const legacyDuration = firstNumber(raw.duration_days, raw.duration, raw.time);
    if (optimistic === null || estimated === null || pessimistic === null) {
      if (legacyDuration !== null && legacyDuration > 0) {
        warnings.push(`La tarea ${activity.id} usa una duración heredada; completa sus tres estimaciones para activar el cálculo PERT.`);
      } else {
        errors.push(`La tarea ${activity.id} debe tener tiempos optimista, estimado y pesimista mayores que cero.`);
      }
    } else if (optimistic <= 0 || estimated <= 0 || pessimistic <= 0) {
      errors.push(`La tarea ${activity.id} debe tener tiempos optimista, estimado y pesimista mayores que cero.`);
    }
    if (optimistic !== null && estimated !== null && pessimistic !== null && (optimistic > estimated || estimated > pessimistic)) {
      errors.push(`La tarea ${activity.id} debe cumplir optimista ≤ estimado ≤ pesimista.`);
    }
    if (!positiveOrNull(activity.duration_days)) errors.push(`La duración esperada de la tarea ${activity.id} debe ser mayor que cero.`);

    const rawCost = firstNumber(raw.cost, raw.estimated_cost, raw.estimatedCost);
    if (rawCost !== null && rawCost < 0) errors.push(`El costo de la tarea ${activity.id} no puede ser negativo.`);
    const hasProgress = raw.progress_percentage !== undefined && raw.progress_percentage !== null && raw.progress_percentage !== '';
    if (hasProgress && (!Number.isFinite(Number(raw.progress_percentage)) || Number(raw.progress_percentage) < 0 || Number(raw.progress_percentage) > 100)) {
      errors.push(`El avance de la tarea ${activity.id} debe estar entre 0 y 100 %.`);
    }

    for (const predecessorId of activity.predecessors) {
      if (predecessorId === activity.id) errors.push(`La tarea ${activity.id} no puede ser predecesora de sí misma.`);
      else if (!ids.has(predecessorId)) errors.push(`La tarea ${activity.id} referencia una predecesora inexistente: ${predecessorId}.`);
    }
  }

  const cycleActivities = getCycleActivities(activities);
  if (cycleActivities.length > 0) errors.push(`Existe un ciclo de dependencias entre: ${cycleActivities.join(', ')}.`);

  const adjacency = new Map(activities.map((activity) => [activity.id, new Set()]));
  for (const activity of activities) {
    for (const predecessorId of activity.predecessors) {
      if (!ids.has(predecessorId) || predecessorId === activity.id) continue;
      adjacency.get(activity.id).add(predecessorId);
      adjacency.get(predecessorId).add(activity.id);
    }
  }
  const visited = new Set();
  const components = [];
  for (const activity of activities) {
    if (visited.has(activity.id)) continue;
    const component = [];
    const queue = [activity.id];
    visited.add(activity.id);
    while (queue.length > 0) {
      const current = queue.shift();
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }
  const isolated = components.filter((component) => component.length === 1).map((component) => component[0]);
  if (components.length > 1) warnings.push('Existen grupos de tareas sin dependencias entre sí; se calcularán como redes independientes.');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    activities,
    details: { duplicateIds, cycleActivities, isolated, components },
  };
};

const parseDate = (value) => {
  const normalized = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(`${normalized}T00:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? date : null;
};

export const formatDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addCalendarDays = (date, days) => {
  const parsed = parseDate(date);
  if (!parsed) return null;
  parsed.setDate(parsed.getDate() + Math.round(Number(days) || 0));
  return formatDate(parsed);
};

const topologicalOrder = (activities, validIds) => {
  const indegree = new Map(activities.map((activity) => [activity.id, 0]));
  const successors = new Map(activities.map((activity) => [activity.id, []]));
  for (const activity of activities) {
    for (const predecessorId of activity.predecessors) {
      if (!validIds.has(predecessorId) || predecessorId === activity.id) continue;
      indegree.set(activity.id, indegree.get(activity.id) + 1);
      successors.get(predecessorId).push(activity.id);
    }
  }
  const queue = activities.filter((activity) => indegree.get(activity.id) === 0).map((activity) => activity.id);
  const order = [];
  while (queue.length > 0) {
    queue.sort((left, right) => activities.findIndex((activity) => activity.id === left) - activities.findIndex((activity) => activity.id === right));
    const current = queue.shift();
    order.push(current);
    for (const successorId of successors.get(current)) {
      indegree.set(successorId, indegree.get(successorId) - 1);
      if (indegree.get(successorId) === 0) queue.push(successorId);
    }
  }
  return { order, successors };
};

const findCriticalPaths = (activities, earlyStart, earlyFinish, lateStart, lateFinish, projectDuration, order, successors) => {
  const criticalIds = new Set(activities.filter((activity) => lateStart[activity.id] - earlyStart[activity.id] <= EPSILON).map((activity) => activity.id));
  const starts = activities.filter((activity) => criticalIds.has(activity.id) && activity.predecessors.every((id) => !criticalIds.has(id) || lateFinish[id] !== earlyStart[activity.id]));
  const paths = [];
  const walk = (id, path) => {
    const nextPath = [...path, id];
    const next = (successors.get(id) ?? []).filter((successorId) => criticalIds.has(successorId) && lateStart[successorId] - earlyStart[successorId] <= EPSILON);
    if (next.length === 0) {
      if (nextPath.length > 0) paths.push(nextPath);
      return;
    }
    next.forEach((successorId) => walk(successorId, nextPath));
  };
  starts.forEach((activity) => walk(activity.id, []));
  if (paths.length === 0 && projectDuration > 0) {
    const terminal = activities.find((activity) => (successors.get(activity.id) ?? []).length === 0);
    if (terminal) paths.push([terminal.id]);
  }
  return paths;
};

export const computeCriticalPath = (rawActivities = [], options = {}) => {
  const validation = validateActivityNetwork(rawActivities);
  const activities = validation.activities;
  const errors = [...validation.errors];
  const warnings = [...validation.warnings];
  const result = {
    valid: validation.isValid,
    isValid: validation.isValid,
    errors,
    warnings,
    criticalPath: [],
    criticalPaths: [],
    criticalDuration: 0,
    projectDuration: 0,
    earlyStart: {},
    earlyFinish: {},
    lateStart: {},
    lateFinish: {},
    totalFloat: {},
    tasks: activities,
    schedule: [],
  };
  if (activities.length === 0) return result;

  const validIds = new Set(activities.map((activity) => activity.id));
  const { order, successors } = topologicalOrder(activities, validIds);
  if (order.length !== activities.length) {
    if (!errors.some((error) => error.startsWith('Existe un ciclo'))) {
      errors.push('No se puede ordenar la red de tareas por sus dependencias.');
    }
    result.valid = false;
    result.isValid = false;
    result.errors = errors;
    return result;
  }

  const earlyStart = {};
  const earlyFinish = {};
  for (const id of order) {
    const activity = activities.find((item) => item.id === id);
    const predecessorFinishes = activity.predecessors
      .filter((predecessorId) => validIds.has(predecessorId) && earlyFinish[predecessorId] !== undefined)
      .map((predecessorId) => earlyFinish[predecessorId]);
    earlyStart[id] = predecessorFinishes.length > 0 ? Math.max(...predecessorFinishes) : 0;
    earlyFinish[id] = earlyStart[id] + Number(activity.duration_days || 0);
  }

  const projectDuration = Math.max(...Object.values(earlyFinish), 0);
  const lateFinish = {};
  const lateStart = {};
  for (const id of [...order].reverse()) {
    const nextSuccessors = (successors.get(id) ?? []).filter((successorId) => lateStart[successorId] !== undefined);
    lateFinish[id] = nextSuccessors.length > 0
      ? Math.min(...nextSuccessors.map((successorId) => lateStart[successorId]))
      : projectDuration;
    const activity = activities.find((item) => item.id === id);
    lateStart[id] = lateFinish[id] - Number(activity.duration_days || 0);
  }

  const totalFloat = {};
  for (const id of order) totalFloat[id] = round(lateStart[id] - earlyStart[id]);
  const criticalPaths = findCriticalPaths(activities, earlyStart, earlyFinish, lateStart, lateFinish, projectDuration, order, successors);
  const criticalPath = [...(criticalPaths[0] ?? [])];
  const criticalSet = new Set(criticalPaths.flat());
  const startDate = parseDate(options.startDate ?? options.start_date);
  const schedule = activities.map((activity) => {
    const duration = Number(activity.duration_days || 0);
    const taskStart = earlyStart[activity.id];
    const taskFinish = earlyFinish[activity.id];
    const start = startDate ? addCalendarDays(options.startDate ?? options.start_date, taskStart) : null;
    const end = startDate ? addCalendarDays(options.startDate ?? options.start_date, Math.max(taskStart, Math.ceil(taskFinish) - 1)) : null;
    return {
      ...activity,
      early_start: round(taskStart),
      early_finish: round(taskFinish),
      late_start: round(lateStart[activity.id]),
      late_finish: round(lateFinish[activity.id]),
      total_float: totalFloat[activity.id],
      is_critical: criticalSet.has(activity.id),
      start_date: start,
      finish_date: end,
    };
  });

  return {
    valid: errors.length === 0,
    isValid: errors.length === 0,
    errors,
    warnings,
    criticalPath,
    criticalPaths,
    criticalDuration: round(projectDuration),
    projectDuration: round(projectDuration),
    earlyStart,
    earlyFinish,
    lateStart,
    lateFinish,
    totalFloat,
    tasks: activities,
    schedule,
  };
};

export const validateProjectSchedule = (project = {}, activities = []) => {
  const result = computeCriticalPath(activities, { startDate: project.start_date });
  if (result.projectDuration > 0 && project.end_date) {
    const plannedEnd = parseDate(project.end_date);
    const calculatedEnd = parseDate(addCalendarDays(project.start_date, Math.max(0, Math.ceil(result.projectDuration) - 1)));
    if (plannedEnd && calculatedEnd && plannedEnd < calculatedEnd) {
      result.warnings.push(`La fecha de fin del proyecto (${project.end_date}) es anterior al cronograma calculado (${formatDate(calculatedEnd)}).`);
    }
  }
  return result;
};
