import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { getAllProjects, deleteProject } from '../utils/storageManager';
import { getProjectStatus, getStatusBadgeColor, getStatusLabel } from '../utils/evmCalculations';

export default function Dashboard({ onNewProject, onViewDetail, onEditProject }) {
  const [projects, setProjects] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      setProjects(getAllProjects());
      setError('');
    } catch (loadError) {
      setProjects([]);
      setError(loadError.message);
    }
  };

  const getLatestMetrics = (project) => {
    if (!project.cut_dates || project.cut_dates.length === 0) {
      return null;
    }
    return project.cut_dates[project.cut_dates.length - 1];
  };

  const calculateSummary = () => {
    const totalProjects = projects.length;
    let atRiskCount = 0;
    let healthyCount = 0;

    projects.forEach((project) => {
      const metrics = getLatestMetrics(project);
      if (metrics) {
        const status = getProjectStatus(metrics.cpi, metrics.spi);
        if (status === 'atención' || status === 'crítico') atRiskCount++;
        if (status === 'saludable') healthyCount++;
      }
    });

    return { totalProjects, atRiskCount, healthyCount };
  };

  const handleDelete = (id) => {
    try {
      deleteProject(id);
      setDeleteConfirm(null);
      setError('');
      loadProjects();
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleteConfirm(null);
    }
  };

  const summary = calculateSummary();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Gestor de Proyectos TI</h1>
          <p className="text-gray-600 mt-2">Gestión y seguimiento de proyectos TI</p>
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-lg"
        >
          <Plus size={20} />
          Nuevo Proyecto
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Projects */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Proyectos</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{summary.totalProjects}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="text-blue-600" size={28} />
            </div>
          </div>
        </div>

        {/* At Risk Projects */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Proyectos en Riesgo</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{summary.atRiskCount}</p>
               <p className="text-xs text-gray-500 mt-2">Requieren seguimiento</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="text-red-600" size={28} />
            </div>
          </div>
        </div>

        {/* Average Project Health */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div>
            <p className="text-gray-600 text-sm font-medium">Proyectos Saludables</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{summary.healthyCount}</p>
            <p className="text-xs text-gray-500 mt-2">Estado optimizado</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Eliminación</h3>
            <p className="text-gray-700 mb-6">¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Proyectos</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Fecha Inicio</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Fecha Fin</th>
                 <th className="px-6 py-3 text-center font-semibold text-gray-700">% Avance</th>
                 <th className="px-6 py-3 text-center font-semibold text-gray-700">Estado</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No hay proyectos. Crea uno nuevo para comenzar.
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                   const latestMetrics = getLatestMetrics(project);
                   const status = latestMetrics
                     ? getProjectStatus(latestMetrics.cpi, latestMetrics.spi)
                     : 'pendiente';
                   const rawPercentage = Number(latestMetrics?.actual_percentage);
                   const percentage = Number.isFinite(rawPercentage) ? Math.min(100, Math.max(0, rawPercentage)) : 0;

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{project.name}</td>
                      <td className="px-6 py-4 text-gray-700">{project.start_date}</td>
                      <td className="px-6 py-4 text-gray-700">{project.end_date}</td>
                       <td className="px-6 py-4 text-center">
                         <div className="flex items-center justify-center gap-2">
                           <div className="w-24 bg-gray-200 rounded-full h-2">
                             <div
                               className="bg-indigo-600 h-2 rounded-full"
                               style={{ width: `${Math.min(percentage, 100)}%` }}
                             ></div>
                           </div>
                           <span className="text-gray-700 font-medium w-8 text-right">{percentage}%</span>
                         </div>
                       </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => onViewDetail(project.id)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium text-sm px-2 py-1 rounded hover:bg-indigo-50"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => onEditProject(project.id)}
                            className="text-blue-600 hover:text-blue-900 font-medium text-sm p-1 rounded hover:bg-blue-50"
                            title="Editar proyecto"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(project.id)}
                            className="text-red-600 hover:text-red-900 font-medium text-sm p-1 rounded hover:bg-red-50"
                            title="Eliminar proyecto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
