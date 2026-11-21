/**
 * Almacenamiento conectado a PostgreSQL (vía server.js). Todos los usuarios/PCs
 * en la red comparten los mismos proyectos de verdad, guardados en la base de
 * datos, en vez de localStorage por navegador.
 *
 * Requiere:
 *   1. PostgreSQL corriendo y "npm run db:init" ejecutado.
 *   2. Backend levantado con "npm run server" además de "npm run dev".
 *
 * La versión anterior basada en localStorage (datos solo locales, sin
 * necesidad de PostgreSQL) quedó guardada en storageManager.local.backup.js
 * por si se necesita retomarla.
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

// Asistente de IA: manda un resumen en texto plano (ya armado en el frontend a partir
// de los datos del proyecto) y recibe el análisis de viabilidad en texto.
export const requestAiFeasibility = async (summary) => {
  const { text } = await request('/ai/feasibility', { method: 'POST', body: JSON.stringify({ summary }) });
  return text;
};
