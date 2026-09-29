import React from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { calculatePertDuration, normalizeActivity } from './criticalPathService';

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-shadow';
const numberValue = (value) => (value === null || value === undefined || value === '' ? '' : value);
const hasPertEstimates = (activity) => [
  activity?.optimal_time ?? activity?.optimistic_time ?? activity?.optimisticTime ?? activity?.a,
  activity?.estimated_time ?? activity?.most_likely_time ?? activity?.mostLikelyTime ?? activity?.estimatedTime ?? activity?.m,
  activity?.pessimistic_time ?? activity?.pessimisticTime ?? activity?.b,
].every((value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0);

const activityLabel = (activity) => activity.activity_name || activity.name || activity.id;

export default function TaskPlanningEditor({
  phases = [],
  teamMembers = [],
  expandedPhases = {},
  onTogglePhase,
  onAddPhase,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-indigo-950">Tareas del proyecto</h3>
          <p className="mt-1 text-sm text-indigo-800">Cada tarea se muestra en una tarjeta para facilitar su edición y revisión.</p>
        </div>
        <button
          type="button"
          onClick={onAddPhase}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus size={16} />
          Agregar fase
        </button>
      </div>

      {phases.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="font-semibold text-gray-800">Aún no hay tareas para planificar</p>
          <p className="mt-1 text-sm text-gray-600">Comienza agregando una fase y después sus tareas.</p>
          <button
            type="button"
            onClick={onAddPhase}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus size={16} />
            Crear primera fase
          </button>
        </div>
      )}

      {phases.map((phase, phaseIndex) => {
        const activities = Array.isArray(phase.activities) ? phase.activities : [];
        const isExpanded = Boolean(expandedPhases[phaseIndex]);
        return (
          <section key={phase.id ?? `phase-${phaseIndex}`} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => onTogglePhase(phaseIndex)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-expanded={isExpanded}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                  {phase.phase_order ?? phaseIndex + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-900">{phase.phase_name ?? `Fase ${phaseIndex + 1}`}</span>
                  <span className="block text-xs text-gray-600">{activities.length} {activities.length === 1 ? 'tarea' : 'tareas'}</span>
                </span>
                {isExpanded ? <ChevronUp className="ml-auto shrink-0 text-gray-600" size={20} /> : <ChevronDown className="ml-auto shrink-0 text-gray-600" size={20} />}
              </button>
              <button
                type="button"
                onClick={() => onAddActivity(phaseIndex)}
                className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
              >
                <Plus size={16} />
                Agregar tarea
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-200 bg-white p-4 sm:p-5">
                {activities.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                    No hay tareas en esta fase.
                    <button type="button" onClick={() => onAddActivity(phaseIndex)} className="ml-1 font-medium text-indigo-700 hover:underline">
                      Agregar la primera.
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((rawActivity, activityIndex) => {
                      const activity = normalizeActivity(rawActivity, activityIndex);
                      const expectedDuration = hasPertEstimates(rawActivity) ? calculatePertDuration(rawActivity) : null;
                      return (
                        <article key={activity.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                          <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/80 p-4 sm:flex-row sm:items-end">
                            <div className="w-full sm:w-28">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">ID</label>
                              <input
                                type="text"
                                value={activity.id}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'id', event.target.value.trim())}
                                className={inputClass}
                                aria-label={`ID de ${activityLabel(activity)}`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tarea</label>
                              <input
                                type="text"
                                value={rawActivity.activity_name ?? ''}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'activity_name', event.target.value)}
                                className={inputClass}
                                placeholder="Nombre de la tarea"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => onDeleteActivity(phaseIndex, activityIndex)}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                              title="Eliminar tarea"
                              aria-label={`Eliminar ${activityLabel(activity)}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="sm:col-span-2 lg:col-span-4">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Entregable</label>
                              <input
                                type="text"
                                value={rawActivity.deliverable ?? ''}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'deliverable', event.target.value)}
                                className={inputClass}
                                placeholder="Entregable verificable"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Optimista (a)</label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={numberValue(rawActivity.optimal_time)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'optimal_time', event.target.value)}
                                className={`${inputClass} text-right`}
                                placeholder="Días"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Estimado (m)</label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={numberValue(rawActivity.estimated_time)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'estimated_time', event.target.value)}
                                className={`${inputClass} text-right`}
                                placeholder="Días"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Pesimista (b)</label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={numberValue(rawActivity.pessimistic_time)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'pessimistic_time', event.target.value)}
                                className={`${inputClass} text-right`}
                                placeholder="Días"
                              />
                            </div>
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">PERT calculado</p>
                              <p className="mt-1 text-right text-xl font-bold text-indigo-950">
                                {expectedDuration !== null && expectedDuration > 0 ? `${expectedDuration.toFixed(2)} días` : '—'}
                              </p>
                            </div>

                            <div className="sm:col-span-2 lg:col-span-4">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Predecesoras</label>
                              <input
                                type="text"
                                value={Array.isArray(rawActivity.predecessors) ? rawActivity.predecessors.join(', ') : rawActivity.predecessors ?? ''}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'predecessors', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                                className={inputClass}
                                placeholder="Ej: T-01-01, T-01-02"
                              />
                              <p className="mt-1 text-xs text-gray-500">Escribe los ID separados por coma. Una tarea no puede depender de sí misma.</p>
                              {Array.isArray(rawActivity.predecessors) && rawActivity.predecessors.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {rawActivity.predecessors.map((predecessorId, predecessorIndex) => (
                                    <span key={`${predecessorId}-${predecessorIndex}`} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                                      ← {predecessorId}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Costo</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={numberValue(rawActivity.cost)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'cost', event.target.value)}
                                className={`${inputClass} text-right`}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Responsable</label>
                              <select
                                value={rawActivity.responsable ?? ''}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'responsable', event.target.value)}
                                className={inputClass}
                              >
                                <option value="">Sin asignar</option>
                                {teamMembers.map((member) => (
                                  <option key={member.id} value={member.member_name}>{member.member_name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
