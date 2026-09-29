import { computeCriticalPath, normalizeActivity } from './criticalPathService.js';

const STORAGE_KEY = 'evm_projects';
const STORAGE_KEY_SETTINGS = 'evm_settings';

const normalizeStoredActivity = (activity, index) => {
  const source = activity && typeof activity === 'object' ? activity : {};
  const normalized = normalizeActivity(source, index);
  const estimateValues = [
    source.optimal_time ?? source.optimistic_time ?? source.optimisticTime ?? source.a,
    source.estimated_time ?? source.most_likely_time ?? source.mostLikelyTime ?? source.estimatedTime ?? source.m,
    source.pessimistic_time ?? source.pessimisticTime ?? source.b,
  ];
  const hasAllEstimates = estimateValues.every((value) => value !== null && value !== undefined && value !== '');
  const hasValidEstimates = hasAllEstimates
    && estimateValues.every((value) => Number.isFinite(Number(value)) && Number(value) > 0)
    && Number(estimateValues[0]) <= Number(estimateValues[1])
    && Number(estimateValues[1]) <= Number(estimateValues[2]);
  if (hasValidEstimates) return normalized;
  return {
    ...source,
    activity_name: source.activity_name ?? source.name ?? '',
    name: source.name ?? source.activity_name ?? '',
    deliverable: source.deliverable ?? source.output ?? '',
    predecessors: normalized.predecessors,
    assigned_members: Array.isArray(source.assigned_members) ? source.assigned_members : [],
  };
};

const normalizeProject = (project) => {
  if (!project || typeof project !== 'object') return project;
  return {
    ...project,
    bac: Math.max(0, Number(project.bac) || 0),
    team_members: Array.isArray(project.team_members) ? project.team_members : [],
    cut_dates: (Array.isArray(project.cut_dates) ? project.cut_dates : []).slice().sort((a, b) => String(a?.cut_date ?? '').localeCompare(String(b?.cut_date ?? ''))),
    wbs_phases: (Array.isArray(project.wbs_phases) ? project.wbs_phases : []).map((phase, phaseIndex) => {
      const source = phase && typeof phase === 'object' ? phase : {};
      return {
        ...source,
        id: source.id ?? `phase-${phaseIndex + 1}`,
        phase_order: source.phase_order ?? phaseIndex + 1,
        phase_name: source.phase_name ?? `Fase ${phaseIndex + 1}`,
        activities: (Array.isArray(source.activities) ? source.activities : []).map(normalizeStoredActivity),
      };
    }),
  };
};

const readStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : [];
  } catch (error) {
    console.error('No se pudo leer el almacenamiento local:', error);
    return [];
  }
};

export const initializeStorage = () => {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getExampleData().map(normalizeProject)));
    }
  } catch (error) {
    console.error('No se pudo inicializar el almacenamiento local:', error);
  }
};

export const getExampleData = () => {
  const now = new Date();
  const start1 = new Date('2024-06-01');
  const end1 = new Date('2024-12-31');
  const durationDays1 = Math.floor((end1 - start1) / (1000 * 60 * 60 * 24));

  const start2 = new Date('2024-07-15');
  const end2 = new Date('2025-03-31');
  const durationDays2 = Math.floor((end2 - start2) / (1000 * 60 * 60 * 24));

  return [
    {
      id: 'proj-001',
      name: 'Desarrollo Sistema CRM',
      description: 'Implementación de plataforma CRM para gestión de clientes',
      start_date: start1.toISOString().split('T')[0],
      end_date: end1.toISOString().split('T')[0],
      bac: 50000,
      project_type: 'Desarrollo de software',
      contingency_percentage: 10,
      estimation_technique: 'Bottom-Up',
      project_manager: 'Juan Pérez',
      project_assistant: 'Fernando López',
      time_unit: 'días',
      team_members: [
        { id: 'tm-001', member_name: 'Juan Pérez', member_role: 'Project Manager' },
        { id: 'tm-002', member_name: 'María García', member_role: 'Lead Developer' },
        { id: 'tm-003', member_name: 'Carlos López', member_role: 'QA Engineer' },
      ],
      wbs_phases: [
        {
          id: 'phase-001',
          phase_order: 1,
          phase_name: 'Análisis',
          percentage: 10,
          activities: [
            {
              id: 'act-001',
              activity_name: 'Levantamiento de requisitos',
              deliverable: 'Documento de requisitos',
              duration_days: 5,
              cost: 2500,
              progress_percentage: 100,
              predecessors: [],
              assigned_members: [
                { member_id: 'tm-001', role: 'Líder' },
                { member_id: 'tm-002', role: 'Participante' },
              ],
            },
            {
              id: 'act-002',
              activity_name: 'Análisis de procesos',
              deliverable: 'Mapeo de procesos',
              duration_days: 8,
              cost: 4000,
              progress_percentage: 100,
              predecessors: ['act-001'],
              assigned_members: [
                { member_id: 'tm-002', role: 'Ejecutor' },
              ],
            },
          ],
        },
        {
          id: 'phase-002',
          phase_order: 2,
          phase_name: 'Diseño',
          percentage: 15,
          activities: [
            {
              id: 'act-003',
              activity_name: 'Diseño de arquitectura',
              deliverable: 'Diagrama de arquitectura',
              duration_days: 10,
              cost: 5000,
              progress_percentage: 100,
              predecessors: ['act-002'],
              assigned_members: [
                { member_id: 'tm-002', role: 'Diseñador' },
              ],
            },
            {
              id: 'act-004',
              activity_name: 'Diseño de base de datos',
              deliverable: 'Esquema ER',
              duration_days: 7,
              cost: 3500,
              progress_percentage: 80,
              predecessors: ['act-002'],
              assigned_members: [
                { member_id: 'tm-002', role: 'Diseñador' },
              ],
            },
          ],
        },
        {
          id: 'phase-003',
          phase_order: 3,
          phase_name: 'Desarrollo',
          percentage: 40,
          activities: [
            {
              id: 'act-005',
              activity_name: 'Desarrollo backend',
              deliverable: 'API REST',
              duration_days: 30,
              cost: 15000,
              progress_percentage: 60,
              predecessors: ['act-003', 'act-004'],
              assigned_members: [
                { member_id: 'tm-002', role: 'Desarrollador Senior' },
              ],
            },
            {
              id: 'act-006',
              activity_name: 'Desarrollo frontend',
              deliverable: 'Interfaz web',
              duration_days: 25,
              cost: 12500,
              progress_percentage: 50,
              predecessors: ['act-003'],
              assigned_members: [
                { member_id: 'tm-002', role: 'Desarrollador Frontend' },
              ],
            },
          ],
        },
        {
          id: 'phase-004',
          phase_order: 4,
          phase_name: 'Pruebas',
          percentage: 20,
          activities: [
            {
              id: 'act-007',
              activity_name: 'Pruebas unitarias',
              deliverable: 'Reporte de pruebas',
              duration_days: 10,
              cost: 5000,
              progress_percentage: 0,
              predecessors: ['act-005', 'act-006'],
              assigned_members: [
                { member_id: 'tm-003', role: 'QA Lead' },
              ],
            },
          ],
        },
        {
          id: 'phase-005',
          phase_order: 5,
          phase_name: 'Implementación/Despliegue',
          percentage: 10,
          activities: [
            {
              id: 'act-008',
              activity_name: 'Preparación de producción',
              deliverable: 'Documentación de deployment',
              duration_days: 5,
              cost: 2500,
              progress_percentage: 0,
              predecessors: ['act-007'],
              assigned_members: [
                { member_id: 'tm-001', role: 'Coordinador' },
              ],
            },
          ],
        },
        {
          id: 'phase-006',
          phase_order: 6,
          phase_name: 'Mantenimiento',
          percentage: 5,
          activities: [
            {
              id: 'act-009',
              activity_name: 'Soporte inicial',
              deliverable: 'Log de issues',
              duration_days: 3,
              cost: 1500,
              progress_percentage: 0,
              predecessors: ['act-008'],
              assigned_members: [
                { member_id: 'tm-002', role: 'Soporte' },
                { member_id: 'tm-003', role: 'Soporte' },
              ],
            },
          ],
        },
      ],
      cut_dates: [
        {
          id: 'cd-001',
          cut_date: '2024-07-15',
          actual_percentage: 15,
          actual_cost: 7500,
          pv_value: 5000,
          ev_value: 7500,
          cpi: 1.0,
          spi: 1.5,
          mtbf: null,
          dre: null,
        },
        {
          id: 'cd-002',
          cut_date: '2024-09-15',
          actual_percentage: 45,
          actual_cost: 22500,
          pv_value: 20000,
          ev_value: 22500,
          cpi: 1.0,
          spi: 1.125,
          mtbf: null,
          dre: null,
        },
        {
          id: 'cd-003',
          cut_date: '2024-11-30',
          actual_percentage: 65,
          actual_cost: 32500,
          pv_value: 28000,
          ev_value: 32500,
          cpi: 1.0,
          spi: 1.16,
          mtbf: null,
          dre: null,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'proj-002',
      name: 'Migración Cloud AWS',
      description: 'Migración de infraestructura on-premise a AWS',
      start_date: start2.toISOString().split('T')[0],
      end_date: end2.toISOString().split('T')[0],
      bac: 75000,
      project_type: 'Migración cloud',
      contingency_percentage: 15,
      estimation_technique: 'Análoga',
      project_manager: 'Roberto Silva',
      project_assistant: 'María López',
      time_unit: 'días',
      team_members: [
        { id: 'tm-004', member_name: 'Roberto Silva', member_role: 'Project Manager' },
        { id: 'tm-005', member_name: 'Ana Martínez', member_role: 'Cloud Architect' },
        { id: 'tm-006', member_name: 'Luis Torres', member_role: 'DevOps Engineer' },
        { id: 'tm-007', member_name: 'Sofia Ramírez', member_role: 'Security Officer' },
      ],
      wbs_phases: [
        {
          id: 'phase-007',
          phase_order: 1,
          phase_name: 'Análisis',
          percentage: 10,
          activities: [
            {
              id: 'act-010',
              activity_name: 'Assessment de infraestructura',
              deliverable: 'Informe de assessment',
              duration_days: 7,
              cost: 3750,
              progress_percentage: 100,
              predecessors: [],
              assigned_members: [
                { member_id: 'tm-005', role: 'Evaluador' },
              ],
            },
            {
              id: 'act-011',
              activity_name: 'Planificación de migración',
              deliverable: 'Plan de migración',
              duration_days: 10,
              cost: 5000,
              progress_percentage: 100,
              predecessors: ['act-010'],
              assigned_members: [
                { member_id: 'tm-004', role: 'Planificador' },
                { member_id: 'tm-005', role: 'Participante' },
              ],
            },
          ],
        },
        {
          id: 'phase-008',
          phase_order: 2,
          phase_name: 'Diseño',
          percentage: 15,
          activities: [
            {
              id: 'act-012',
              activity_name: 'Diseño de arquitectura AWS',
              deliverable: 'Diagrama de arquitectura',
              duration_days: 12,
              cost: 6000,
              progress_percentage: 90,
              predecessors: ['act-011'],
              assigned_members: [
                { member_id: 'tm-005', role: 'Diseñador' },
              ],
            },
          ],
        },
        {
          id: 'phase-009',
          phase_order: 3,
          phase_name: 'Desarrollo',
          percentage: 40,
          activities: [
            {
              id: 'act-013',
              activity_name: 'Configuración de infraestructura',
              deliverable: 'Infrastructure as Code',
              duration_days: 20,
              cost: 20000,
              progress_percentage: 40,
              predecessors: ['act-012'],
              assigned_members: [
                { member_id: 'tm-006', role: 'DevOps' },
              ],
            },
            {
              id: 'act-014',
              activity_name: 'Migración de datos',
              deliverable: 'Base de datos en AWS',
              duration_days: 15,
              cost: 10000,
              progress_percentage: 30,
              predecessors: ['act-013'],
              assigned_members: [
                { member_id: 'tm-006', role: 'DevOps' },
              ],
            },
          ],
        },
        {
          id: 'phase-010',
          phase_order: 4,
          phase_name: 'Pruebas',
          percentage: 20,
          activities: [
            {
              id: 'act-015',
              activity_name: 'Pruebas de funcionalidad',
              deliverable: 'Reporte de pruebas',
              duration_days: 12,
              cost: 7500,
              progress_percentage: 0,
              predecessors: ['act-014'],
              assigned_members: [
                { member_id: 'tm-006', role: 'QA' },
              ],
            },
          ],
        },
        {
          id: 'phase-011',
          phase_order: 5,
          phase_name: 'Implementación/Despliegue',
          percentage: 10,
          activities: [
            {
              id: 'act-016',
              activity_name: 'Cutover a producción',
              deliverable: 'Documentación de cutover',
              duration_days: 7,
              cost: 7500,
              progress_percentage: 0,
              predecessors: ['act-015'],
              assigned_members: [
                { member_id: 'tm-004', role: 'Coordinador' },
              ],
            },
          ],
        },
        {
          id: 'phase-012',
          phase_order: 6,
          phase_name: 'Mantenimiento',
          percentage: 5,
          activities: [
            {
              id: 'act-017',
              activity_name: 'Optimización y ajustes',
              deliverable: 'Documentación final',
              duration_days: 4,
              cost: 2250,
              progress_percentage: 0,
              predecessors: ['act-016'],
              assigned_members: [
                { member_id: 'tm-005', role: 'Optimizador' },
                { member_id: 'tm-006', role: 'Soporte' },
              ],
            },
          ],
        },
      ],
      cut_dates: [
        {
          id: 'cd-004',
          cut_date: '2024-08-31',
          actual_percentage: 20,
          actual_cost: 15000,
          pv_value: 12500,
          ev_value: 15000,
          cpi: 1.0,
          spi: 1.2,
          mtbf: null,
          dre: null,
        },
        {
          id: 'cd-005',
          cut_date: '2024-11-15',
          actual_percentage: 55,
          actual_cost: 41250,
          pv_value: 37500,
          ev_value: 41250,
          cpi: 1.0,
          spi: 1.1,
          mtbf: null,
          dre: null,
        },
        {
          id: 'cd-006',
          cut_date: '2025-02-28',
          actual_percentage: 75,
          actual_cost: 56250,
          pv_value: 52500,
          ev_value: 56250,
          cpi: 1.0,
          spi: 1.07,
          mtbf: null,
          dre: null,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
};

export const getAllProjects = () => readStorage();

export const saveProject = (project) => {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error('El proyecto no tiene un formato válido.');
  }
  const projects = getAllProjects();
  const normalizedProject = normalizeProject(project);
  const index = projects.findIndex((item) => item.id === normalizedProject.id);
  const now = new Date().toISOString();
  normalizedProject.updated_at = now;
  normalizedProject.created_at = normalizedProject.created_at ?? now;

  if (index === -1) {
    projects.push(normalizedProject);
  } else {
    projects[index] = { ...projects[index], ...normalizedProject };
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('No se pudo guardar el proyecto:', error);
    throw new Error('No se pudo guardar el proyecto en el almacenamiento local.');
  }
  return normalizedProject;
};

export const getProject = (id) => {
  const projects = getAllProjects();
  return projects.find((p) => p.id === id);
};

export const deleteProject = (id) => {
  try {
    const projects = getAllProjects();
    const filtered = projects.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('No se pudo eliminar el proyecto:', error);
    throw new Error('No se pudo eliminar el proyecto del almacenamiento local.');
  }
};

export const addCutDate = (projectId, cutDate) => {
  const project = getProject(projectId);
  if (!project) throw new Error('No se encontró el proyecto para agregar la fecha de corte.');
  if (!cutDate || typeof cutDate !== 'object') throw new Error('La fecha de corte no tiene un formato válido.');

  if (project.cut_dates?.some((item) => item.cut_date === cutDate.cut_date)) {
    throw new Error('Ya existe una fecha de corte para este proyecto.');
  }
  const savedCutDate = {
    ...cutDate,
    id: `cd-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  project.cut_dates = [...(project.cut_dates ?? []), savedCutDate].sort((a, b) => String(a.cut_date).localeCompare(String(b.cut_date)));
  saveProject(project);
  return savedCutDate;
};

export const saveCutDate = (projectId, cutDate) => {
  const project = getProject(projectId);
  if (!project) throw new Error('No se encontró el proyecto para guardar la fecha de corte.');
  if (!cutDate || typeof cutDate !== 'object') throw new Error('La fecha de corte no tiene un formato válido.');

  const dates = Array.isArray(project.cut_dates) ? project.cut_dates : [];
  const index = dates.findIndex((cd) => cd.id === cutDate.id);
  if (index === -1 && dates.some((cd) => cd.cut_date === cutDate.cut_date)) {
    throw new Error('Ya existe una fecha de corte para este proyecto.');
  }
  const savedCutDate = index === -1 ? { ...cutDate, id: `cd-${Date.now()}` } : { ...cutDate };
  const nextDates = index === -1 ? [...dates, savedCutDate] : dates.map((date, dateIndex) => dateIndex === index ? savedCutDate : date);
  saveProject({ ...project, cut_dates: nextDates });
  return savedCutDate;
};

export const deleteCutDate = (projectId, cutDateId) => {
  const project = getProject(projectId);
  if (!project) throw new Error('No se encontró el proyecto para eliminar la fecha de corte.');
  saveProject({ ...project, cut_dates: (project.cut_dates ?? []).filter((cd) => cd.id !== cutDateId) });
};

/**
 * Activity Management Functions
 */

export const getActivitiesFromProject = (projectId) => {
  const project = getProject(projectId);
  if (!project) return [];

  const activities = [];
  if (project.wbs_phases) {
    project.wbs_phases.forEach((phase) => {
      if (phase.activities) {
        phase.activities.forEach((activity) => {
          activities.push({
            ...activity,
            phase_id: phase.id,
            phase_name: phase.phase_name,
          });
        });
      }
    });
  }
  return activities;
};

export const updateActivity = (projectId, phaseId, activityId, updatedData) => {
  const project = getProject(projectId);
  if (!project) return null;

  const phase = project.wbs_phases?.find((p) => p.id === phaseId);
  if (!phase) return null;

  const activity = phase.activities?.find((a) => a.id === activityId);
  if (!activity) return null;

  // Update activity fields
  Object.assign(activity, updatedData);
  activity.updated_at = new Date().toISOString();

  // Recalculate project metrics if needed
  recalculateProjectMetrics(project);

  saveProject(project);
  return activity;
};

export const createActivity = (projectId, phaseId, activityData) => {
  const project = getProject(projectId);
  if (!project) return null;

  const phase = project.wbs_phases?.find((p) => p.id === phaseId);
  if (!phase) return null;

  const newActivity = {
    id: `act-${Date.now()}`,
    ...activityData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!phase.activities) {
    phase.activities = [];
  }
  phase.activities.push(newActivity);

  recalculateProjectMetrics(project);
  saveProject(project);
  return newActivity;
};

export const deleteActivity = (projectId, phaseId, activityId) => {
  const project = getProject(projectId);
  if (!project) return null;

  const phase = project.wbs_phases?.find((p) => p.id === phaseId);
  if (!phase) return null;

  phase.activities = phase.activities.filter((a) => a.id !== activityId);

  recalculateProjectMetrics(project);
  saveProject(project);
  return true;
};

/**
 * Recalculate project metrics based on activities
 * Includes BAC, duration, and end date recalculation
 */
export const recalculateProjectMetrics = (project) => {
  if (!project.wbs_phases || project.wbs_phases.length === 0) {
    return project;
  }

  const activities = project.wbs_phases.flatMap((phase) => phase.activities ?? []);
  const result = computeCriticalPath(activities, { startDate: project.start_date });
  if (result.isValid && result.projectDuration > 0 && project.start_date) {
    const endDate = new Date(`${project.start_date}T00:00:00`);
    endDate.setDate(endDate.getDate() + Math.max(0, Math.ceil(result.projectDuration) - 1));
    project.end_date = endDate.toISOString().split('T')[0];
  }
  project.updated_at = new Date().toISOString();
  return project;
};

/**
 * Add team member assignment to activity
 */
export const assignTeamMemberToActivity = (projectId, phaseId, activityId, memberId, role) => {
  const project = getProject(projectId);
  if (!project) return null;

  const phase = project.wbs_phases?.find((p) => p.id === phaseId);
  if (!phase) return null;

  const activity = phase.activities?.find((a) => a.id === activityId);
  if (!activity) return null;

  if (!Array.isArray(activity.assigned_members)) {
    activity.assigned_members = [];
  }

  // Check if already assigned
  const existingIndex = activity.assigned_members.findIndex((m) => m.member_id === memberId);
  if (existingIndex >= 0) {
    activity.assigned_members[existingIndex].role = role;
  } else {
    activity.assigned_members.push({
      member_id: memberId,
      role: role || 'Desarrollador',
    });
  }

  activity.updated_at = new Date().toISOString();
  saveProject(project);
  return activity;
};

/**
 * Remove team member assignment from activity
 */
export const removeTeamMemberFromActivity = (projectId, phaseId, activityId, memberId) => {
  const project = getProject(projectId);
  if (!project) return null;

  const phase = project.wbs_phases?.find((p) => p.id === phaseId);
  if (!phase) return null;

  const activity = phase.activities?.find((a) => a.id === activityId);
  if (!activity) return null;

  if (Array.isArray(activity.assigned_members)) {
    activity.assigned_members = activity.assigned_members.filter((m) => m?.member_id !== memberId);
  } else {
    activity.assigned_members = [];
  }

  activity.updated_at = new Date().toISOString();
  saveProject(project);
  return activity;
};

/**
 * Get all team members assigned to an activity
 */
export const getActivityTeamMembers = (projectId, phaseId, activityId) => {
  const project = getProject(projectId);
  if (!project) return [];

  const phase = project.wbs_phases?.find((p) => p.id === phaseId);
  if (!phase) return [];

  const activity = phase.activities?.find((a) => a.id === activityId);
  if (!activity) return [];

  const teamMembers = [];
  (Array.isArray(activity.assigned_members) ? activity.assigned_members : []).forEach((assignment) => {
    const member = project.team_members?.find((m) => m.id === assignment.member_id);
    if (member) {
      teamMembers.push({
        ...member,
        assigned_role: assignment.role,
      });
    }
  });

  return teamMembers;
};
