/**
 * VERSIÓN CONECTADA A POSTGRESQL (guardada de referencia, actualmente NO en uso).
 *
 * Esta es la implementación de storageManager que hace fetch() al backend
 * (server.js + PostgreSQL). Permite que varios usuarios/PCs compartan los
 * mismos proyectos de verdad. Se dejó de usar para simplificar la entrega
 * a los compañeros de equipo (no necesitan instalar PostgreSQL para probar
 * la app), pero queda aquí lista para retomarla:
 *
 *   1. Reemplaza el contenido de storageManager.js por el de este archivo.
 *   2. Asegúrate de tener PostgreSQL corriendo y "npm run db:init" ejecutado.
 *   3. Levanta el backend con "npm run server" además de "npm run dev".
 */

const API_BASE_URL = '/api';

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

const readErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data?.error || `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  if (response.status === 204) return null;
  return response.json();
};

// Mantenido por compatibilidad: la app ya no usa localStorage, los datos viven en PostgreSQL.
export const initializeStorage = () => {};

export const getAllProjects = async () => {
  const projects = await request('/projects');
  return projects.map(normalizeProject);
};

export const getProject = async (id) => {
  try {
    const project = await request(`/projects/${id}`);
    return normalizeProject(project);
  } catch (error) {
    return null;
  }
};

export const saveProject = async (project) => {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error('El proyecto no tiene un formato válido.');
  }
  const normalizedProject = normalizeProject(project);
  const saved = project.id
    ? await request(`/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(normalizedProject) })
    : await request('/projects', { method: 'POST', body: JSON.stringify(normalizedProject) });
  return normalizeProject(saved);
};

export const deleteProject = async (id) => {
  await request(`/projects/${id}`, { method: 'DELETE' });
};

export const addCutDate = async (projectId, cutDate) => {
  if (!cutDate || typeof cutDate !== 'object') throw new Error('La fecha de corte no tiene un formato válido.');
  return request(`/projects/${projectId}/cut-dates`, { method: 'POST', body: JSON.stringify(cutDate) });
};
