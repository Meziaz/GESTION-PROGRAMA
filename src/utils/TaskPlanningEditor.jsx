import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { calculatePertDuration, normalizeActivity } from './criticalPathService';
import { filterIdCharset, filterFreeText as filterTaskText, filterPredecessorsInput, filterDecimal } from './inputFilters';
import { ConfirmModal } from './ConfirmModal';

const inputClass = 'w-full px-3 py-2 bg-white border border-paper-line rounded-lg text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none transition-shadow';
const numberValue = (value) => (value === null || value === undefined || value === '' ? '' : value);
const hasPertEstimates = (activity) => [
  activity?.optimal_time ?? activity?.optimistic_time ?? activity?.optimisticTime ?? activity?.a,
  activity?.estimated_time ?? activity?.most_likely_time ?? activity?.mostLikelyTime ?? activity?.estimatedTime ?? activity?.m,
  activity?.pessimistic_time ?? activity?.pessimisticTime ?? activity?.b,
].every((value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0);

const activityLabel = (activity) => activity.activity_name || activity.name || activity.id;

// Un token de predecesora puede traer sufijo ":TIPO±N" (ej. "T-01-01:SS+2"); para comparar
// contra un ID de tarea hay que quedarse solo con la parte antes de los dos puntos.
const predecessorTokenId = (token) => String(token ?? '').split(':')[0].trim();

export default function TaskPlanningEditor({
  phases = [],
  teamMembers = [],
  expandedPhases = {},
  onTogglePhase,
  onAddPhase,
  onUpdatePhase,
  onDeletePhase,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}) {
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [phaseToDelete, setPhaseToDelete] = useState(null);
  const [editingPhaseIndex, setEditingPhaseIndex] = useState(null);

  // Busca qué otras tareas (de cualquier fase) tienen a esta como predecesora,
  // para avisar antes de borrarla que esas referencias van a quedar rotas.
  const findDependents = (activityId) => phases
    .flatMap((phase) => phase.activities ?? [])
    .filter((activity) => Array.isArray(activity.predecessors) && activity.predecessors.some((token) => predecessorTokenId(token) === activityId))
    .map((activity) => activityLabel(activity));

  // Igual que findDependents, pero para todas las tareas de una fase completa:
  // busca tareas de OTRAS fases que dependan de alguna tarea de la fase a eliminar.
  const findPhaseDependents = (phaseIndex) => {
    const idsInPhase = new Set((phases[phaseIndex]?.activities ?? []).map((activity) => activity.id));
    return phases
      .flatMap((phase, index) => (index === phaseIndex ? [] : phase.activities ?? []))
      .filter((activity) => Array.isArray(activity.predecessors) && activity.predecessors.some((token) => idsInPhase.has(predecessorTokenId(token))))
      .map((activity) => activityLabel(activity));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-blueprint-100 bg-blueprint-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-blueprint-950">Tareas del proyecto</h3>
          <p className="mt-1 text-sm text-blueprint-800">Cada tarea se muestra en una tarjeta para facilitar su edición y revisión.</p>
        </div>
        <button
          type="button"
          onClick={onAddPhase}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blueprint-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blueprint-700"
        >
          <Plus size={16} />
          Agregar fase
        </button>
      </div>

      {phases.length === 0 && (
        <div className="rounded-lg border border-dashed border-paper-line bg-white p-8 text-center">
          <p className="font-semibold text-gray-800">Aún no hay tareas para planificar</p>
          <p className="mt-1 text-sm text-gray-600">Comienza agregando una fase y después sus tareas.</p>
          <button
            type="button"
            onClick={onAddPhase}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blueprint-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blueprint-700"
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
          <section key={phase.id ?? `phase-${phaseIndex}`} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  type="button"
                  onClick={() => onTogglePhase(phaseIndex)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blueprint-100 text-sm font-bold text-blueprint-700"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Contraer fase' : 'Expandir fase'}
                >
                  {phase.phase_order ?? phaseIndex + 1}
                </button>
                <div className="min-w-0 flex-1">
                  {editingPhaseIndex === phaseIndex ? (
                    <input
                      type="text"
                      autoFocus
                      value={phase.phase_name ?? ''}
                      onChange={(event) => onUpdatePhase(phaseIndex, filterTaskText(event.target.value))}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={() => setEditingPhaseIndex(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
                      }}
                      placeholder={`Fase ${phaseIndex + 1}`}
                      maxLength={100}
                      className="block w-full truncate rounded border border-blueprint-400 bg-white px-1 -mx-1 font-semibold text-gray-900 outline-none ring-2 ring-blueprint-100"
                      aria-label={`Nombre de la fase ${phaseIndex + 1}`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTogglePhase(phaseIndex)}
                      className="block w-full truncate text-left font-semibold text-gray-900"
                    >
                      {phase.phase_name || `Fase ${phaseIndex + 1}`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onTogglePhase(phaseIndex)}
                    className="block text-xs text-gray-600"
                  >
                    {activities.length} {activities.length === 1 ? 'tarea' : 'tareas'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPhaseIndex(phaseIndex)}
                  className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-blueprint-50 hover:text-blueprint-700"
                  title="Editar nombre de la fase"
                  aria-label={`Editar nombre de la fase ${phaseIndex + 1}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPhaseToDelete({
                    phaseIndex,
                    label: phase.phase_name || `Fase ${phaseIndex + 1}`,
                    activityCount: activities.length,
                    dependents: findPhaseDependents(phaseIndex),
                  })}
                  className="shrink-0 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                  title="Eliminar fase"
                  aria-label={`Eliminar fase ${phaseIndex + 1}`}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePhase(phaseIndex)}
                  className="ml-1 shrink-0 text-gray-600"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Contraer fase' : 'Expandir fase'}
                >
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => onAddActivity(phaseIndex)}
                className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blueprint-700 transition-colors hover:bg-blueprint-50"
              >
                <Plus size={16} />
                Agregar tarea
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-200 bg-white p-4 sm:p-5">
                {activities.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-paper-line bg-gray-50 p-6 text-center text-sm text-gray-600">
                    No hay tareas en esta fase.
                    <button type="button" onClick={() => onAddActivity(phaseIndex)} className="ml-1 font-medium text-blueprint-700 hover:underline">
                      Agregar la primera.
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((rawActivity, activityIndex) => {
                      const activity = normalizeActivity(rawActivity, activityIndex);
                      const expectedDuration = hasPertEstimates(rawActivity) ? calculatePertDuration(rawActivity) : null;
                      return (
                        <article key={activity.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white ">
                          <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/80 p-4 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Entregable *</label>
                              <input
                                type="text"
                                value={rawActivity.deliverable ?? ''}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'deliverable', filterTaskText(event.target.value))}
                                className={inputClass}
                                maxLength={200}
                                placeholder="Entregable verificable"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setActivityToDelete({
                                phaseIndex,
                                activityIndex,
                                label: activityLabel(activity),
                                dependents: findDependents(activity.id),
                              })}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                              title="Eliminar tarea"
                              aria-label={`Eliminar ${activityLabel(activity)}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="w-full sm:w-28">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">ID *</label>
                              <input
                                type="text"
                                value={activity.id}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'id', filterIdCharset(event.target.value))}
                                className={inputClass}
                                maxLength={20}
                                aria-label={`ID de ${activityLabel(activity)}`}
                              />
                            </div>
                            <div className="sm:col-span-1 lg:col-span-3">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tarea *</label>
                              <input
                                type="text"
                                value={rawActivity.activity_name ?? ''}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'activity_name', filterTaskText(event.target.value))}
                                className={inputClass}
                                maxLength={150}
                                placeholder="Nombre de la tarea"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Optimista (to) *</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={numberValue(rawActivity.optimal_time)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'optimal_time', filterDecimal(event.target.value))}
                                className={`${inputClass} text-right`}
                                placeholder="Días"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Estimado (te) *</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={numberValue(rawActivity.estimated_time)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'estimated_time', filterDecimal(event.target.value))}
                                className={`${inputClass} text-right`}
                                placeholder="Días"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Pesimista (tp) *</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={numberValue(rawActivity.pessimistic_time)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'pessimistic_time', filterDecimal(event.target.value))}
                                className={`${inputClass} text-right`}
                                placeholder="Días"
                              />
                            </div>
                            <div className="rounded-lg border border-blueprint-100 bg-blueprint-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blueprint-700">PERT calculado</p>
                              <p className="mt-1 text-right text-xl font-bold text-blueprint-950">
                                {expectedDuration !== null && expectedDuration > 0 ? `${expectedDuration.toFixed(2)} días` : '—'}
                              </p>
                            </div>

                            <div className="sm:col-span-2 lg:col-span-4">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Predecesoras</label>
                              <input
                                type="text"
                                value={Array.isArray(rawActivity.predecessors) ? rawActivity.predecessors.join(', ') : rawActivity.predecessors ?? ''}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'predecessors', filterPredecessorsInput(event.target.value).split(',').map((item) => item.trim()).filter(Boolean))}
                                className={inputClass}
                                placeholder="Ej: T-01-01, T-01-02:SS, T-01-03:FF+2"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Escribe los ID separados por coma. Por defecto la relación es Fin-a-Inicio (la tarea empieza cuando termina la predecesora).
                                Para otro tipo, agrega ":TIPO" (SS = Inicio-a-Inicio, FF = Fin-a-Fin, SF = Inicio-a-Fin) y, si hay retraso o adelanto, un número con signo al final (ej. ":SS+2" = 2 días después, ":FF-1" = 1 día antes). Una tarea no puede depender de sí misma.
                              </p>
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
                                type="text"
                                inputMode="decimal"
                                value={numberValue(rawActivity.cost)}
                                onChange={(event) => onUpdateActivity(phaseIndex, activityIndex, 'cost', filterDecimal(event.target.value))}
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

      {activityToDelete && (
        <ConfirmModal
          title="¿Eliminar esta tarea?"
          message={
            activityToDelete.dependents?.length > 0
              ? `Se eliminará "${activityToDelete.label}". ⚠️ Las tareas ${activityToDelete.dependents.join(', ')} la tienen como predecesora — esas referencias quedarán inválidas y tendrás que corregirlas manualmente. Esta acción no se puede deshacer.`
              : `Se eliminará "${activityToDelete.label}" y sus datos (tiempos, costo, predecesoras). Ninguna otra tarea depende de ella. Esta acción no se puede deshacer.`
          }
          confirmLabel="Eliminar"
          onCancel={() => setActivityToDelete(null)}
          onConfirm={() => {
            onDeleteActivity(activityToDelete.phaseIndex, activityToDelete.activityIndex);
            setActivityToDelete(null);
          }}
        />
      )}

      {phaseToDelete && (
        <ConfirmModal
          title="¿Eliminar esta fase?"
          message={
            phaseToDelete.dependents?.length > 0
              ? `Se eliminará "${phaseToDelete.label}" y sus ${phaseToDelete.activityCount} ${phaseToDelete.activityCount === 1 ? 'tarea' : 'tareas'}. ⚠️ Las tareas ${phaseToDelete.dependents.join(', ')} dependen de tareas de esta fase — esas referencias quedarán inválidas y tendrás que corregirlas manualmente. Esta acción no se puede deshacer.`
              : `Se eliminará "${phaseToDelete.label}" y sus ${phaseToDelete.activityCount} ${phaseToDelete.activityCount === 1 ? 'tarea' : 'tareas'}. Esta acción no se puede deshacer.`
          }
          confirmLabel="Eliminar"
          onCancel={() => setPhaseToDelete(null)}
          onConfirm={() => {
            onDeletePhase(phaseToDelete.phaseIndex);
            setPhaseToDelete(null);
          }}
        />
      )}
    </div>
  );
}
