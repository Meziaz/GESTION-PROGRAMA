import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { saveProject, getProject } from '../utils/storageManager';
import { validateAllActivities } from '../utils/dependencyValidator';
import TaskPlanningEditor from '../utils/TaskPlanningEditor';
import { LETTERS_ONLY_REGEX, filterLettersOnly, TITLE_TEXT_REGEX, filterProjectNameText, hasReasonableLetterRatio, filterDecimal } from '../utils/inputFilters';
import { ConfirmModal } from '../utils/ConfirmModal';
import { AlertModal } from '../utils/AlertModal';

const isValidDateInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(`${value}T00:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
};

const todayDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

function initialActivity(phaseIndex, activityIndex, predecessors = []) {
  const sequence = String(activityIndex + 1).padStart(2, '0');
  return {
    id: `T-${String(phaseIndex + 1).padStart(2, '0')}-${sequence}`,
    activity_name: '',
    deliverable: '',
    optimal_time: 1,
    estimated_time: 1,
    pessimistic_time: 1,
    duration_days: 1,
    cost: 0,
    progress_percentage: 0,
    predecessors,
    assigned_role: '',
    responsable: '',
  };
}

const emptyFormData = {
  name: '',
  description: '',
  bac: '',
  start_date: '',
  end_date: '',
  project_manager: '',
  project_assistant: '',
  team_members: [],
  wbs_phases: [],
};

export default function NewProjectForm({ projectId, editMode = false, onSave, onCancel }) {
  const [formData, setFormData] = useState(emptyFormData);
  const initialSnapshotRef = React.useRef(JSON.stringify(emptyFormData));

  const [newMember, setNewMember] = useState({ member_name: '', member_role: '' });
  const [expandedPhases, setExpandedPhases] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const isFormDirty = () => JSON.stringify(formData) !== initialSnapshotRef.current;

  const handleCancelClick = () => {
    if (isFormDirty()) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  useEffect(() => {
    if (editMode && projectId) {
      (async () => {
        const project = await getProject(projectId);
        if (project) {
          setFormData((previous) => {
            const next = {
              ...previous,
              ...project,
              team_members: Array.isArray(project.team_members) ? project.team_members : [],
              wbs_phases: Array.isArray(project.wbs_phases) ? project.wbs_phases : [],
            };
            initialSnapshotRef.current = JSON.stringify(next);
            return next;
          });
        }
      })();
    }
  }, [editMode, projectId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBacChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, bac: filterDecimal(value) }));
  };

  const handlePersonNameChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: filterLettersOnly(value) }));
  };

  const handleProjectNameChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: filterProjectNameText(value) }));
  };

  const addTeamMember = () => {
    const member_name = newMember.member_name.trim();
    const member_role = newMember.member_role.trim();
    if (!member_name || !member_role) return;
    if (member_name.length < 2 || member_name.length > 100) {
      setError('El nombre del miembro debe tener entre 2 y 100 caracteres.');
      return;
    }
    if (!TITLE_TEXT_REGEX.test(member_name)) {
      setError('El nombre del miembro contiene caracteres no permitidos.');
      return;
    }
    if (member_role.length < 2 || member_role.length > 100) {
      setError('El rol del miembro debe tener entre 2 y 100 caracteres.');
      return;
    }
    if (!TITLE_TEXT_REGEX.test(member_role)) {
      setError('El rol del miembro contiene caracteres no permitidos.');
      return;
    }
    const isDuplicate = formData.team_members.some(
      (m) => m.member_name.trim().toLowerCase() === member_name.toLowerCase(),
    );
    if (isDuplicate) {
      setError(`Ya existe un miembro del equipo llamado "${member_name}". Usa un nombre distinto para evitar confusiones al asignar tareas.`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      team_members: [
        ...prev.team_members,
        { id: `tm-${Date.now()}`, member_name, member_role },
      ],
    }));
    setNewMember({ member_name: '', member_role: '' });
    setError('');
  };

  const removeTeamMember = (id) => {
    setFormData((prev) => ({
      ...prev,
      team_members: prev.team_members.filter((m) => m.id !== id),
    }));
  };

  const updateActivityField = (phaseIndex, activityIndex, field, value) => {
    setFormData((prev) => {
      const newPhases = prev.wbs_phases.map((phase, index) => index !== phaseIndex
        ? phase
        : {
            ...phase,
            activities: phase.activities.map((activity, indexActivity) => indexActivity !== activityIndex
              ? activity
              : { ...activity, [field]: value }),
          });
      return { ...prev, wbs_phases: newPhases };
    });
    setError('');
  };

  const addPhase = () => {
    setFormData((prev) => ({
      ...prev,
      wbs_phases: [
        ...prev.wbs_phases,
        {
          id: `phase-${Date.now()}`,
          phase_order: prev.wbs_phases.length + 1,
          phase_name: `Fase ${prev.wbs_phases.length + 1}`,
          percentage: 0,
          activities: [],
        },
      ],
    }));
    setExpandedPhases((prev) => ({ ...prev, [formData.wbs_phases.length]: true }));
  };

  const updatePhaseName = (phaseIndex, value) => {
    setFormData((prev) => ({
      ...prev,
      wbs_phases: prev.wbs_phases.map((phase, index) => (index !== phaseIndex ? phase : { ...phase, phase_name: value })),
    }));
    setError('');
  };

  const deletePhase = (phaseIndex) => {
    setFormData((prev) => ({
      ...prev,
      wbs_phases: prev.wbs_phases
        .filter((_, index) => index !== phaseIndex)
        .map((phase, index) => ({ ...phase, phase_order: index + 1 })),
    }));
    setExpandedPhases((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const index = Number(key);
        if (index === phaseIndex) return;
        next[index > phaseIndex ? index - 1 : index] = value;
      });
      return next;
    });
    setError('');
  };

  const addActivity = (phaseIndex) => {
    setFormData((prev) => {
      const phases = prev.wbs_phases.map((phase, index) => index !== phaseIndex
        ? phase
        : {
            ...phase,
            activities: [
              ...(phase.activities ?? []),
              initialActivity(phaseIndex, (phase.activities ?? []).length),
            ],
          });
      return { ...prev, wbs_phases: phases };
    });
    setExpandedPhases((prev) => ({ ...prev, [phaseIndex]: true }));
    setError('');
  };

  const deleteActivity = (phaseIndex, activityIndex) => {
    setFormData((prev) => ({
      ...prev,
      wbs_phases: prev.wbs_phases.map((phase, index) => index !== phaseIndex
        ? phase
        : { ...phase, activities: phase.activities.filter((_, indexActivity) => indexActivity !== activityIndex) }),
    }));
    setError('');
  };

  const togglePhase = (phaseIndex) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseIndex]: !prev[phaseIndex],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validations = [
      { condition: !formData.name?.trim(), message: 'El nombre del proyecto es requerido' },
      { condition: Boolean(formData.name?.trim()) && formData.name.trim().length < 3, message: 'El nombre del proyecto debe tener al menos 3 caracteres' },
      { condition: (formData.name ?? '').trim().length > 150, message: 'El nombre del proyecto no puede superar los 150 caracteres' },
      { condition: Boolean(formData.name?.trim()) && !hasReasonableLetterRatio(formData.name.trim()), message: 'El nombre del proyecto debe ser texto real, no una mezcla de números y símbolos' },
      { condition: Boolean(formData.name?.trim()) && filterProjectNameText(formData.name.trim()) !== formData.name.trim(), message: 'El nombre del proyecto contiene caracteres no permitidos' },
      { condition: !formData.description?.trim(), message: 'La descripción es requerida' },
      { condition: Boolean(formData.description?.trim()) && formData.description.trim().length < 10, message: 'La descripción debe tener al menos 10 caracteres' },
      { condition: (formData.description ?? '').trim().length > 2000, message: 'La descripción no puede superar los 2000 caracteres' },
      { condition: Boolean(formData.description?.trim()) && !hasReasonableLetterRatio(formData.description.trim()), message: 'La descripción debe ser texto real, no una mezcla de números y símbolos' },
      { condition: Boolean(formData.project_manager?.trim()) && formData.project_manager.trim().length < 2, message: 'El nombre del Administrador del Proyecto debe tener al menos 2 caracteres' },
      { condition: (formData.project_manager ?? '').trim().length > 100, message: 'El nombre del Administrador del Proyecto no puede superar los 100 caracteres' },
      { condition: Boolean(formData.project_manager?.trim()) && !LETTERS_ONLY_REGEX.test(formData.project_manager.trim()), message: 'El nombre del Administrador del Proyecto solo debe contener letras' },
      { condition: Boolean(formData.project_assistant?.trim()) && formData.project_assistant.trim().length < 2, message: 'El nombre del Asistente del Proyecto debe tener al menos 2 caracteres' },
      { condition: (formData.project_assistant ?? '').trim().length > 100, message: 'El nombre del Asistente del Proyecto no puede superar los 100 caracteres' },
      { condition: Boolean(formData.project_assistant?.trim()) && !LETTERS_ONLY_REGEX.test(formData.project_assistant.trim()), message: 'El nombre del Asistente del Proyecto solo debe contener letras' },
      { condition: formData.bac === '' || formData.bac === null || formData.bac === undefined, message: 'El presupuesto (BAC) es requerido' },
      { condition: !Number.isFinite(Number(formData.bac)) || Number(formData.bac) <= 0, message: 'El presupuesto (BAC) debe ser un número mayor a cero' },
      { condition: Number(formData.bac) > 10000000, message: 'El presupuesto (BAC) no puede superar los $10,000,000 — revisa si escribiste un cero de más' },
      { condition: !formData.start_date, message: 'La fecha de inicio es requerida' },
      { condition: !isValidDateInput(formData.start_date), message: 'La fecha de inicio no es válida' },
      {
        condition: Boolean(!editMode && isValidDateInput(formData.start_date) && formData.start_date < todayDateString()),
        message: 'La fecha de inicio no puede ser anterior a hoy',
      },
      { condition: !formData.end_date, message: 'La fecha de fin es requerida' },
      { condition: !isValidDateInput(formData.end_date), message: 'La fecha de fin no es válida' },
      {
        condition: Boolean(isValidDateInput(formData.start_date) && isValidDateInput(formData.end_date) && new Date(`${formData.start_date}T00:00:00`) >= new Date(`${formData.end_date}T00:00:00`)),
        message: 'La fecha de inicio debe ser anterior a la fecha de fin',
      },
      { condition: formData.team_members.length === 0, message: 'Debes agregar al menos un miembro al equipo del proyecto' },
      { condition: formData.wbs_phases.length === 0, message: 'Debes ingresar al menos una fase y una tarea' },
    ];

    const errorFound = validations.find((validation) => validation.condition);
    if (errorFound) {
      setError(errorFound.message);
      return;
    }

    const allActivities = formData.wbs_phases.flatMap((phase) => phase.activities ?? []);
    if (allActivities.length === 0) {
      setError('Debes ingresar al menos una tarea para calcular la ruta crítica.');
      return;
    }
    const validationResult = validateAllActivities(allActivities);
    if (!validationResult.isValid) {
      setError(`Errores en la planificación: ${validationResult.errors.join(' | ')}`);
      return;
    }

    let projectToSave = { ...formData, bac: Number(formData.bac) };
    if (!editMode) {
      projectToSave = { ...projectToSave, cut_dates: [] };
    }

    setSaving(true);
    try {
      await saveProject(projectToSave);
      onSave(editMode ? '✅ Proyecto actualizado correctamente' : '✅ Proyecto creado correctamente');
    } catch (saveError) {
      setError(`No se pudo guardar el proyecto: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto bg-white rounded-lg  overflow-hidden">
        <div className="px-6 sm:px-8 py-6 border-b border-gray-200 bg-navy text-white">
          <h1 className="text-3xl font-bold text-white">
            {editMode ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h1>
          <p className="text-blueprint-100 mt-2">
            {editMode
              ? 'Modifica los datos del proyecto'
              : 'Crea un proyecto, ingresa sus tareas y calcula la ruta crítica'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-8 space-y-6">
          <AlertModal type="error" message={error} onClose={() => setError('')} />

          {/* ── Información Básica ── */}
          <section className="rounded-lg border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Básica</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleProjectNameChange}
                  placeholder="Ej: Desarrollo Sistema CRM"
                  maxLength={150}
                  className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe el proyecto..."
                  rows="4"
                  maxLength={2000}
                  className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presupuesto Autorizado (BAC) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="bac"
                  value={formData.bac}
                  onChange={handleBacChange}
                  placeholder="Ej: 5000"
                  className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Presupuesto total del proyecto. Es necesario para que el módulo de Seguimiento (EVM) pueda calcular CPI, SPI y demás métricas.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Administrador del Proyecto
                  </label>
                  <input
                    type="text"
                    name="project_manager"
                    value={formData.project_manager}
                    onChange={handlePersonNameChange}
                    placeholder="Nombre del PM"
                    maxLength={100}
                    className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asistente del Proyecto
                  </label>
                  <input
                    type="text"
                    name="project_assistant"
                    value={formData.project_assistant}
                    onChange={handlePersonNameChange}
                    placeholder="Nombre del Asistente"
                    maxLength={100}
                    className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    min={editMode ? undefined : todayDateString()}
                    className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Fin Estimada *
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    min={formData.start_date || (editMode ? undefined : todayDateString())}
                    className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

            </div>
          </section>

          {/* ── Equipo del Proyecto ── */}
          <section className="rounded-lg border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Equipo del Proyecto</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Miembro
                  </label>
                  <input
                    type="text"
                    value={newMember.member_name}
                    onChange={(e) => setNewMember({ ...newMember, member_name: filterProjectNameText(e.target.value) })}
                    placeholder="Nombre"
                    maxLength={100}
                    className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                  <input
                    type="text"
                    value={newMember.member_role}
                    onChange={(e) => setNewMember({ ...newMember, member_role: filterProjectNameText(e.target.value) })}
                    placeholder="Rol"
                    maxLength={100}
                    className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={addTeamMember}
                  disabled={!newMember.member_name.trim() || !newMember.member_role.trim()}
                  className="flex items-center justify-center gap-2 bg-blueprint-600 text-white px-4 py-2 rounded-lg hover:bg-blueprint-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors font-medium"
                >
                  <Plus size={18} />
                  Agregar
                </button>
              </div>

              {formData.team_members.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {formData.team_members.map((member) => (
                      <div
                        key={member.id}
                        className="flex justify-between items-center bg-white p-3 rounded border border-gray-200"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{member.member_name}</p>
                          <p className="text-sm text-gray-600">{member.member_role}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(member)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── WBS ── */}
          <section className="rounded-lg border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Planificación de tareas (WBS)</h2>
              <p className="text-sm text-gray-600 mt-1">Ingresa tiempos optimista, estimado y pesimista. La duración PERT se calcula automáticamente.</p>
            </div>

            {(() => {
              const allActivities = formData.wbs_phases.flatMap((phase) => phase.activities ?? []);
              if (allActivities.length === 0) return null;
              const validationResult = validateAllActivities(allActivities);
              if (validationResult.isValid && validationResult.warnings.length === 0) {
                return (
                  <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <p className="font-semibold text-green-900">Planificación válida</p>
                    <p className="text-sm text-green-800">{allActivities.length} tareas listas para calcular la ruta crítica.</p>
                  </div>
                );
              }
              return (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-semibold text-red-900 mb-2">Revisión de la planificación</p>
                  {validationResult.errors.length > 0 && (
                    <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                      {validationResult.errors.map((message, index) => <li key={`error-${index}`}>{message}</li>)}
                    </ul>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-red-900">Advertencias</p>
                      <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                        {validationResult.warnings.map((message, index) => <li key={`warning-${index}`}>{message}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}

            <TaskPlanningEditor
              phases={formData.wbs_phases}
              teamMembers={formData.team_members}
              expandedPhases={expandedPhases}
              onTogglePhase={togglePhase}
              onAddPhase={addPhase}
              onUpdatePhase={updatePhaseName}
              onDeletePhase={deletePhase}
              onAddActivity={addActivity}
              onUpdateActivity={updateActivityField}
              onDeleteActivity={deleteActivity}
            />
          </section>

          {/* ── Botones ── */}
          <div className="flex flex-col-reverse gap-3 pt-6 border-t border-gray-200 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-white border border-paper-line rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blueprint-600 text-white rounded-lg hover:bg-blueprint-700 transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editMode ? 'Actualizar Proyecto' : 'Guardar Proyecto'}
            </button>
          </div>
        </form>
      </div>

      {showCancelConfirm && (
        <ConfirmModal
          title="¿Descartar cambios?"
          message="Tienes datos sin guardar en este formulario. Si sales ahora, se perderán."
          confirmLabel="Descartar cambios"
          cancelLabel="Seguir editando"
          onCancel={() => setShowCancelConfirm(false)}
          onConfirm={onCancel}
        />
      )}

      {memberToRemove && (
        <ConfirmModal
          title="¿Quitar miembro del equipo?"
          message={`Se quitará a "${memberToRemove.member_name}" del equipo. Si tiene tareas asignadas como responsable, quedarán sin responsable.`}
          confirmLabel="Quitar"
          onCancel={() => setMemberToRemove(null)}
          onConfirm={() => {
            removeTeamMember(memberToRemove.id);
            setMemberToRemove(null);
          }}
        />
      )}
    </div>
  );
}