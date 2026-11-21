import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Loader, ChevronDown, ChevronUp, CalendarDays, Network, ClipboardList, Users2, FileText, Layers, Wallet } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  generateSigmoidCurve,
  calculateProjectMetrics,
  formatCurrency,
  formatIndex,
  getProjectStatus,
  getStatusBadgeColor,
  getStatusLabel,
  linearRegression,
} from '../utils/evmCalculations';
import { getProject, addCutDate, saveProject } from '../utils/storageManager';
import { filterDecimal } from '../utils/inputFilters';
import { ProjectHeaderInfo, TeamMembersInfo, ProjectMetadata } from '../utils/projectDetailComponents';
import { WBSValidationPanel, CriticalPathPanel, CronogramaPanel, DiccionarioEDTPanel } from '../utils/wbsValidationUI';
import { DiagnosticoPanel } from '../utils/diagnosticoPanel';
import { RaciPanel } from '../utils/raciPanel';
import { ActaPanel } from '../utils/actaPanel';
import { BlueprintPanel } from '../utils/blueprintPanel';
import { ResourcesPanel } from '../utils/resourcesPanel';
import { QualityPanel } from '../utils/qualityPanel';
import { RisksPanel } from '../utils/risksPanel';
import { ControlDashboardPanel } from '../utils/controlDashboardPanel';
import { EconomicsPanel } from '../utils/economicsPanel';
import { ChangeControlPanel } from '../utils/changeControlPanel';
import { AiAdvisorPanel } from '../utils/aiAdvisorPanel';
import { WbsEvmPanel } from '../utils/wbsEvmPanel';
import { ResourceLevelingPanel } from '../utils/resourceLevelingPanel';
import { AlertModal } from '../utils/AlertModal';

const parseLocalDate = (value) => {
  const normalized = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(`${normalized}T00:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? date : null;
};

const localDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

// Barra de sub-pestañas usada dentro de los módulos que agrupan varios paneles
// (Acta y Alcance, EDT y Cronograma, Equipo y Recursos).
const SubTabBar = ({ tabs, active, onChange }) => (
  <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3 print:hidden">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            isActive ? 'bg-blueprint-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blueprint-50 hover:text-blueprint-700'
          }`}
        >
          <Icon size={15} />
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default function ProjectDetail({ projectId, onBack, activeSection, onSectionChange }) {
  const [project, setProject] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCutDateForm, setShowCutDateForm] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [selectedCutDateIndex, setSelectedCutDateIndex] = useState(null); // Nueva
  const [newCutDate, setNewCutDate] = useState({
    cut_date: localDateString(),
    actual_percentage: 0,
    actual_cost: 0,
    committed_cost: 0,
    paid_cost: 0,
  });
  const [cutDateError, setCutDateError] = useState(''); // Nueva
  const [charterTab, setCharterTab] = useState('diagnostico');
  const [scheduleTab, setScheduleTab] = useState('wbs');
  const [teamTab, setTeamTab] = useState('raci');
  const cutDateFormRef = useRef(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    const proj = await getProject(projectId);
    if (!proj) {
      setProject(null);
      setLoading(false);
      return;
    }
    setProject(proj);
    const projectStart = parseLocalDate(proj.start_date);
    const projectEnd = parseLocalDate(proj.end_date);
    const currentDate = parseLocalDate(localDateString());
    if (projectStart && projectEnd) {
      const defaultCutDate = currentDate && currentDate >= projectStart && currentDate <= projectEnd
        ? localDateString()
        : proj.start_date;
      setNewCutDate((previous) => ({ ...previous, cut_date: defaultCutDate }));
    }
    if (proj.cut_dates && proj.cut_dates.length > 0) {
      setSelectedCutDateIndex(proj.cut_dates.length - 1);
      calculateMetrics(proj, proj.cut_dates.length - 1);
      generateChart(proj, proj.cut_dates.length - 1);
    } else {
      setSelectedCutDateIndex(null);
      calculateMetrics(proj, null);
      generateChart(proj, null);
    }
    setLoading(false);
  };

  const calculateMetrics = (proj, cutDateIndex = null) => {
    if (!proj.cut_dates || proj.cut_dates.length === 0) {
      setMetrics(null);
      return;
    }

    const index = cutDateIndex !== null ? cutDateIndex : proj.cut_dates.length - 1;
    const latest = proj.cut_dates[index];
    if (!latest) {
      setMetrics(null);
      return;
    }
    const metricsData = calculateProjectMetrics(proj.bac, latest);
    setMetrics(metricsData);
  };

  const generateChart = (proj, cutDateIndex = null) => {
    const bac = Number(proj.bac) || 0;
    const start = parseLocalDate(proj.start_date) ?? new Date();
    const end = parseLocalDate(proj.end_date) ?? new Date();
    const totalDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)));

    const pvCurve = generateSigmoidCurve(bac, totalDays);

    // Initialize data structure
    const data = [];
    let lastCutDayIndex = -1;
    let lastEV = 0;
    let lastAC = 0;

    // Find selected cut date index and values
    if (proj.cut_dates && proj.cut_dates.length > 0) {
      // Use the specified index or the last one
      const index = cutDateIndex !== null ? cutDateIndex : proj.cut_dates.length - 1;
      const selectedCut = proj.cut_dates[index];
      const cutStart = parseLocalDate(proj.start_date) ?? new Date();
      const cutDate_ = parseLocalDate(selectedCut?.cut_date);
      if (cutDate_) lastCutDayIndex = Math.max(0, Math.min(totalDays, Math.floor((cutDate_ - cutStart) / (1000 * 60 * 60 * 24))));
      lastEV = ((Number(selectedCut?.actual_percentage) || 0) / 100) * bac;
      lastAC = Number(selectedCut?.actual_cost) || 0;
    }

    // Build chart data
    for (let day = 0; day <= totalDays; day++) {
      const pv = pvCurve[day]?.pv || 0;
      
      let dataPoint = {
        day,
        pv: Math.round(pv * 100) / 100,
        ev: null,
        ac: null,
        ev_projection: null,
        ac_projection: null,
      };

      // If there's a cut date, interpolate values from 0 to cut date
      if (lastCutDayIndex >= 0) {
        if (day <= lastCutDayIndex) {
          // Linear interpolation from (0,0) to (lastCutDayIndex, lastEV/lastAC)
          const progress = lastCutDayIndex > 0 ? day / lastCutDayIndex : 1;
          dataPoint.ev = Math.round(lastEV * progress * 100) / 100;
          dataPoint.ac = Math.round(lastAC * progress * 100) / 100;
          
          // At cut date point, also add projection values to connect without gap
          if (day === lastCutDayIndex) {
            dataPoint.ev_projection = dataPoint.ev;
            dataPoint.ac_projection = dataPoint.ac;
          }
        } 
        // AFTER cut date: show projections with linear slope
        else if (day > lastCutDayIndex) {
          const daysFromCut = day - lastCutDayIndex;
          const remainingDays = totalDays - lastCutDayIndex;
          const progressFraction = Math.min(1, daysFromCut / remainingDays);
          const remainingEV = bac - lastEV;
          
          // Calculate projection based on current rate
          let remainingAC = 0;
          if (lastEV > 0 && lastAC > 0) {
            const costPerEV = lastAC / lastEV;
            remainingAC = remainingEV * costPerEV;
          }

          dataPoint.ev_projection = Math.round((lastEV + remainingEV * progressFraction) * 100) / 100;
          dataPoint.ac_projection = Math.round((lastAC + remainingAC * progressFraction) * 100) / 100;
        }
      }

      data.push(dataPoint);
    }

    setChartData(data);
  };

  const handleCutDateChange = (index) => {
    if (!project?.cut_dates?.[index]) return;
    setSelectedCutDateIndex(index);
    calculateMetrics(project, index);
    generateChart(project, index);
  };

  const handleAddCutDate = async () => {
    if (!project) {
      setCutDateError('No se encontró el proyecto.');
      return;
    }
    const start = parseLocalDate(project.start_date);
    const end = parseLocalDate(project.end_date);
    const cutDate_ = parseLocalDate(newCutDate.cut_date);
    const actualPercentage = Number(newCutDate.actual_percentage);
    const actualCost = Number(newCutDate.actual_cost);
    if (!cutDate_ || !start || !end) {
      setCutDateError('Selecciona una fecha de corte válida.');
      return;
    }
    if (cutDate_ < start) {
      setCutDateError(`La fecha de corte no puede ser antes del inicio del proyecto (${project.start_date}).`);
      return;
    }
    if (cutDate_ > end) {
      setCutDateError(`La fecha de corte no puede ser después del fin del proyecto (${project.end_date}).`);
      return;
    }
    if (!Number.isFinite(actualPercentage) || actualPercentage < 0 || actualPercentage > 100) {
      setCutDateError('El porcentaje completado debe estar entre 0 y 100.');
      return;
    }
    if (!Number.isFinite(actualCost) || actualCost < 0) {
      setCutDateError('El costo real debe ser un número no negativo.');
      return;
    }
    const committedCost = Number(newCutDate.committed_cost) || 0;
    const paidCost = Number(newCutDate.paid_cost) || 0;
    if (committedCost < 0 || paidCost < 0) {
      setCutDateError('El compromiso pendiente y lo pagado deben ser números no negativos.');
      return;
    }
    if (project.cut_dates?.some((cd) => cd.cut_date === newCutDate.cut_date)) {
      setCutDateError(`Ya existe una fecha de corte en ${newCutDate.cut_date}.`);
      return;
    }

    const totalDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
    const daysDifference = Math.min(totalDays, Math.max(0, Math.floor((cutDate_ - start) / (1000 * 60 * 60 * 24))));
    const pvCurve = generateSigmoidCurve(Number(project.bac) || 0, totalDays);
    const pvValue = pvCurve[daysDifference]?.pv ?? 0;
    const evValue = (actualPercentage / 100) * (Number(project.bac) || 0);
    const cutDateData = {
      ...newCutDate,
      actual_percentage: actualPercentage,
      actual_cost: actualCost,
      committed_cost: committedCost,
      paid_cost: paidCost,
      pv_value: pvValue,
      ev_value: evValue,
      cpi: actualCost > 0 ? evValue / actualCost : null,
      spi: pvValue > 0 ? evValue / pvValue : null,
    };

    try {
      const savedCutDate = await addCutDate(projectId, cutDateData);
      if (!savedCutDate) throw new Error('No se pudo guardar la fecha de corte.');
      setCutDateError('');
      setNewCutDate({
        cut_date: localDateString(),
        actual_percentage: 0,
        actual_cost: 0,
        committed_cost: 0,
        paid_cost: 0,
      });
      setShowCutDateForm(false);
      await loadProjectData();
    } catch (error) {
      setCutDateError(`No se pudo guardar la fecha de corte: ${error.message}`);
    }
  };

  const togglePhase = (phaseIndex) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseIndex]: !prev[phaseIndex],
    }));
  };

  const updateActivityProgress = async (phaseIndex, activityIndex, progress) => {
    if (!project?.wbs_phases?.[phaseIndex]?.activities?.[activityIndex]) return;
    const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const newProject = {
      ...project,
      wbs_phases: project.wbs_phases.map((phase, phaseIndexValue) => phaseIndexValue !== phaseIndex
        ? phase
        : {
            ...phase,
            activities: phase.activities.map((activity, activityIndexValue) => activityIndexValue !== activityIndex
              ? activity
              : { ...activity, progress_percentage: normalizedProgress }),
          }),
    };
    try {
      const saved = await saveProject(newProject);
      setProject(saved);
    } catch (error) {
      setCutDateError(`No se pudo actualizar el avance: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader className="animate-spin mx-auto mb-4" size={48} />
        <p>Cargando proyecto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Proyecto no encontrado</p>
      </div>
    );
  }

  const status = metrics ? getProjectStatus(metrics.cpi, metrics.spi) : 'pendiente';
  // Get the selected cut date (or last one if none selected)
  const getSelectedCutDate = () => {
    if (!project.cut_dates || project.cut_dates.length === 0) return null;
    const index = selectedCutDateIndex !== null ? selectedCutDateIndex : project.cut_dates.length - 1;
    return project.cut_dates[index];
  };
  const latestCutDate = getSelectedCutDate();
  const projectStartDate = parseLocalDate(project.start_date);
  const selectedCutDate = latestCutDate ? parseLocalDate(latestCutDate.cut_date) : null;
  const cutDateOffset = projectStartDate && selectedCutDate
    ? Math.floor((selectedCutDate - projectStartDate) / (1000 * 60 * 60 * 24))
    : null;

  // Pronóstico de AC por regresión lineal (hoja "Graficos y Prediccion" del Simulador de
  // clase): alternativa a los EAC puntuales, usa la tendencia de TODOS los cortes.
  const projectEndDateForForecast = parseLocalDate(project.end_date);
  const projectTotalDaysForForecast = projectStartDate && projectEndDateForForecast
    ? Math.max(1, Math.floor((projectEndDateForForecast - projectStartDate) / (1000 * 60 * 60 * 24)))
    : null;
  const costRegressionPoints = (project.cut_dates ?? [])
    .map((cd) => {
      const d = parseLocalDate(cd.cut_date);
      if (!projectStartDate || !d) return null;
      return { x: Math.floor((d - projectStartDate) / (1000 * 60 * 60 * 24)), y: Number(cd.actual_cost) || 0 };
    })
    .filter(Boolean);
  const costRegression = costRegressionPoints.length >= 3 ? linearRegression(costRegressionPoints) : null;
  const forecastAC = costRegression && projectTotalDaysForForecast !== null
    ? Math.max(0, costRegression.predict(projectTotalDaysForForecast))
    : null;
  const totalActivities = (project.wbs_phases ?? []).reduce(
    (total, phase) => total + (Array.isArray(phase?.activities) ? phase.activities.length : 0),
    0,
  );
  const handleSaveDiagnostico = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
  };

  const handleSaveBlueprint = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
  };

  const handleSaveRaci = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
  };

  const handleSaveResources = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
    return saved;
  };

  const handleSaveEconomics = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
  };

  const handleSaveChanges = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
  };

  const handleSaveQuality = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
  };

  const handleSaveRisks = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
  };

  const handleSaveControlDashboard = async (updatedProject) => {
    const saved = await saveProject(updatedProject);
    setProject(saved);
    return saved;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-blueprint-600 hover:text-blueprint-900 font-medium"
            >
              <ArrowLeft size={20} />
              Volver
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-2">{project.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(status)}`}>
              {getStatusLabel(status)}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {project.wbs_phases?.length || 0} fases
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {totalActivities} tareas
            </span>
          </div>
        </div>

        {/* Oculto temporalmente para la defensa junto con la pestaña "Seguimiento" (no se borró el código):
        <button
          onClick={() => {
            setActiveSection('tracking');
            setShowCutDateForm(true);
            setTimeout(() => {
              cutDateFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="flex w-full items-center justify-center gap-2 bg-blueprint-600 text-white px-6 py-3 rounded-lg hover:bg-blueprint-700 transition-colors font-medium sm:w-auto"
        >
          <Plus size={20} />
          Agregar Fecha de Corte
        </button>
        */}
      </div>

      <div className="space-y-6">

      {activeSection === 'home' && (
        <div className="space-y-6">
          <ControlDashboardPanel project={project} onSave={handleSaveControlDashboard} />
          <AiAdvisorPanel project={project} metrics={metrics} />
          <ProjectHeaderInfo project={project} />
          <ProjectMetadata project={project} />
          <TeamMembersInfo project={project} />
        </div>
      )}

      {activeSection === 'charter' && (
        <div className="space-y-6">
          <SubTabBar
            tabs={[
              { id: 'diagnostico', label: 'Diagnóstico', icon: ClipboardList },
              { id: 'blueprint', label: 'Blueprint', icon: Layers },
              { id: 'acta', label: 'Acta formal', icon: FileText },
            ]}
            active={charterTab}
            onChange={setCharterTab}
          />
          {charterTab === 'diagnostico' && <DiagnosticoPanel project={project} onSave={handleSaveDiagnostico} />}
          {charterTab === 'blueprint' && <BlueprintPanel project={project} onSave={handleSaveBlueprint} />}
          {charterTab === 'acta' && <ActaPanel project={project} />}
        </div>
      )}

      {activeSection === 'schedule' && (
        <div className="space-y-6">
          <SubTabBar
            tabs={[
              { id: 'wbs', label: 'Estructura (EDT)', icon: Network },
              { id: 'gantt', label: 'Cronograma', icon: CalendarDays },
            ]}
            active={scheduleTab}
            onChange={setScheduleTab}
          />
          {scheduleTab === 'gantt' && (
            <>
              <CronogramaPanel project={project} />
              <DiccionarioEDTPanel project={project} />
            </>
          )}
        </div>
      )}

      {activeSection === 'evm' && (
        <div className="space-y-6">
          {!showCutDateForm && (!project.cut_dates || project.cut_dates.length === 0) && (
            <div className="rounded-lg border border-dashed border-paper-line bg-white p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900">Aún no hay seguimiento registrado</h3>
              <p className="mt-2 text-sm text-gray-600">Agrega una fecha de corte para visualizar el progreso del proyecto.</p>
              <button
                type="button"
                onClick={() => setShowCutDateForm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blueprint-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blueprint-700"
              >
                <Plus size={16} />
                Agregar primera fecha
              </button>
            </div>
          )}
          {/* Cut Dates Form */}
      {showCutDateForm && (
        <div ref={cutDateFormRef} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva Fecha de Corte</h3>
          
          {/* Mostrar rango válido de fechas */}
          <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">🔴 Fecha Inicio:</span> {project.start_date} | 
              <span className="font-semibold ml-3">🔴 Fecha Fin:</span> {project.end_date}
            </p>
            <p className="text-xs text-gray-600 mt-1">La fecha de corte debe estar entre estas dos fechas</p>
          </div>

          <AlertModal type="error" message={cutDateError} onClose={() => setCutDateError('')} />

          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                min={project.start_date}
                max={project.end_date}
                value={newCutDate.cut_date}
                onChange={(e) => {
                  setNewCutDate({ ...newCutDate, cut_date: e.target.value });
                  setCutDateError(''); // Limpiar error al cambiar fecha
                }}
                className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">% Completado</label>
              <input
                type="text"
                inputMode="decimal"
                value={newCutDate.actual_percentage}
                onChange={(e) => setNewCutDate({ ...newCutDate, actual_percentage: filterDecimal(e.target.value) })}
                className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AC devengado (USD) — usado en el EVM</label>
              <input
                type="text"
                inputMode="decimal"
                value={newCutDate.actual_cost}
                onChange={(e) => setNewCutDate({ ...newCutDate, actual_cost: filterDecimal(e.target.value) })}
                className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Compromiso pendiente (USD)</label>
              <input
                type="text"
                inputMode="decimal"
                value={newCutDate.committed_cost}
                onChange={(e) => setNewCutDate({ ...newCutDate, committed_cost: filterDecimal(e.target.value) })}
                placeholder="Órdenes de compra emitidas, aún no pagadas"
                className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pagado (USD)</label>
              <input
                type="text"
                inputMode="decimal"
                value={newCutDate.paid_cost}
                onChange={(e) => setNewCutDate({ ...newCutDate, paid_cost: filterDecimal(e.target.value) })}
                placeholder="Desembolsos reales ya efectuados"
                className="w-full px-4 py-2 bg-white border border-paper-line rounded-lg focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAddCutDate}
              className="flex-1 bg-blueprint-600 text-white px-4 py-2 rounded-lg hover:bg-blueprint-700 transition-colors font-medium"
            >
              Guardar Fecha de Corte
            </button>

            <button
              onClick={() => setShowCutDateForm(false)}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cut Dates List */}
      {project.cut_dates && project.cut_dates.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas de Corte Registradas</h3>
          <p className="text-sm text-gray-600 mb-4">Selecciona una fecha de corte para ver los cálculos, gráfico y análisis</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {project.cut_dates.map((cutDate, index) => (
              <label 
                key={cutDate.id} 
                className={`cursor-pointer rounded-lg p-4 border-2 transition-all ${
                  selectedCutDateIndex === index 
                    ? 'bg-blueprint-50 border-blueprint-500' 
                    : 'bg-blueprint-50 border-blueprint-200 hover:border-blueprint-400'
                }`}
              >
                <input 
                  type="radio" 
                  name="cutDate" 
                  value={index} 
                  checked={selectedCutDateIndex === index}
                  onChange={() => handleCutDateChange(index)}
                  className="mr-2"
                />
                <p className="text-sm text-gray-600 mb-1">Fecha: {cutDate.cut_date}</p>
                <p className="text-lg font-bold text-gray-900 mb-2">{cutDate.actual_percentage}% Completado</p>
                <p className="text-sm text-gray-700">Costo: {formatCurrency(cutDate.actual_cost)}</p>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* EVM Metrics */}
      {metrics && (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Base Values */}
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Valores Base</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">BAC (Presupuesto Autorizado)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.bac)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">PV (Valor Planificado)</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.pv)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">EV (Valor Ganado)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.ev)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">AC (Costo Real / devengado)</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.ac)}</p>
                </div>

                <hr className="my-1 border-gray-100" />

                <div>
                  <p className="text-xs text-gray-500">Compromiso pendiente</p>
                  <p className="text-base font-semibold text-gray-700">{formatCurrency(latestCutDate?.committed_cost ?? 0)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Pagado</p>
                  <p className="text-base font-semibold text-gray-700">{formatCurrency(latestCutDate?.paid_cost ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Column 2: Variations */}
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Variaciones</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">CV (Variación de Costo)</p>
                  <p className={`text-2xl font-bold ${metrics.cv < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(metrics.cv)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">SV (Variación de Cronograma)</p>
                  <p className={`text-2xl font-bold ${metrics.sv < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(metrics.sv)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">CPI (Índice de Desempeño de Costo)</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      metrics.cpi === null
                        ? 'bg-gray-100 text-gray-800'
                        : metrics.cpi >= 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {formatIndex(metrics.cpi)}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600">SPI (Índice de Desempeño de Cronograma)</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      metrics.spi === null
                        ? 'bg-gray-100 text-gray-800'
                        : metrics.spi >= 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {formatIndex(metrics.spi)}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Forecasts */}
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pronósticos y Predicciones</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">EAC (Optimista) - Con CPI actual</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(metrics.eac_optimistic)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">EAC (Realista) - Promedio CPI/SPI</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(metrics.eac_realistic)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">EAC (Pesimista) - Con SPI actual</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(metrics.eac_pessimistic)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">EAC (Excepcional) - AC + (BAC − EV)</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(metrics.eac_atypical)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Asume que la variación actual fue puntual y el resto se hará según lo planeado.</p>
                </div>

                <hr className="my-3 border-gray-200" />

                <div>
                  <p className="text-sm text-gray-600">ETC (Por Completar)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.etc)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">VAC (Variación a Completación)</p>
                  <p
                    className={`text-2xl font-bold ${metrics.vac && metrics.vac < 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {formatCurrency(metrics.vac)}
                  </p>
                </div>

                <hr className="my-3 border-gray-200" />

                <div>
                  <p className="text-sm text-gray-600">TCPI (BAC) - Basado en presupuesto original</p>
                  <p className={`text-lg font-bold ${metrics.tcpi_bac && metrics.tcpi_bac >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatIndex(metrics.tcpi_bac)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">TCPI (EAC) - Basado en estimación realista</p>
                  <p className={`text-lg font-bold ${metrics.tcpi_eac && metrics.tcpi_eac >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatIndex(metrics.tcpi_eac)}
                  </p>
                </div>

                <hr className="my-3 border-gray-200" />

                <div>
                  <p className="text-sm text-gray-600">Pronóstico AC (regresión lineal)</p>
                  {costRegression ? (
                    <>
                      <p className="text-xl font-bold text-indigo-600">{formatCurrency(forecastAC)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Proyectado al fin del proyecto · R² = {costRegression.rSquared.toFixed(2)} · {costRegression.pointCount} cortes
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Necesitas al menos 3 fechas de corte para este pronóstico (tienes {project.cut_dates?.length ?? 0}).</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* S-Curve Chart */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Curva S - EVM</h3>
            <div style={{ width: '100%', height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6b7280" 
                    label={{ value: 'Días', position: 'insideBottomRight', offset: -5 }} 
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    label={{ value: 'USD', angle: -90, position: 'insideLeft' }}
                    type="number"
                    domain={[0, 'dataMax + 10%']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) => value !== null ? formatCurrency(value) : 'N/A'}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  
                  {/* PV - Planned Value (blue, always solid) */}
                  <Line 
                    type="monotone" 
                    dataKey="pv" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5} 
                    name="PV - Valor Planificado" 
                    dot={false}
                    isAnimationActive={false}
                  />
                  
                  {/* EV - Earned Value (green, solid until cut date) */}
                  {project?.cut_dates && project.cut_dates.length > 0 && (
                    <Line 
                      type="linear" 
                      dataKey="ev" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      name="EV - Valor Ganado (Real)" 
                      dot={false}
                      connectNulls={true}
                      isAnimationActive={false}
                    />
                  )}
                  
                  {/* EV Projection - (green, dashed after cut date) */}
                  {project?.cut_dates && project.cut_dates.length > 0 && (
                    <Line 
                      type="linear" 
                      dataKey="ev_projection" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      strokeDasharray="5 5"
                      name="EV - Proyectado" 
                      dot={false}
                      connectNulls={true}
                      isAnimationActive={false}
                    />
                  )}
                  
                  {/* AC - Actual Cost (red, solid until cut date) */}
                  {project?.cut_dates && project.cut_dates.length > 0 && (
                    <Line 
                      type="linear" 
                      dataKey="ac" 
                      stroke="#ef4444" 
                      strokeWidth={2.5} 
                      name="AC - Costo Real" 
                      dot={false}
                      connectNulls={true}
                      isAnimationActive={false}
                    />
                  )}
                  
                  {/* AC Projection - (red, dashed after cut date) */}
                  {project?.cut_dates && project.cut_dates.length > 0 && (
                    <Line 
                      type="linear" 
                      dataKey="ac_projection" 
                      stroke="#ef4444" 
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      name="AC - Proyectado" 
                      dot={false}
                      connectNulls={true}
                      isAnimationActive={false}
                    />
                  )}
                  
                  {/* Reference line at cut date */}
                   {cutDateOffset !== null && Number.isFinite(cutDateOffset) && (
                     <ReferenceLine
                        x={cutDateOffset}
                       stroke="#f59e0b"
                       strokeDasharray="3 3"
                       strokeWidth={2}
                       label={{ value: 'Fecha de Corte', position: 'top', fill: '#d97706', fontSize: 12, fontWeight: 'bold' }}
                     />
                   )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {project?.cut_dates && project.cut_dates.length > 0 && (
              <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold">Explicación:</span> Líneas sólidas = datos reales hasta la fecha de corte. 
                Líneas punteadas = proyección si el proyecto continúa al mismo ritmo.
              </p>
            )}
          </div>
        </>
      )}

          <WbsEvmPanel project={project} topDownEv={project?.cut_dates?.length > 0 ? metrics?.ev : null} />
        </div>
      )}

      {activeSection === 'schedule' && scheduleTab === 'wbs' && (
        <div className="space-y-6">
          <WBSValidationPanel project={project} />
          <CriticalPathPanel project={project} />
          <ResourceLevelingPanel project={project} />
          {/* WBS */}
      {project.wbs_phases && project.wbs_phases.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Estructura de Desglose de Trabajo (WBS)</h3>
          <p className="mb-4 text-sm text-gray-600">Consulta las tareas, responsables, dependencias y avance de cada fase.</p>
          <div className="space-y-3">
            {project.wbs_phases.map((phase, phaseIndex) => (
              <div key={phase.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => togglePhase(phaseIndex)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-blueprint-100 text-blueprint-700 font-bold px-3 py-1 rounded text-sm">
                      {phase.phase_order}
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">{phase.phase_name}</h4>
                      <p className="text-xs text-gray-600">{phase.percentage}% • {phase.activities?.length || 0} actividades</p>
                    </div>
                  </div>
                  {expandedPhases[phaseIndex] ? (
                    <ChevronUp size={20} className="text-gray-600" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-600" />
                  )}
                </button>

                {expandedPhases[phaseIndex] && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-white overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Actividad</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Entregable</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Duración</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Costo</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Responsable</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Predecesoras</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700">% Avance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phase.activities.map((activity, actIndex) => (
                          <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900 font-medium">{activity.activity_name}</td>
                            <td className="px-3 py-2 text-gray-700 text-xs">{activity.deliverable}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{activity.duration_days}d</td>
                            <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(activity.cost)}</td>
                            <td className="px-3 py-2 text-sm">
                              <span className="bg-blueprint-100 text-blueprint-800 px-2 py-1 rounded">
                                {activity.responsable || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {Array.isArray(activity.predecessors) && activity.predecessors.length > 0 ? (
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                  {activity.predecessors.join(', ')}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Inicio</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={activity.progress_percentage}
                                onChange={(e) => updateActivityProgress(phaseIndex, actIndex, parseFloat(filterDecimal(e.target.value)) || 0)}
                                className="w-16 px-2 py-1 border border-paper-line rounded text-center text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
                              />
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      )}

      {activeSection === 'team' && (
        <div className="space-y-6">
          <SubTabBar
            tabs={[
              { id: 'raci', label: 'Asignación (RACI)', icon: Users2 },
              { id: 'resources', label: 'Costeo (Recursos)', icon: Wallet },
            ]}
            active={teamTab}
            onChange={setTeamTab}
          />
          {teamTab === 'raci' && <RaciPanel project={project} onSave={handleSaveRaci} />}
          {teamTab === 'resources' && <ResourcesPanel project={project} onSave={handleSaveResources} />}
        </div>
      )}

      {activeSection === 'quality' && (
        <QualityPanel project={project} onSave={handleSaveQuality} />
      )}

      {activeSection === 'economics' && (
        <EconomicsPanel project={project} onSave={handleSaveEconomics} />
      )}

      {activeSection === 'risks' && (
        <RisksPanel project={project} onSave={handleSaveRisks} />
      )}

      {activeSection === 'changes' && (
        <ChangeControlPanel project={project} onSave={handleSaveChanges} />
      )}
      </div>
    </div>
  );
}
