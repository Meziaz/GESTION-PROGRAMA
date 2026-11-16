/**
 * Project Header Info Component
 * Displays project metadata including PM, assistant, and other info
 */

import React from 'react';
import { Users, Calendar, User } from 'lucide-react';

export function ProjectHeaderInfo({ project }) {
  if (!project) return null;

  return (
    <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
      {/* Project Manager */}
      {project.project_manager && (
        <div className="bg-blueprint-50 rounded-lg p-4 border border-blueprint-200">
          <div className="flex items-start gap-3">
            <div className="bg-blueprint-100 p-2 rounded-lg">
              <User className="text-blueprint-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium uppercase">Administrador del Proyecto</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{project.project_manager}</p>
            </div>
          </div>
        </div>
      )}

      {/* Project Assistant */}
      {project.project_assistant && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Users className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium uppercase">Asistente del Proyecto</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{project.project_assistant}</p>
            </div>
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="bg-amberline/10 rounded-lg p-4 border border-amberline/30">
        <div className="flex items-start gap-3">
          <div className="bg-amberline/20 p-2 rounded-lg">
            <Calendar className="text-amberline" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-600 font-medium uppercase">Duración</p>
             <p className="text-sm font-semibold text-gray-900 mt-1">
               {project.start_date} hasta {project.end_date}
             </p>
          </div>
        </div>
      </div>

    </div>
  );
}

/**
 * Team Members Display Component
 */
export function TeamMembersInfo({ project }) {
  if (!project || !project.team_members || project.team_members.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipo del Proyecto</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {project.team_members.map((member) => (
          <div key={member.id} className="bg-paper rounded-lg p-4 border border-paper-line">
            <p className="font-semibold text-gray-900">{member.member_name}</p>
            <p className="text-sm text-gray-600 mt-1">{member.member_role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Project Metadata Component
 */
export function ProjectMetadata({ project }) {
  if (!project) return null;
  const phaseCount = Array.isArray(project.wbs_phases) ? project.wbs_phases.length : 0;
  const activityCount = (project.wbs_phases ?? []).reduce(
    (total, phase) => total + (Array.isArray(phase?.activities) ? phase.activities.length : 0),
    0,
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Proyecto</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600">Descripción</p>
          <p className="text-gray-900 mt-1">{project.description}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Fases</p>
          <p className="text-gray-900 mt-1">{phaseCount} fases en el proyecto</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Tareas</p>
          <p className="text-gray-900 mt-1">{activityCount} tareas planificadas</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Periodo</p>
          <p className="text-gray-900 mt-1">{project.start_date} — {project.end_date}</p>
        </div>
      </div>
    </div>
  );
}
