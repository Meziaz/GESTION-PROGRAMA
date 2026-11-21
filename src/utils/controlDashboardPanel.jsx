import React, { useState, useEffect } from 'react';
import { Gauge, Save, DollarSign, ShieldCheck, AlertOctagon } from 'lucide-react';
import { calculateProjectMetrics, formatCurrency, formatIndex } from './evmCalculations';
import { getSemaphoreStatus, getQualityBand, QUALITY_BAND_LEGEND } from './semaphoreEngine';
import { filterDecimal } from './inputFilters';
import { AlertModal } from './AlertModal';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const inputClass = 'w-full px-2 py-1.5 bg-white border border-paper-line rounded text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';
const PROB_BY_LEVEL = { 1: 0.1, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9 };

// Ficha de valor: el número ES el dato, sin medidor. El color sale directo de `status`
// (hex), así que sirve igual para un semáforo de 3 estados o una escala de 5-6 bandas.
const IndicatorCard = ({ label, display, status, reason, hero = false }) => (
  <div className={`rounded-lg border bg-white ${hero ? 'border-2 p-6' : 'border-paper-line p-4'}`} style={hero ? { borderColor: status.color } : undefined}>
    <div className="flex items-start justify-between gap-2">
      <p className={`font-semibold text-gray-900 ${hero ? 'text-base' : 'text-sm'}`}>{label}</p>
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${hero ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'}`}
        style={{ color: status.color, backgroundColor: `${status.color}1f` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
        {status.label}
      </span>
    </div>
    <p className={`font-mono font-bold ${hero ? 'mt-3 text-6xl' : 'mt-2 text-3xl'}`} style={{ color: status.color }}>{display}</p>
    <p className={`mt-2 text-gray-600 ${hero ? 'text-sm' : 'text-xs'}`}>{reason}</p>
  </div>
);

export function ControlDashboardPanel({ project, onSave }) {
  const [qa, setQa] = useState({
    dre_pre: project.quality?.dre_pre ?? 0,
    dre_post: project.quality?.dre_post ?? 0,
    dre_target: project.quality?.dre_target ?? 90,
    mtbf_hours: project.quality?.mtbf_hours ?? 0,
    mtbf_failures: project.quality?.mtbf_failures ?? 0,
    mtbf_target: project.quality?.mtbf_target ?? 100,
    code_coverage: project.quality?.code_coverage ?? 0,
    code_coverage_target: project.quality?.code_coverage_target ?? 80,
  });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setQa({
      dre_pre: project.quality?.dre_pre ?? 0,
      dre_post: project.quality?.dre_post ?? 0,
      dre_target: project.quality?.dre_target ?? 90,
      mtbf_hours: project.quality?.mtbf_hours ?? 0,
      mtbf_failures: project.quality?.mtbf_failures ?? 0,
      mtbf_target: project.quality?.mtbf_target ?? 100,
      code_coverage: project.quality?.code_coverage ?? 0,
      code_coverage_target: project.quality?.code_coverage_target ?? 80,
    });
  }, [project.id]);

  const handleSaveQa = async () => {
    setSaving(true);
    try {
      await onSave({ ...project, quality: { ...(project.quality ?? {}), ...qa } });
      setAlert({ type: 'success', message: 'Indicadores de QA/QC guardados correctamente.' });
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  // --- EVM ---
  const cutDates = project.cut_dates ?? [];
  const latestCutDate = cutDates.length > 0 ? cutDates[cutDates.length - 1] : null;
  const metrics = calculateProjectMetrics(project.bac, latestCutDate);
  const hasEvmData = latestCutDate !== null;

  // --- Calidad ---
  const dreTotal = toNumber(qa.dre_pre) + toNumber(qa.dre_post);
  const dre = dreTotal > 0 ? (toNumber(qa.dre_pre) / dreTotal) * 100 : null;
  const mtbf = toNumber(qa.mtbf_failures) > 0 ? toNumber(qa.mtbf_hours) / toNumber(qa.mtbf_failures) : null;
  const coverage = toNumber(qa.code_coverage);
  const audits = project.quality?.audits ?? [];
  const approvedAudits = audits.filter((a) => a.result === 'Aprobado').length;
  const compliancePct = audits.length > 0 ? (approvedAudits / audits.length) * 100 : null;
  const complianceTarget = project.quality?.target_compliance ?? 90;

  // --- Riesgos ---
  const risks = project.risks ?? [];
  const emv = (risk) => {
    const probability = PROB_BY_LEVEL[risk.probability_level] ?? 0.5;
    const value = probability * toNumber(risk.monetary_impact);
    return risk.type === 'Oportunidad' ? -value : value;
  };
  const netExposure = risks.reduce((sum, r) => sum + emv(r), 0);
  const contingencyReserve = (toNumber(project.bac) * toNumber(project.contingency_percentage ?? 15)) / 100;
  const contingencyAvailable = contingencyReserve - netExposure;

  // --- Semáforos ---
  const cpiStatus = getSemaphoreStatus(metrics.cpi, 'ratio', { low: 0.95, high: 1.05 });
  const spiStatus = getSemaphoreStatus(metrics.spi, 'ratio', { low: 0.95, high: 1.05 });
  const exposureStatus = getSemaphoreStatus(-netExposure, 'signed', { tolerance: contingencyReserve * 0.1 });
  const availStatus = getSemaphoreStatus(contingencyAvailable, 'signed', { tolerance: contingencyReserve * 0.1 });
  const complianceStatus = getQualityBand(compliancePct, complianceTarget);
  const dreStatus = getQualityBand(dre, toNumber(qa.dre_target));
  const mtbfStatus = getQualityBand(mtbf, toNumber(qa.mtbf_target));
  const coverageStatus = getQualityBand(coverage, toNumber(qa.code_coverage_target));

  const reasonFor = (label, status, extra) => {
    const templates = {
      verde: `${label} está dentro del rango esperado.${extra?.verde ? ` ${extra.verde}` : ''}`,
      naranja: `${label} muestra una desviación leve; monitorea de cerca.${extra?.naranja ? ` ${extra.naranja}` : ''}`,
      rojo: `${label} está fuera de rango; requiere acción correctiva.${extra?.rojo ? ` ${extra.rojo}` : ''}`,
      pendiente: 'Aún no hay datos suficientes para evaluar este indicador.',
    };
    return templates[status.status];
  };

  // Para los indicadores de Calidad con escala de 5 bandas (Óptimo/Muy bueno/Aceptable/Riesgoso/Crítico).
  const reasonForQuality = (label, status, extra) => {
    const templates = {
      optimo: `${label} cumple o supera la meta.${extra?.optimo ? ` ${extra.optimo}` : ''}`,
      muy_bueno: `${label} está muy cerca de la meta; margen de mejora pequeño.`,
      aceptable: `${label} es aceptable, pero tiene margen de mejora real.`,
      riesgoso: `${label} está en zona de riesgo; necesita atención pronto.`,
      critico: `${label} está en estado crítico.${extra?.critico ? ` ${extra.critico}` : ''}`,
      pendiente: 'Aún no hay datos suficientes para evaluar este indicador.',
    };
    return templates[status.status];
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><Gauge size={20} /> Tablero de Control</h3>
        <p className="text-sm text-gray-600">Vista ejecutiva con semáforos (verde / naranja / rojo) para tomar decisiones rápido, sin leer tablas.</p>
      </div>

      {/* EVM */}
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1"><DollarSign size={18} /> Gestión de Valor Ganado (Costos)</h4>
        {!hasEvmData ? (
          <p className="text-sm text-gray-400 italic mt-2">Agrega una fecha de corte en Seguimiento para ver estos indicadores.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IndicatorCard hero label="CPI" display={formatIndex(metrics.cpi)} status={cpiStatus}
                reason={reasonFor('CPI', cpiStatus, { rojo: 'Estás gastando más de lo presupuestado; revisa sobrecostos por recurso.', naranja: 'Vigila el costo real de las tareas en curso.', verde: 'El costo real está alineado o por debajo de lo planeado.' })} />
              <IndicatorCard hero label="SPI" display={formatIndex(metrics.spi)} status={spiStatus}
                reason={reasonFor('SPI', spiStatus, { rojo: 'Vas atrasado respecto al cronograma; revisa la ruta crítica.', naranja: 'El avance real se acerca al límite de lo planeado.', verde: 'El avance real cumple o supera lo planeado.' })} />
            </div>
          </>
        )}
      </div>

      {/* Calidad */}
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1"><ShieldCheck size={18} /> Gestión de Calidad (QA / QC)</h4>
        <p className="text-sm text-gray-600 mb-3">Indicadores manuales — actualízalos cuando tengas datos nuevos de pruebas.</p>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-blueprint-100 bg-blueprint-50/60 p-4 sm:grid-cols-4 mb-4">
          <label className="text-xs font-medium text-blueprint-900">Defectos pre-release
            <input className={`${inputClass} mt-1`} value={qa.dre_pre} onChange={(e) => setQa((s) => ({ ...s, dre_pre: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">Defectos post-release
            <input className={`${inputClass} mt-1`} value={qa.dre_post} onChange={(e) => setQa((s) => ({ ...s, dre_post: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">Meta DRE (%)
            <input className={`${inputClass} mt-1`} value={qa.dre_target} onChange={(e) => setQa((s) => ({ ...s, dre_target: filterDecimal(e.target.value) }))} />
          </label>
          <div />
          <label className="text-xs font-medium text-blueprint-900">Horas de operación
            <input className={`${inputClass} mt-1`} value={qa.mtbf_hours} onChange={(e) => setQa((s) => ({ ...s, mtbf_hours: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">Número de fallas
            <input className={`${inputClass} mt-1`} value={qa.mtbf_failures} onChange={(e) => setQa((s) => ({ ...s, mtbf_failures: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">Meta MTBF (horas)
            <input className={`${inputClass} mt-1`} value={qa.mtbf_target} onChange={(e) => setQa((s) => ({ ...s, mtbf_target: filterDecimal(e.target.value) }))} />
          </label>
          <div />
          <label className="text-xs font-medium text-blueprint-900">Cobertura de código (%)
            <input className={`${inputClass} mt-1`} value={qa.code_coverage} onChange={(e) => setQa((s) => ({ ...s, code_coverage: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">Meta cobertura (%)
            <input className={`${inputClass} mt-1`} value={qa.code_coverage_target} onChange={(e) => setQa((s) => ({ ...s, code_coverage_target: filterDecimal(e.target.value) }))} />
          </label>
        </div>
        <button type="button" onClick={handleSaveQa} disabled={saving} className="mb-4 flex items-center gap-2 rounded-lg bg-blueprint-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar indicadores QA/QC'}
        </button>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Indicador principal — efectividad real de las pruebas</p>
        <div className="mb-4">
          <IndicatorCard hero label="DRE (Defect Removal Efficiency)" display={dre === null ? '—' : `${dre.toFixed(1)}%`} status={dreStatus}
            reason={reasonForQuality('El DRE', dreStatus, { critico: 'Muchos defectos se están escapando a producción; refuerza las pruebas antes del release.', optimo: 'La mayoría de defectos se detectan antes de liberar.' })} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <IndicatorCard label="% Cumplimiento auditorías" display={compliancePct === null ? '—' : `${compliancePct.toFixed(1)}%`} status={complianceStatus}
            reason={reasonForQuality('El cumplimiento', complianceStatus, { critico: 'Hay auditorías no aprobadas; prioriza su cierre.', optimo: 'Las auditorías aprobadas cumplen la meta.' })} />
          <IndicatorCard label="MTBF (horas entre fallas)" display={mtbf === null ? '—' : `${mtbf.toFixed(1)}h`} status={mtbfStatus}
            reason={reasonForQuality('El MTBF', mtbfStatus, { critico: 'El sistema falla con mucha frecuencia; investiga la causa raíz.', optimo: 'El sistema opera de forma estable entre fallas.' })} />
          <IndicatorCard label="Cobertura de código" display={`${coverage.toFixed(1)}%`} status={coverageStatus}
            reason={reasonForQuality('La cobertura', coverageStatus, { critico: 'Gran parte del código no tiene pruebas automatizadas.', optimo: 'El código está bien cubierto por pruebas automatizadas.' })} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
          {QUALITY_BAND_LEGEND.map((band) => (
            <span key={band.label} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: band.color }} /> {band.label}
            </span>
          ))}
        </div>
      </div>

      {/* Riesgos */}
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3"><AlertOctagon size={18} /> Gestión de Riesgos (Matriz de Riesgos)</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IndicatorCard hero label="Exposición neta (EMV)" display={formatCurrency(netExposure)} status={exposureStatus}
            reason={reasonFor('La exposición neta', exposureStatus, { rojo: 'Las amenazas superan a las oportunidades; revisa tus respuestas de mitigación.', verde: 'Las oportunidades compensan o superan a las amenazas.' })} />
          <IndicatorCard hero label="Contingencia disponible" display={formatCurrency(contingencyAvailable)} status={availStatus}
            reason={reasonFor('La contingencia', availStatus, { rojo: 'La reserva no alcanza a cubrir la exposición neta; solicita más reserva o reduce riesgos.', verde: 'La reserva de contingencia cubre la exposición neta actual.' })} />
        </div>
      </div>

      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
    </div>
  );
}
