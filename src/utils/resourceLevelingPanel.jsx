import React from 'react';
import { Users2, AlertTriangle, CheckCircle } from 'lucide-react';
import { collectActivities } from './wbsValidationUI';
import { computeCriticalPath } from './criticalPathService';

const EPS = 1e-6;

// Resuelve a qué recurso(s) está asignada una tarea: primero el campo estructurado
// assigned_members (member_id -> nombre del equipo), y si no existe, el texto libre
// "responsable" como última opción (menos confiable, pero mejor que nada).
const resourcesOf = (task, membersById) => {
  if (Array.isArray(task.assigned_members) && task.assigned_members.length > 0) {
    const resolved = task.assigned_members
      .map((entry) => entry?.member_id)
      .filter(Boolean)
      .map((id) => ({ key: id, label: membersById.get(id)?.member_name ?? id }));
    if (resolved.length > 0) return resolved;
  }
  const responsable = String(task.responsable ?? '').trim();
  return responsable ? [{ key: `name:${responsable}`, label: responsable }] : [];
};

export function ResourceLevelingPanel({ project }) {
  const activities = collectActivities(project);
  if (activities.length === 0) return null;

  const result = computeCriticalPath(activities, { startDate: project.start_date });
  const schedule = result.schedule ?? [];
  if (schedule.length === 0) return null;

  const membersById = new Map((project.team_members ?? []).map((m) => [m.id, m]));

  const byResource = new Map();
  for (const task of schedule) {
    for (const { key, label } of resourcesOf(task, membersById)) {
      if (!byResource.has(key)) byResource.set(key, { label, items: [] });
      byResource.get(key).items.push(task);
    }
  }

  const hasAnyAssignment = byResource.size > 0;

  const conflicts = [];
  for (const [resourceKey, { label, items }] of byResource) {
    const sorted = [...items].sort((a, b) => a.early_start - b.early_start);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i];
        const b = sorted[j];
        const overlapUnits = Math.min(a.early_finish, b.early_finish) - Math.max(a.early_start, b.early_start);
        if (overlapUnits > EPS) {
          const toDelay = (a.total_float ?? 0) >= (b.total_float ?? 0) ? a : b;
          const keep = toDelay === a ? b : a;
          const requiredShift = Math.max(0, keep.early_finish - toDelay.early_start);
          const float = toDelay.total_float ?? 0;
          const safe = requiredShift <= float + EPS;
          const overrunDays = safe ? 0 : Math.round((requiredShift - float) * 10) / 10;
          conflicts.push({
            resourceKey, resourceLabel: label,
            taskA: a, taskB: b,
            overlapDays: Math.round(overlapUnits * 10) / 10,
            toDelay, keep, safe, overrunDays,
          });
        }
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><Users2 size={20} /> Nivelación de Recursos</h3>
      <p className="text-sm text-gray-600 mb-4">
        Revisa si una misma persona quedó asignada a dos tareas que se ejecutan al mismo tiempo según el
        cronograma calculado. Usa la asignación de cada actividad del EDT (o, si falta, el campo "responsable").
      </p>

      {!hasAnyAssignment ? (
        <p className="text-sm text-gray-400 italic">
          Ninguna tarea del EDT tiene un responsable o miembro asignado todavía, así que no se puede detectar sobreasignación.
        </p>
      ) : conflicts.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          <p>No se detectaron sobreasignaciones: ningún recurso tiene dos tareas simultáneas en el cronograma actual.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((c, index) => (
            <div key={`${c.resourceKey}-${index}`} className="rounded-lg border border-paper-line p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amberline" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{c.resourceLabel} tiene dos tareas simultáneas ({c.overlapDays} día(s) de solape)</p>
                  <p className="mt-1 text-gray-700">
                    <span className="font-medium">{c.taskA.activity_name}</span> ({c.taskA.start_date ?? '—'} → {c.taskA.finish_date ?? '—'})
                    {' '}vs.{' '}
                    <span className="font-medium">{c.taskB.activity_name}</span> ({c.taskB.start_date ?? '—'} → {c.taskB.finish_date ?? '—'})
                  </p>
                  <p className={`mt-2 font-medium ${c.safe ? 'text-green-700' : 'text-red-700'}`}>
                    Sugerencia: retrasa <span className="font-semibold">{c.toDelay.activity_name}</span> hasta que termine{' '}
                    <span className="font-semibold">{c.keep.activity_name}</span> ({c.keep.finish_date ?? '—'}).
                    {' '}{c.toDelay.activity_name} tiene {(c.toDelay.total_float ?? 0).toFixed(1)} día(s) de holgura.
                  </p>
                  <p className={`text-xs ${c.safe ? 'text-green-600' : 'text-red-600'}`}>
                    {c.safe
                      ? 'Cabe dentro de su holgura: no afecta la fecha fin del proyecto.'
                      : `Excede su holgura por ${c.overrunDays} día(s): retrasaría la fecha fin del proyecto si no se reasigna a otra persona.`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
