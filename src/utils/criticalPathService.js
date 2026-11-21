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

const MAX_TASK_DURATION_DAYS = 365;

// Texto libre de tareas (nombre, entregable): al menos la mitad de los caracteres deben ser letras reales.
// Rechaza cosas como "empezar04953-.-¨$%¨$%()=)=?)¿¨:!" o "=?¿?=¿,-¸:-¨^*¨^*" que sí tienen alguna letra pero son basura.
const hasReasonableLetterRatio = (value, minRatio = 0.5) => {
  const clean = String(value ?? '').replace(/\s/g, '');
  if (clean.length === 0) return false;
  const letters = (clean.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) ?? []).length;
  return letters / clean.length >= minRatio;
};

// Tipos de dependencia soportados, en el orden en que PMI/MS Project los nombran.
export const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'];
export const DEPENDENCY_TYPE_LABELS = {
  FS: 'Fin a Inicio',
  SS: 'Inicio a Inicio',
  FF: 'Fin a Fin',
  SF: 'Inicio a Fin',
};

// Una predecesora se escribe "ID" (Fin a Inicio, sin retraso — el valor por defecto de
// siempre) o "ID:TIPO±N" donde TIPO es FS/SS/FF/SF y N son días de retraso (+) o adelanto
// (-). El ":" es obligatorio para el sufijo porque el ID ya puede traer guiones propios
// (ej. "T-01-01") y así no hay ambigüedad entre un guion del ID y un signo de retraso.
// Insensible a mayúsculas solo para el TIPO (FS/SS/FF/SF) — el ID se deja tal cual lo
// tenga guardado la tarea (hay proyectos con IDs en minúscula, ej. "act-010").
const PREDECESSOR_TOKEN_RE = /^([^:]+?)(?::(FS|SS|FF|SF)?([+-]\d+(?:\.\d+)?)?)?$/i;

export const parsePredecessorToken = (rawToken) => {
  const token = String(rawToken ?? '').trim();
  if (!token) return null;
  const match = token.match(PREDECESSOR_TOKEN_RE);
  if (!match) return null;
  const id = match[1]?.trim();
  if (!id) return null;
  const type = match[2] ? match[2].toUpperCase() : 'FS';
  const lagValue = match[3] !== undefined ? Number(match[3]) : 0;
  return { id, type, lag: Number.isFinite(lagValue) ? lagValue : 0 };
};

export const formatPredecessorToken = ({ id, type = 'FS', lag = 0 } = {}) => {
  const lagPart = lag ? `${lag > 0 ? '+' : ''}${lag}` : '';
  const suffix = type !== 'FS' ? `${type}${lagPart}` : lagPart;
  return suffix ? `${id}:${suffix}` : id;
};

export const normalizePredecessors = (value) => {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  const result = [];
  for (const raw of values) {
    const parsed = raw && typeof raw === 'object'
      ? {
          id: String(raw.id ?? '').trim(),
          type: DEPENDENCY_TYPES.includes(raw.type) ? raw.type : 'FS',
          lag: Number.isFinite(Number(raw.lag)) ? Number(raw.lag) : 0,
        }
      : parsePredecessorToken(raw);
    if (!parsed || !parsed.id || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    result.push(parsed);
  }
  return result;
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
    for (const predecessor of activity?.predecessors ?? []) {
      const predecessorId = predecessor.id;
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
    else if (!hasReasonableLetterRatio(name)) errors.push(`El nombre de la tarea ${activity.id} debe ser texto real, no una mezcla de números y símbolos.`);
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
      errors.push(`La tarea ${activity.id} debe tener un identificador.`);
    } else if (!/^[A-Za-z0-9_-]+$/.test(String(rawId).trim())) {
      errors.push(`El identificador "${rawId}" solo puede contener letras, números, guiones y guion bajo.`);
    }
    const deliverable = String(raw.deliverable ?? raw.output ?? '').trim();
    if (!deliverable) errors.push(`La tarea ${activity.id} no tiene un entregable definido.`);
    else if (!hasReasonableLetterRatio(deliverable)) errors.push(`El entregable de la tarea ${activity.id} debe ser texto real, no una mezcla de números y símbolos.`);

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
    for (const [label, timeValue] of [['optimista', optimistic], ['estimado', estimated], ['pesimista', pessimistic]]) {
      if (timeValue !== null && timeValue > MAX_TASK_DURATION_DAYS) {
        errors.push(`El tiempo ${label} de la tarea ${activity.id} no puede superar ${MAX_TASK_DURATION_DAYS} días — revisa si escribiste un cero de más.`);
      }
    }
    if (!positiveOrNull(activity.duration_days)) errors.push(`La duración esperada de la tarea ${activity.id} debe ser mayor que cero.`);

    const rawCost = firstNumber(raw.cost, raw.estimated_cost, raw.estimatedCost);
    if (rawCost !== null && rawCost < 0) errors.push(`El costo de la tarea ${activity.id} no puede ser negativo.`);
    const hasProgress = raw.progress_percentage !== undefined && raw.progress_percentage !== null && raw.progress_percentage !== '';
    if (hasProgress && (!Number.isFinite(Number(raw.progress_percentage)) || Number(raw.progress_percentage) < 0 || Number(raw.progress_percentage) > 100)) {
      errors.push(`El avance de la tarea ${activity.id} debe estar entre 0 y 100 %.`);
    }

    for (const predecessor of activity.predecessors) {
      const predecessorId = predecessor.id;
      if (predecessorId === activity.id) errors.push(`La tarea ${activity.id} no puede ser predecesora de sí misma.`);
      else if (!ids.has(predecessorId)) errors.push(`La tarea ${activity.id} referencia una predecesora inexistente: ${predecessorId}.`);
    }
  }

  const cycleActivities = getCycleActivities(activities);
  if (cycleActivities.length > 0) errors.push(`Existe un ciclo de dependencias entre: ${cycleActivities.join(', ')}.`);

  const adjacency = new Map(activities.map((activity) => [activity.id, new Set()]));
  for (const activity of activities) {
    for (const predecessor of activity.predecessors) {
      const predecessorId = predecessor.id;
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

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Avanza `days` días LABORABLES (lunes a viernes) desde `date`, saltando fines de
// semana — así las duraciones de las tareas (en días de trabajo) se convierten en
// fechas de calendario igual que lo hace ProjectLibre/MS Project, en vez de contar
// sábados y domingos como si fueran días productivos.
export const addWorkingDays = (date, days) => {
  const parsed = parseDate(date);
  if (!parsed) return null;
  const remaining = Math.round(Number(days) || 0);
  if (remaining <= 0) return formatDate(parsed);
  const current = new Date(parsed);
  let steps = 0;
  while (steps < remaining) {
    current.setDate(current.getDate() + 1);
    if (!isWeekend(current)) steps += 1;
  }
  return formatDate(current);
};

const topologicalOrder = (activities, validIds) => {
  const indegree = new Map(activities.map((activity) => [activity.id, 0]));
  const successors = new Map(activities.map((activity) => [activity.id, []]));
  for (const activity of activities) {
    for (const predecessor of activity.predecessors) {
      const predecessorId = predecessor.id;
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
  const starts = activities.filter((activity) => criticalIds.has(activity.id) && activity.predecessors.every((predecessor) => !criticalIds.has(predecessor.id) || lateFinish[predecessor.id] !== earlyStart[activity.id]));
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

  // Traduce una relación (tipo, lag) hacia una predecesora en el earlyStart mínimo que
  // esa relación le exige a la tarea actual. FS+0 (el único caso que existía antes) es
  // el caso por defecto: earlyStart >= earlyFinish de la predecesora.
  const impliedEarlyStart = (predecessor, duration) => {
    const predStart = earlyStart[predecessor.id];
    const predFinish = earlyFinish[predecessor.id];
    switch (predecessor.type) {
      case 'SS': return predStart + predecessor.lag;
      case 'FF': return predFinish + predecessor.lag - duration;
      case 'SF': return predStart + predecessor.lag - duration;
      case 'FS':
      default: return predFinish + predecessor.lag;
    }
  };

  const earlyStart = {};
  const earlyFinish = {};
  for (const id of order) {
    const activity = activities.find((item) => item.id === id);
    const duration = Number(activity.duration_days || 0);
    const candidates = activity.predecessors
      .filter((predecessor) => validIds.has(predecessor.id) && earlyFinish[predecessor.id] !== undefined)
      .map((predecessor) => impliedEarlyStart(predecessor, duration));
    earlyStart[id] = Math.max(0, candidates.length > 0 ? Math.max(...candidates) : 0);
    earlyFinish[id] = earlyStart[id] + duration;
  }

  const projectDuration = Math.max(...Object.values(earlyFinish), 0);

  // successorEdges: la dual de "predecessors" — por cada tarea, qué relaciones (tipo, lag)
  // declaran hacia ella sus sucesoras. Hace falta para el paso hacia atrás, porque ahí se
  // recorre en sentido contrario (de sucesoras ya calculadas hacia sus predecesoras).
  const successorEdges = new Map(activities.map((activity) => [activity.id, []]));
  for (const activity of activities) {
    for (const predecessor of activity.predecessors) {
      if (!successorEdges.has(predecessor.id)) continue;
      successorEdges.get(predecessor.id).push({ id: activity.id, type: predecessor.type, lag: predecessor.lag });
    }
  }

  // Dual de impliedEarlyStart: el candidato de lateFinish que una relación (tipo, lag)
  // hacia una sucesora le impone a esta tarea, visto desde las fechas tardías ya
  // calculadas de esa sucesora.
  const impliedLateFinish = (edge, duration) => {
    const succLateStart = lateStart[edge.id];
    const succLateFinish = lateFinish[edge.id];
    switch (edge.type) {
      case 'SS': return (succLateStart - edge.lag) + duration;
      case 'FF': return succLateFinish - edge.lag;
      case 'SF': return (succLateFinish - edge.lag) + duration;
      case 'FS':
      default: return succLateStart - edge.lag;
    }
  };

  const lateFinish = {};
  const lateStart = {};
  for (const id of [...order].reverse()) {
    const activity = activities.find((item) => item.id === id);
    const duration = Number(activity.duration_days || 0);
    const edges = (successorEdges.get(id) ?? []).filter((edge) => lateStart[edge.id] !== undefined && lateFinish[edge.id] !== undefined);
    lateFinish[id] = edges.length > 0 ? Math.min(...edges.map((edge) => impliedLateFinish(edge, duration))) : projectDuration;
    lateStart[id] = lateFinish[id] - duration;
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
    const start = startDate ? addWorkingDays(options.startDate ?? options.start_date, taskStart) : null;
    const end = startDate ? addWorkingDays(options.startDate ?? options.start_date, Math.max(taskStart, Math.ceil(taskFinish) - 1)) : null;
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
    const calculatedEnd = parseDate(addWorkingDays(project.start_date, Math.max(0, Math.ceil(result.projectDuration) - 1)));
    if (plannedEnd && calculatedEnd && plannedEnd < calculatedEnd) {
      result.warnings.push(`La fecha de fin del proyecto (${project.end_date}) es anterior al cronograma calculado (${formatDate(calculatedEnd)}).`);
    }
  }
  return result;
};
