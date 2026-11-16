import React from 'react';
import { AlertTriangle, CheckCircle, Download, ListChecks } from 'lucide-react';
import { normalizeActivity, validateProjectSchedule, addCalendarDays } from './criticalPathService';
import { validateAllActivities } from './dependencyValidator';

const collectActivities = (project) => {
  const activities = [];
  for (const phase of project?.wbs_phases ?? []) {
    if (!phase || typeof phase !== 'object') continue;
    const phaseActivities = Array.isArray(phase.activities) ? phase.activities : [];
    for (const rawActivity of phaseActivities) {
      activities.push({
        ...(rawActivity && typeof rawActivity === 'object' ? rawActivity : {}),
        phase_id: phase.id,
        phase_name: phase.phase_name ?? `Fase ${phase.phase_order ?? ''}`,
        phase_order: phase.phase_order ?? 0,
      });
    }
  }
  return activities;
};

const formatNumber = (value) => Number.isFinite(Number(value)) ? Number(value).toFixed(2).replace(/\.00$/, '') : '—';
const formatFixed2 = (value) => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
const formatDateValue = (value) => value || 'Sin fecha';

const downloadCsv = (filename, headers, rows) => {
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const ValidationMessages = ({ errors = [], warnings = [] }) => (
  <div className="mt-3 space-y-2">
    {errors.length > 0 && (
      <div>
        <p className="text-sm font-semibold text-red-900">Errores</p>
        <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
          {errors.map((error, index) => <li key={`error-${index}`}>{error}</li>)}
        </ul>
      </div>
    )}
    {warnings.length > 0 && (
      <div>
        <p className="text-sm font-semibold text-red-900">Advertencias</p>
        <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
          {warnings.map((warning, index) => <li key={`warning-${index}`}>{warning}</li>)}
        </ul>
      </div>
    )}
  </div>
);

export function WBSValidationPanel({ project }) {
  const activities = collectActivities(project);
  if (activities.length === 0) return null;
  const validation = validateAllActivities(activities);
  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <p className="font-semibold text-green-900">Planificación válida</p>
            <p className="text-sm text-green-800">{activities.length} tareas con dependencias consistentes.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
        <div className="flex-1">
          <p className="font-semibold text-red-900">Validación de la planificación</p>
          <ValidationMessages errors={validation.errors} warnings={validation.warnings} />
        </div>
      </div>
    </div>
  );
}

const getScheduleResult = (project, activities) => validateProjectSchedule(project, activities);

export function CriticalPathPanel({ project }) {
  const activities = collectActivities(project);
  if (activities.length === 0) return null;
  const result = getScheduleResult(project, activities);
  if (!result.isValid || result.criticalPath.length === 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-600 mt-1" size={24} />
          <div>
            <p className="font-semibold text-red-900">Ruta crítica no disponible</p>
            <p className="text-sm text-red-800">Corrige las dependencias antes de calcular la ruta crítica.</p>
            <ValidationMessages errors={result.errors} warnings={result.warnings} />
          </div>
        </div>
      </div>
    );
  }
  const paths = result.criticalPaths.length > 0 ? result.criticalPaths : [result.criticalPath];
  const lastTask = result.schedule.find((task) => task.id === result.criticalPath[result.criticalPath.length - 1]);
  const criticalTaskCount = new Set(paths.flat()).size;
  return (
    <div className="bg-blueprint-50 border-l-4 border-blueprint-500 p-4 rounded">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-blueprint-900">Ruta crítica del proyecto</p>
          <p className="text-sm text-blueprint-800 mt-1">Duración PERT calculada: <strong>{formatNumber(result.criticalDuration)} días</strong></p>
          <p className="text-xs text-blueprint-700 mt-1">Fecha calculada: {formatDateValue(lastTask?.finish_date)}</p>
        </div>
        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">{criticalTaskCount} tareas</span>
      </div>
      {result.warnings.length > 0 && <ValidationMessages warnings={result.warnings} />}
      <div className="mt-3 space-y-2 overflow-x-auto">
        {paths.map((path, pathIndex) => (
          <div key={`critical-path-${pathIndex}`} className="flex items-center gap-1 min-w-max">
            {pathIndex > 0 && <span className="text-xs text-gray-500 mr-1">o</span>}
            {path.map((id, index) => {
              const task = activities.map((activity) => normalizeActivity(activity)).find((activity) => activity.id === id);
              return (
                <React.Fragment key={`${pathIndex}-${id}`}>
                  <div className="bg-red-600 text-white rounded px-2 py-1 text-xs font-medium whitespace-nowrap text-center">
                    <p>{id}</p>
                    <p>{task?.activity_name ?? 'Tarea'}</p>
                  </div>
                  {index < path.length - 1 && <span className="text-red-600 font-bold">→</span>}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CronogramaPanel({ project }) {
  const activities = collectActivities(project);
  if (activities.length === 0) return null;
  const result = getScheduleResult(project, activities);
  if (!result.isValid || result.projectDuration <= 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
        <p className="font-semibold text-red-900">Cronograma no disponible</p>
        <ValidationMessages errors={result.errors} warnings={result.warnings} />
      </div>
    );
  }
  const scheduleRows = [...result.schedule].sort((left, right) => left.early_start - right.early_start || left.id.localeCompare(right.id));
  const downloadRows = scheduleRows.map((task) => [task.id, task.phase_name, task.activity_name, task.start_date, task.finish_date, task.duration_days, task.total_float, task.is_critical ? 'Sí' : 'No']);

  const ROW_HEIGHT = 52;
  const rowIndexById = new Map(scheduleRows.map((task, index) => [task.id, index]));
  const bars = scheduleRows.map((task) => {
    const left = (task.early_start / result.projectDuration) * 100;
    const width = Math.min(100 - left, Math.max(1.5, (task.duration_days / result.projectDuration) * 100));
    return { ...task, left, width };
  });
  const barById = new Map(bars.map((bar) => [bar.id, bar]));

  const arrows = [];
  bars.forEach((bar, rowIndex) => {
    (bar.predecessors ?? []).forEach((predId) => {
      const predBar = barById.get(predId);
      const predRow = rowIndexById.get(predId);
      if (!predBar || predRow === undefined) return;
      const x1 = predBar.left + predBar.width;
      const y1 = predRow + 0.5;
      const x2 = bar.left;
      const y2 = rowIndex + 0.5;
      const midX = (x1 + x2) / 2;
      arrows.push({ key: `${predId}->${bar.id}`, d: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`, critical: bar.is_critical && predBar.is_critical });
    });
  });

  const AXIS_TICKS = 6;
  const axisTicks = Array.from({ length: AXIS_TICKS + 1 }, (_, i) => {
    const dayOffset = Math.round((result.projectDuration * i) / AXIS_TICKS);
    return { pct: (i / AXIS_TICKS) * 100, date: addCalendarDays(project.start_date, dayOffset) ?? '' };
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><ListChecks size={20} /> Cronograma</h3>
          <p className="text-sm text-gray-600 mt-1">Estilo diagrama de Gantt (como ProjectLibre/MS Project). Barras en rojo: tareas con holgura cero (ruta crítica). Las flechas muestran las dependencias.</p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv('cronograma.csv', ['ID', 'Fase', 'Tarea', 'Inicio', 'Fin', 'Duración PERT', 'Holgura', 'Crítica'], downloadRows)}
          className="flex items-center gap-2 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium"
        >
          <Download size={16} /> Descargar cronograma
        </button>
      </div>
      {result.warnings.length > 0 && <div className="mb-4 rounded bg-red-50 border border-red-300 p-3"><ValidationMessages warnings={result.warnings} /></div>}
      <div className="overflow-x-auto">
        <div className="min-w-[900px] flex">
          {/* Label column */}
          <div className="w-[260px] shrink-0">
            <div className="h-8 border-b border-gray-200" />
            {scheduleRows.map((task) => (
              <div key={task.id} className="flex flex-col justify-center border-b border-gray-100 pr-3" style={{ height: ROW_HEIGHT }}>
                <p className={`text-sm font-medium truncate ${task.is_critical ? 'text-red-700' : 'text-gray-900'}`}>{task.id} · {task.activity_name}</p>
                <p className="text-xs text-gray-500 truncate">{task.phase_name}</p>
              </div>
            ))}
          </div>

          {/* Timeline column */}
          <div className="flex-1 min-w-0">
            {/* Date axis header */}
            <div className="relative h-8 border-b border-gray-200">
              {axisTicks.map((tick) => (
                <div key={tick.pct} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${tick.pct}%`, transform: tick.pct === 0 ? 'none' : tick.pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
                  <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap">{tick.date}</span>
                  <span className="w-px flex-1 bg-gray-200 mt-1" />
                </div>
              ))}
            </div>

            {/* Bars + dependency arrows */}
            <div className="relative" style={{ height: bars.length * ROW_HEIGHT }}>
              {axisTicks.map((tick) => (
                <div key={tick.pct} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${tick.pct}%` }} />
              ))}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 100 ${bars.length}`} preserveAspectRatio="none">
                <defs>
                  <marker id="arrow-crit" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#dc2626" />
                  </marker>
                  <marker id="arrow-normal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
                  </marker>
                </defs>
                {arrows.map((arrow) => (
                  <path
                    key={arrow.key}
                    d={arrow.d}
                    fill="none"
                    stroke={arrow.critical ? '#dc2626' : '#94a3b8'}
                    strokeWidth="0.25"
                    vectorEffect="non-scaling-stroke"
                    markerEnd={arrow.critical ? 'url(#arrow-crit)' : 'url(#arrow-normal)'}
                  />
                ))}
              </svg>
              {bars.map((bar, rowIndex) => (
                <div key={bar.id} className="absolute left-0 right-0 border-b border-gray-100" style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}>
                  <div
                    className={`absolute h-6 top-1/2 -translate-y-1/2 rounded flex items-center px-1.5 ${bar.is_critical ? 'bg-red-600' : 'bg-blueprint-500'}`}
                    style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                    title={`${bar.id}: ${bar.start_date} — ${bar.finish_date} (${bar.duration_days} días)`}
                  >
                    <span className="text-[10px] text-white font-medium whitespace-nowrap overflow-hidden text-ellipsis">{bar.duration_days}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-600" /> Ruta crítica</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blueprint-500" /> No crítica</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-gray-400" /> Dependencia (predecesora → tarea)</span>
      </div>
    </div>
  );
}

export function DiccionarioEDTPanel({ project }) {
  const activities = collectActivities(project);
  if (activities.length === 0) return null;
  const result = getScheduleResult(project, activities);
  const scheduleById = new Map(result.schedule.map((task) => [task.id, task]));
  const rows = [];
  for (const phase of project.wbs_phases ?? []) {
    for (const rawActivity of phase.activities ?? []) {
      const activity = normalizeActivity(rawActivity, rows.length);
      const schedule = scheduleById.get(activity.id);
      rows.push({
        wbs: `${phase.phase_order ?? 0}.${(phase.activities ?? []).indexOf(rawActivity) + 1}`,
        phase: phase.phase_name,
        task: activity,
        schedule,
      });
    }
  }
  const downloadRows = rows.map(({ wbs, phase, task, schedule }) => [wbs, task.id, phase, task.activity_name, task.deliverable, task.predecessors.join(' | '), task.optimal_time, task.estimated_time, task.pessimistic_time, schedule?.duration_days ?? task.duration_days, schedule?.start_date ?? '', schedule?.finish_date ?? '', schedule?.total_float ?? '', schedule?.is_critical ? 'Sí' : 'No', task.responsable ?? task.assigned_role ?? '']);
  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Diccionario EDT</h3>
          <p className="text-sm text-gray-600 mt-1">Entregables, estimaciones PERT, predecesoras, fechas y holguras.</p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv('diccionario-edt.csv', ['EDT', 'ID', 'Fase', 'Tarea', 'Entregable', 'Predecesoras', 'Optimista', 'Estimado', 'Pesimista', 'PERT', 'Inicio', 'Fin', 'Holgura', 'Crítica', 'Responsable'], downloadRows)}
          className="flex items-center gap-2 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium"
        >
          <Download size={16} /> Descargar diccionario EDT
        </button>
      </div>
      {result.errors.length > 0 && <div className="mb-4 rounded bg-red-50 border border-red-300 p-3"><ValidationMessages errors={result.errors} /></div>}
      {result.warnings.length > 0 && <div className="mb-4 rounded bg-red-50 border border-red-300 p-3"><ValidationMessages warnings={result.warnings} /></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1250px]">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-gray-200 bg-white text-left shadow-sm">
              <th className="px-2 py-2">EDT</th>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Tarea</th>
              <th className="px-2 py-2">Entregable</th>
              <th className="px-2 py-2">Predecesoras</th>
              <th className="px-2 py-2 text-right">to</th>
              <th className="px-2 py-2 text-right">te</th>
              <th className="px-2 py-2 text-right">tp</th>
              <th className="px-2 py-2 text-right">PERT</th>
              <th className="px-2 py-2">Inicio</th>
              <th className="px-2 py-2">Fin</th>
              <th className="px-2 py-2 text-right">Holgura</th>
              <th className="px-2 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ wbs, task, schedule }, rowIndex) => (
              <tr key={`${wbs}-${task.id}`} className={`border-b border-gray-100 hover:bg-blueprint-50 ${rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                <td className="px-2 py-2 font-medium text-gray-800">{wbs}</td>
                <td className="px-2 py-2 font-medium text-gray-900">{task.id}</td>
                <td className="px-2 py-2 text-gray-900">{task.activity_name}</td>
                <td className="px-2 py-2 text-gray-700">{task.deliverable || 'Sin definir'}</td>
                <td className="px-2 py-2 text-gray-700">{task.predecessors.length > 0 ? task.predecessors.join(', ') : 'Inicio'}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatFixed2(task.optimal_time)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatFixed2(task.estimated_time)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatFixed2(task.pessimistic_time)}</td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatFixed2(schedule?.duration_days ?? task.duration_days)}</td>
                <td className="px-2 py-2">{formatDateValue(schedule?.start_date)}</td>
                <td className="px-2 py-2">{formatDateValue(schedule?.finish_date)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatFixed2(schedule?.total_float)}</td>
                <td className="px-2 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${schedule?.is_critical ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                    {schedule?.is_critical ? 'Crítica' : 'No crítica'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
