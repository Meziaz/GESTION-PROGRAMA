import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { saveProject, getProject } from '../utils/storageManager';
import { validateAllActivities } from '../utils/dependencyValidator';
import TaskPlanningEditor from '../utils/TaskPlanningEditor';

const isValidDateInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(`${value}T00:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
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

export default function NewProjectForm({ projectId, editMode = false, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    project_manager: '',
    project_assistant: '',
    team_members: [],
    wbs_phases: [],
  });

  const [newMember, setNewMember] = useState({ member_name: '', member_role: '' });
  const [expandedPhases, setExpandedPhases] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (editMode && projectId) {
      const project = getProject(projectId);
      if (project) {
        setFormData((previous) => ({
          ...previous,
          ...project,
          team_members: Array.isArray(project.team_members) ? project.team_members : [],
          wbs_phases: Array.isArray(project.wbs_phases) ? project.wbs_phases : [],
        }));
      }
    }
  }, [editMode, projectId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addTeamMember = () => {
    if (newMember.member_name.trim() && newMember.member_role.trim()) {
      setFormData((prev) => ({
        ...prev,
        team_members: [
          ...prev.team_members,
          { id: `tm-${Date.now()}`, ...newMember },
        ],
      }));
      setNewMember({ member_name: '', member_role: '' });
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();

    const validations = [
      { condition: !formData.name?.trim(), message: 'El nombre del proyecto es requerido' },
      { condition: !formData.description?.trim(), message: 'La descripción es requerida' },
      { condition: !formData.start_date, message: 'La fecha de inicio es requerida' },
      { condition: !isValidDateInput(formData.start_date), message: 'La fecha de inicio no es válida' },
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

    let projectToSave = formData;
    if (!editMode) {
      projectToSave = {
        id: `proj-${Date.now()}`,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cut_dates: [],
      };
    }

    try {
      saveProject(projectToSave);
      onSave();
    } catch (saveError) {
      setError(`No se pudo guardar el proyecto: ${saveError.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 sm:px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <h1 className="text-3xl font-bold text-white">
            {editMode ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h1>
          <p className="text-indigo-100 mt-2">
            {editMode
              ? 'Modifica los datos del proyecto'
              : 'Crea un proyecto, ingresa sus tareas y calcula la ruta crítica'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* ── Información Básica ── */}
          <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
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
                  onChange={handleInputChange}
                  placeholder="Ej: Desarrollo Sistema CRM"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none resize-none"
                  required
                />
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
                    onChange={handleInputChange}
                    placeholder="Nombre del PM"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
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
                    onChange={handleInputChange}
                    placeholder="Nombre del Asistente"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
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
                    min={formData.start_date || undefined}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

            </div>
          </section>

          {/* ── Equipo del Proyecto ── */}
          <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
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
                    onChange={(e) => setNewMember({ ...newMember, member_name: e.target.value })}
                    placeholder="Nombre"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                  <input
                    type="text"
                    value={newMember.member_role}
                    onChange={(e) => setNewMember({ ...newMember, member_role: e.target.value })}
                    placeholder="Rol"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={addTeamMember}
                  disabled={!newMember.member_name.trim() || !newMember.member_role.trim()}
                  className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors font-medium"
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
                          onClick={() => removeTeamMember(member.id)}
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
          <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
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
              onAddActivity={addActivity}
              onUpdateActivity={updateActivityField}
              onDeleteActivity={deleteActivity}
            />
          </section>

          {/* ── Botones ── */}
          <div className="flex flex-col-reverse gap-3 pt-6 border-t border-gray-200 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg"
            >
              {editMode ? 'Actualizar Proyecto' : 'Guardar Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}