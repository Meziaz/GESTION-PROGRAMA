/**
 * Almacenamiento en localStorage (navegador). Cada usuario ve los mismos 2
 * proyectos de ejemplo (quemados abajo en getExampleData) la primera vez que
 * abre la app; cualquier cambio que haga después se guarda solo en su propio
 * navegador, no se comparte con otros.
 *
 * Existe una versión alterna conectada a PostgreSQL (comparte datos de verdad
 * entre varias PCs) guardada en storageManager.postgres.js — ver ese archivo
 * para retomarla si el equipo la necesita más adelante.
 */

const STORAGE_KEY = 'evm_projects';

const normalizeProject = (project) => {
  if (!project || typeof project !== 'object') return project;
  return {
    ...project,
    bac: Math.max(0, Number(project.bac) || 0),
    team_members: Array.isArray(project.team_members) ? project.team_members : [],
    cut_dates: (Array.isArray(project.cut_dates) ? project.cut_dates : []).slice().sort((a, b) => String(a?.cut_date ?? '').localeCompare(String(b?.cut_date ?? ''))),
    wbs_phases: Array.isArray(project.wbs_phases) ? project.wbs_phases : [],
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

const writeStorage = (projects) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const initializeStorage = () => {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      writeStorage(getExampleData());
    }
  } catch (error) {
    console.error('No se pudo inicializar el almacenamiento local:', error);
  }
};

export const getExampleData = () => [
  {
    id: '6fca2b27-33ea-485c-bf91-0e47ee3dde8a',
    name: 'Migración Cloud AWS',
    description: 'Migración de infraestructura on-premise a AWS',
    start_date: '2024-07-15',
    end_date: '2025-03-31',
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
        id: 'phase-007', phase_order: 1, phase_name: 'Análisis', percentage: 10,
        activities: [
          { id: 'act-010', activity_name: 'Assessment de infraestructura', deliverable: 'Informe de assessment', optimal_time: 7, estimated_time: 7, pessimistic_time: 7, duration_days: 7, cost: 3750, progress_percentage: 100, predecessors: [], responsable: 'Ana Martínez', assigned_role: '', assigned_members: [{ member_id: 'tm-005', role: 'Evaluador' }] },
          { id: 'act-011', activity_name: 'Planificación de migración', deliverable: 'Plan de migración', optimal_time: 10, estimated_time: 10, pessimistic_time: 10, duration_days: 10, cost: 5000, progress_percentage: 100, predecessors: ['act-010'], responsable: 'Roberto Silva', assigned_role: '', assigned_members: [{ member_id: 'tm-004', role: 'Planificador' }, { member_id: 'tm-005', role: 'Participante' }] },
        ],
      },
      {
        id: 'phase-008', phase_order: 2, phase_name: 'Diseño', percentage: 15,
        activities: [
          { id: 'act-012', activity_name: 'Diseño de arquitectura AWS', deliverable: 'Diagrama de arquitectura', optimal_time: 12, estimated_time: 12, pessimistic_time: 12, duration_days: 12, cost: 6000, progress_percentage: 90, predecessors: ['act-011'], responsable: 'Ana Martínez', assigned_role: '', assigned_members: [{ member_id: 'tm-005', role: 'Diseñador' }] },
        ],
      },
      {
        id: 'phase-009', phase_order: 3, phase_name: 'Desarrollo', percentage: 40,
        activities: [
          { id: 'act-013', activity_name: 'Configuración de infraestructura', deliverable: 'Infrastructure as Code', optimal_time: 20, estimated_time: 20, pessimistic_time: 20, duration_days: 20, cost: 20000, progress_percentage: 40, predecessors: ['act-012'], responsable: 'Luis Torres', assigned_role: '', assigned_members: [{ member_id: 'tm-006', role: 'DevOps' }] },
          { id: 'act-014', activity_name: 'Migración de datos', deliverable: 'Base de datos en AWS', optimal_time: 15, estimated_time: 15, pessimistic_time: 15, duration_days: 15, cost: 10000, progress_percentage: 30, predecessors: ['act-013'], responsable: 'Luis Torres', assigned_role: '', assigned_members: [{ member_id: 'tm-006', role: 'DevOps' }] },
        ],
      },
      {
        id: 'phase-010', phase_order: 4, phase_name: 'Pruebas', percentage: 20,
        activities: [
          { id: 'act-015', activity_name: 'Pruebas de funcionalidad', deliverable: 'Reporte de pruebas', optimal_time: 12, estimated_time: 12, pessimistic_time: 12, duration_days: 12, cost: 7500, progress_percentage: 0, predecessors: ['act-014'], responsable: 'Luis Torres', assigned_role: '', assigned_members: [{ member_id: 'tm-006', role: 'QA' }] },
        ],
      },
      {
        id: 'phase-011', phase_order: 5, phase_name: 'Implementación/Despliegue', percentage: 10,
        activities: [
          { id: 'act-016', activity_name: 'Cutover a producción', deliverable: 'Documentación de cutover', optimal_time: 7, estimated_time: 7, pessimistic_time: 7, duration_days: 7, cost: 7500, progress_percentage: 0, predecessors: ['act-015'], responsable: 'Roberto Silva', assigned_role: '', assigned_members: [{ member_id: 'tm-004', role: 'Coordinador' }] },
        ],
      },
      {
        id: 'phase-012', phase_order: 6, phase_name: 'Mantenimiento', percentage: 5,
        activities: [
          { id: 'act-017', activity_name: 'Optimización y ajustes', deliverable: 'Documentación final', optimal_time: 4, estimated_time: 4, pessimistic_time: 4, duration_days: 4, cost: 2250, progress_percentage: 0, predecessors: ['act-016'], responsable: 'Ana Martínez', assigned_role: '', assigned_members: [{ member_id: 'tm-005', role: 'Optimizador' }, { member_id: 'tm-006', role: 'Soporte' }] },
        ],
      },
    ],
    cut_dates: [
      { id: 'cd-004', cut_date: '2024-08-31', actual_percentage: 20, actual_cost: 15000, pv_value: 12500, ev_value: 15000, cpi: 1.0, spi: 1.2 },
      { id: 'cd-005', cut_date: '2024-11-15', actual_percentage: 55, actual_cost: 41250, pv_value: 37500, ev_value: 41250, cpi: 1.0, spi: 1.1 },
      { id: 'cd-006', cut_date: '2025-02-28', actual_percentage: 75, actual_cost: 56250, pv_value: 52500, ev_value: 56250, cpi: 1.0, spi: 1.07 },
    ],
    created_at: '2026-09-30T00:57:00.583Z',
    updated_at: '2026-09-30T00:57:00.583Z',
  },
  {
    id: 'df264244-cc78-46aa-a586-7638952ad543',
    name: 'Sistema de Registro Digital de Clientes - Gimnasio JEMAG',
    description: 'Sistema para digitalizar el registro de ingreso de clientes del Gimnasio JEMAG, actualmente llevado en cuadernos físicos.',
    start_date: '2026-09-24',
    end_date: '2026-11-04',
    bac: 3604.48,
    project_manager: 'Rene Masaquiza',
    project_assistant: '',
    team_members: [
      { id: 'tm-1', member_name: 'Rene Masaquiza', member_role: 'PM (Líder de Proyecto)' },
      { id: 'tm-2', member_name: 'Jesica Soria', member_role: 'Dev (Desarrollador Backend/Frontend)' },
      { id: 'tm-3', member_name: 'John Ochoa', member_role: 'Analista de Datos / DBA' },
      { id: 'tm-4', member_name: 'Luis Paredes', member_role: 'QA (Control de Calidad / Soporte)' },
    ],
    wbs_phases: [
      {
        id: 'phase-1', phase_order: 1, phase_name: 'Gestión', percentage: 0,
        activities: [
          { id: 'T-01-01', activity_name: 'Plan del proyecto aprobado', deliverable: 'Documento con alcance, objetivos, cronograma y responsables del proyecto, validado por el equipo', optimal_time: 0.5, estimated_time: 1, pessimistic_time: 2, duration_days: 1.08, cost: 86.4, progress_percentage: 0, predecessors: [], responsable: 'Masaquiza', assigned_role: '' },
          { id: 'T-01-02', activity_name: 'Seguimiento y control de avances', deliverable: 'Reportes periódicos del estado de cada tarea de la EDT', optimal_time: 4, estimated_time: 5, pessimistic_time: 7, duration_days: 5.17, cost: 413.6, progress_percentage: 0, predecessors: ['T-01-01'], responsable: 'Masaquiza', assigned_role: '' },
          { id: 'T-01-03', activity_name: 'Informe de cierre del proyecto', deliverable: 'Documento final resumiendo resultados, lecciones aprendidas y entregables', optimal_time: 0.5, estimated_time: 1, pessimistic_time: 2, duration_days: 1.08, cost: 86.4, progress_percentage: 0, predecessors: ['T-05-03'], responsable: 'Masaquiza', assigned_role: '' },
        ],
      },
      {
        id: 'phase-2', phase_order: 2, phase_name: 'Productos (Desarrollo)', percentage: 0,
        activities: [
          { id: 'T-02-01', activity_name: 'Módulo de registro de socios funcional', deliverable: 'Interfaz donde el recepcionista busca y registra el ingreso de un cliente', optimal_time: 7, estimated_time: 10, pessimistic_time: 14, duration_days: 10.17, cost: 650.88, progress_percentage: 0, predecessors: ['T-03-01'], responsable: 'Soria', assigned_role: '' },
          { id: 'T-02-02', activity_name: 'Módulo de escaneo QR integrado', deliverable: 'Funcionalidad de lectura de código QR desde la cámara de la tablet/PC', optimal_time: 5, estimated_time: 7, pessimistic_time: 10, duration_days: 7.17, cost: 458.88, progress_percentage: 0, predecessors: ['T-04-01'], responsable: 'Soria', assigned_role: '' },
          { id: 'T-02-03', activity_name: 'Panel administrativo con historial de ingresos', deliverable: 'Vista para el dueño/administrador con reportes e historial de ingresos', optimal_time: 5, estimated_time: 7, pessimistic_time: 10, duration_days: 7.17, cost: 458.88, progress_percentage: 0, predecessors: ['T-02-02'], responsable: 'Soria', assigned_role: '' },
        ],
      },
      {
        id: 'phase-3', phase_order: 3, phase_name: 'Datos', percentage: 0,
        activities: [
          { id: 'T-03-01', activity_name: 'Diseño de la base de datos relacional', deliverable: 'Modelo de tablas clientes y registros_ingreso en PostgreSQL, con sus relaciones', optimal_time: 2, estimated_time: 3, pessimistic_time: 5, duration_days: 3.17, cost: 202.88, progress_percentage: 0, predecessors: ['T-01-01'], responsable: 'Ochoa', assigned_role: '' },
          { id: 'T-03-02', activity_name: 'Carga inicial de datos de socios existentes', deliverable: 'Base de datos poblada con los clientes actuales del gimnasio', optimal_time: 1, estimated_time: 2, pessimistic_time: 3, duration_days: 2, cost: 128, progress_percentage: 0, predecessors: ['T-03-01'], responsable: 'Ochoa', assigned_role: '' },
          { id: 'T-03-03', activity_name: 'Validación de datos migrados', deliverable: 'Verificación de que los datos cargados sean correctos y completos', optimal_time: 1, estimated_time: 1.5, pessimistic_time: 3, duration_days: 1.67, cost: 106.88, progress_percentage: 0, predecessors: ['T-03-02'], responsable: 'Ochoa', assigned_role: '' },
        ],
      },
      {
        id: 'phase-4', phase_order: 4, phase_name: 'Seguridad', percentage: 0,
        activities: [
          { id: 'T-04-01', activity_name: 'Autenticación configurada (login del personal)', deliverable: 'Sistema de inicio de sesión con usuario y contraseña para el personal', optimal_time: 2, estimated_time: 2.5, pessimistic_time: 4, duration_days: 2.67, cost: 170.88, progress_percentage: 0, predecessors: ['T-02-01'], responsable: 'Soria', assigned_role: '' },
          { id: 'T-04-02', activity_name: 'Pruebas de acceso (control de credenciales)', deliverable: 'Verificación de que cada rol (recepcionista/administrador) tenga los permisos correctos', optimal_time: 1, estimated_time: 2, pessimistic_time: 3, duration_days: 2, cost: 96, progress_percentage: 0, predecessors: ['T-04-01'], responsable: 'Paredes', assigned_role: '' },
          { id: 'T-04-03', activity_name: 'Respaldo semanal de base de datos', deliverable: 'Archivo .sql generado con pg_dump, almacenado en USB y Google Drive', optimal_time: 0.5, estimated_time: 1, pessimistic_time: 1.5, duration_days: 1, cost: 64, progress_percentage: 0, predecessors: ['T-03-03'], responsable: 'Ochoa', assigned_role: '' },
        ],
      },
      {
        id: 'phase-5', phase_order: 5, phase_name: 'Adopción', percentage: 0,
        activities: [
          { id: 'T-05-01', activity_name: 'Capacitación al personal de recepción (3 trabajadores)', deliverable: 'Sesión de capacitación práctica sobre el uso del sistema', optimal_time: 1, estimated_time: 1.5, pessimistic_time: 3, duration_days: 1.67, cost: 133.6, progress_percentage: 0, predecessors: ['T-02-03', 'T-03-03', 'T-04-02'], responsable: 'Masaquiza', assigned_role: '' },
          { id: 'T-05-02', activity_name: 'Piloto de prueba con clientes reales', deliverable: 'Prueba del sistema en un día real de operación del gimnasio', optimal_time: 3, estimated_time: 4, pessimistic_time: 6, duration_days: 4.17, cost: 333.6, progress_percentage: 0, predecessors: ['T-05-01'], responsable: 'Masaquiza', assigned_role: '' },
          { id: 'T-05-03', activity_name: 'Implementación final del sistema', deliverable: 'Sistema puesto en funcionamiento definitivo en el gimnasio', optimal_time: 2, estimated_time: 2.5, pessimistic_time: 4, duration_days: 2.67, cost: 213.6, progress_percentage: 0, predecessors: ['T-05-02'], responsable: 'Masaquiza', assigned_role: '' },
        ],
      },
    ],
    cut_dates: [],
    problem: {
      central: 'Registro de usuarios lento y susceptible a errores',
      causas: [
        'Registros manuales (cuadernos)',
        'Falta de automatización',
        'Errores humanos (letra ilegible o confusiones de fechas)',
        'Falta de control en tiempo real',
        'Métodos tradicionales para identificación de los usuarios',
        'Falta de trazabilidad',
      ],
      efectos: [
        'Pérdida de tiempo (largas filas al momento de registrarse)',
        'Más carga administrativa',
        'Registros incorrectos',
        'Información desactualizada',
        'Dificultad para verificación de identidad',
        'Dificultad a la hora de generar reportes',
      ],
      pmp: { que: '', porque: '', quienes: '', consecuencia: '', urgencia: '' },
    },
    justification: { pertinencia: '', urgencia: '', viabilidad: '', impacto: '' },
    raci: {
      'T-01-01': { 'tm-1': 'A', 'tm-2': 'C', 'tm-3': 'C', 'tm-4': 'I' },
      'T-01-02': { 'tm-1': 'A', 'tm-2': 'R', 'tm-3': 'R', 'tm-4': 'R' },
      'T-02-01': { 'tm-1': 'I', 'tm-2': 'A', 'tm-3': 'C', 'tm-4': 'C' },
      'T-02-02': { 'tm-1': 'I', 'tm-2': 'A', 'tm-3': 'C', 'tm-4': 'C' },
      'T-02-03': { 'tm-1': 'C', 'tm-2': 'A', 'tm-3': 'C', 'tm-4': 'I' },
      'T-03-01': { 'tm-1': 'I', 'tm-2': 'C', 'tm-3': 'A', 'tm-4': 'I' },
      'T-03-02': { 'tm-1': 'I', 'tm-2': 'I', 'tm-3': 'A', 'tm-4': 'C' },
      'T-04-01': { 'tm-1': 'I', 'tm-2': 'A', 'tm-3': 'C', 'tm-4': 'C' },
      'T-04-02': { 'tm-1': 'I', 'tm-2': 'R', 'tm-3': 'C', 'tm-4': 'A' },
      'T-04-03': { 'tm-1': 'I', 'tm-2': 'C', 'tm-3': 'A', 'tm-4': 'I' },
      'T-05-01': { 'tm-1': 'A', 'tm-2': 'I', 'tm-3': 'I', 'tm-4': 'R' },
      'T-05-02': { 'tm-1': 'A', 'tm-2': 'R', 'tm-3': 'R', 'tm-4': 'R' },
      'T-05-03': { 'tm-1': 'A', 'tm-2': 'R', 'tm-3': 'R', 'tm-4': 'R' },
    },
    created_at: '2026-09-29T17:46:30.492Z',
    updated_at: '2026-09-29T17:55:08.149Z',
  },
];

export const getAllProjects = () => readStorage();

export const getProject = (id) => {
  const projects = getAllProjects();
  return projects.find((p) => p.id === id) ?? null;
};

export const saveProject = (project) => {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error('El proyecto no tiene un formato válido.');
  }
  const projects = getAllProjects();
  const normalizedProject = normalizeProject(project);
  const now = new Date().toISOString();
  normalizedProject.id = normalizedProject.id ?? `proj-${Date.now()}`;
  normalizedProject.updated_at = now;
  normalizedProject.created_at = normalizedProject.created_at ?? now;

  const index = projects.findIndex((item) => item.id === normalizedProject.id);
  if (index === -1) {
    projects.push(normalizedProject);
  } else {
    projects[index] = { ...projects[index], ...normalizedProject };
  }

  writeStorage(projects);
  return normalizedProject;
};

export const deleteProject = (id) => {
  const projects = getAllProjects();
  writeStorage(projects.filter((p) => p.id !== id));
};

export const addCutDate = (projectId, cutDate) => {
  const project = getProject(projectId);
  if (!project) throw new Error('No se encontró el proyecto para agregar la fecha de corte.');
  if (!cutDate || typeof cutDate !== 'object') throw new Error('La fecha de corte no tiene un formato válido.');
  if (project.cut_dates?.some((item) => item.cut_date === cutDate.cut_date)) {
    throw new Error('Ya existe una fecha de corte para este proyecto.');
  }
  const savedCutDate = { ...cutDate, id: `cd-${Date.now()}`, created_at: new Date().toISOString() };
  project.cut_dates = [...(project.cut_dates ?? []), savedCutDate].sort((a, b) => String(a.cut_date).localeCompare(String(b.cut_date)));
  saveProject(project);
  return savedCutDate;
};
