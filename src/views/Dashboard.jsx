import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, TrendingUp, Eye, Edit2, Trash2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getAllProjects, deleteProject } from '../utils/storageManager';
import { getProjectStatus, getStatusBadgeColor, getStatusLabel, calculateProjectMetrics, formatCurrency, formatIndex } from '../utils/evmCalculations';
import { ConfirmModal } from '../utils/ConfirmModal';
import { AlertModal } from '../utils/AlertModal';

export default function Dashboard({ onNewProject, onViewDetail, onEditProject, pendingMessage, onPendingMessageShown }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (pendingMessage) {
      setAlert({ type: 'success', message: pendingMessage });
      onPendingMessageShown?.();
    }
  }, [pendingMessage]);

  const loadProjects = async () => {
    try {
      setProjects(await getAllProjects());
    } catch (loadError) {
      setProjects([]);
      setAlert({ type: 'error', message: `No se pudo conectar con el servidor: ${loadError.message}` });
    } finally {
      setLoading(false);
    }
  };

  const getLatestMetrics = (project) => {
    if (!project.cut_dates || project.cut_dates.length === 0) {
      return null;
    }
    return project.cut_dates[project.cut_dates.length - 1];
  };

  // % Avance del Dashboard: promedio del % de cada tarea del WBS, ponderado por su costo
  // (una tarea de $400 pesa más que una de $50). Es independiente del CPI/SPI del Estado,
  // que sigue necesitando una Fecha de Corte real (costo real vs. planificado) para calcularse.
  const getWbsProgress = (project) => {
    const activities = (project.wbs_phases ?? []).flatMap((phase) => phase.activities ?? []);
    if (activities.length === 0) return null;
    const totalCost = activities.reduce((sum, activity) => sum + (Number(activity.cost) || 0), 0);
    if (totalCost > 0) {
      const weighted = activities.reduce(
        (sum, activity) => sum + (Number(activity.cost) || 0) * (Number(activity.progress_percentage) || 0),
        0,
      );
      return weighted / totalCost;
    }
    const total = activities.reduce((sum, activity) => sum + (Number(activity.progress_percentage) || 0), 0);
    return total / activities.length;
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

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteProject(id);
      setDeleteConfirm(null);
      await loadProjects();
      setAlert({ type: 'success', message: 'Proyecto eliminado correctamente.' });
    } catch (deleteError) {
      setAlert({ type: 'error', message: `No se pudo eliminar: ${deleteError.message}` });
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const summary = calculateSummary();

  const portfolioRows = projects.map((project) => {
    const latest = getLatestMetrics(project);
    if (!latest) return { id: project.id, name: project.name, hasData: false };
    const metrics = calculateProjectMetrics(project.bac, latest);
    const status = getProjectStatus(metrics.cpi, metrics.spi);
    return { id: project.id, name: project.name, hasData: true, status, ...metrics };
  });
  const portfolioChartData = portfolioRows
    .filter((row) => row.hasData && row.cpi !== null && row.spi !== null)
    .map((row) => ({ name: row.name.length > 18 ? `${row.name.slice(0, 18)}…` : row.name, CPI: row.cpi, SPI: row.spi }));

  return (
    <div className="p-6">
      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Gestor de Proyectos TI</h1>
          <p className="text-gray-600 mt-2">Gestión y seguimiento de proyectos TI</p>
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 bg-blueprint-600 text-white px-6 py-3 rounded-lg hover:bg-blueprint-700 transition-colors font-medium "
        >
          <Plus size={20} />
          Nuevo Proyecto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Projects */}
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 border-l-4 border-blueprint-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Proyectos</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{summary.totalProjects}</p>
            </div>
            <div className="bg-blueprint-100 p-3 rounded-full">
              <TrendingUp className="text-blueprint-600" size={28} />
            </div>
          </div>
        </div>

        {/* At Risk Projects */}
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 border-l-4 border-red-500">
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
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 border-l-4 border-green-500">
          <div>
            <p className="text-gray-600 text-sm font-medium">Proyectos Saludables</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{summary.healthyCount}</p>
            <p className="text-xs text-gray-500 mt-2">Estado optimizado</p>
          </div>
        </div>
      </div>

      {/* Portfolio Comparison */}
      {projects.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><BarChart3 size={20} /> Comparación de Portafolio</h2>
          <p className="text-sm text-gray-600 mb-4">CPI y SPI de todos los proyectos lado a lado. La línea punteada marca la meta (1.0): por debajo, el proyecto va mal en costo o cronograma.</p>

          {portfolioChartData.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Ningún proyecto tiene todavía una fecha de corte registrada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, portfolioChartData.length * 50)}>
              <BarChart data={portfolioChartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" domain={[0, 'dataMax + 0.2']} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatIndex(value)} />
                <Legend />
                <ReferenceLine x={1} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'Meta 1.0', position: 'top', fontSize: 11, fill: '#6b7280' }} />
                <Bar dataKey="CPI" fill="#4d84e0" radius={[0, 3, 3, 0]} />
                <Bar dataKey="SPI" fill="#16a34a" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-2 pr-2">Proyecto</th>
                  <th className="py-2 pr-2 text-right">BAC</th>
                  <th className="py-2 pr-2 text-right">EV</th>
                  <th className="py-2 pr-2 text-right">AC</th>
                  <th className="py-2 pr-2 text-right">CPI</th>
                  <th className="py-2 pr-2 text-right">SPI</th>
                  <th className="py-2 pr-2 text-right">VAC</th>
                  <th className="py-2 pr-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {portfolioRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 font-medium text-gray-900">{row.name}</td>
                    {row.hasData ? (
                      <>
                        <td className="py-1.5 pr-2 text-right font-mono">{formatCurrency(row.bac)}</td>
                        <td className="py-1.5 pr-2 text-right font-mono">{formatCurrency(row.ev)}</td>
                        <td className="py-1.5 pr-2 text-right font-mono">{formatCurrency(row.ac)}</td>
                        <td className={`py-1.5 pr-2 text-right font-mono font-semibold ${row.cpi !== null && row.cpi < 1 ? 'text-red-600' : 'text-green-600'}`}>{formatIndex(row.cpi)}</td>
                        <td className={`py-1.5 pr-2 text-right font-mono font-semibold ${row.spi !== null && row.spi < 1 ? 'text-red-600' : 'text-green-600'}`}>{formatIndex(row.spi)}</td>
                        <td className={`py-1.5 pr-2 text-right font-mono ${row.vac !== null && row.vac < 0 ? 'text-red-600' : 'text-green-600'}`}>{row.vac === null ? 'N/A' : formatCurrency(row.vac)}</td>
                        <td className="py-1.5 pr-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeColor(row.status)}`}>{getStatusLabel(row.status)}</span>
                        </td>
                      </>
                    ) : (
                      <td className="py-1.5 pr-2 text-gray-400 italic" colSpan={7}>Sin fecha de corte registrada</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          title="Confirmar Eliminación"
          message="¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          busyLabel="Eliminando..."
          busy={deleting}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
        />
      )}

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
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
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Cargando proyectos...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
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
                   const wbsProgress = getWbsProgress(project);
                   const rawPercentage = wbsProgress !== null ? wbsProgress : Number(latestMetrics?.actual_percentage);
                   const percentage = Number.isFinite(rawPercentage) ? Math.round(Math.min(100, Math.max(0, rawPercentage))) : 0;

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
                               className="bg-blueprint-600 h-2 rounded-full"
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
                            className="text-blueprint-600 hover:text-blueprint-900 font-medium text-sm p-1 rounded hover:bg-blueprint-50"
                            title="Ver proyecto"
                          >
                            <Eye size={16} />
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
