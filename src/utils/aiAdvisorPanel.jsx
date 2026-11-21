import React, { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { collectActivities } from './wbsValidationUI';
import { validateProjectSchedule } from './criticalPathService';
import { formatCurrency, formatIndex } from './evmCalculations';
import { requestAiFeasibility } from './storageManager';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Arma, en texto plano, el estado actual del proyecto a partir de lo que YA está
// calculado en pantalla (EVM, riesgos, calidad, economía, cronograma, cambios).
// La IA solo interpreta estos números — no inventa ni recalcula nada por su cuenta.
const buildProjectSummary = (project, metrics) => {
  const lines = [];
  lines.push(`Proyecto: ${project.name}`);
  lines.push(`Periodo: ${project.start_date ?? '—'} a ${project.end_date ?? '—'}`);

  lines.push('');
  lines.push('VALOR GANADO (EVM):');
  lines.push(`BAC=${formatCurrency(metrics?.bac)} PV=${formatCurrency(metrics?.pv)} EV=${formatCurrency(metrics?.ev)} AC=${formatCurrency(metrics?.ac)}`);
  lines.push(`CPI=${formatIndex(metrics?.cpi)} SPI=${formatIndex(metrics?.spi)} CV=${formatCurrency(metrics?.cv)} SV=${formatCurrency(metrics?.sv)}`);
  lines.push(`EAC realista=${formatCurrency(metrics?.eac_realistic)} VAC=${formatCurrency(metrics?.vac)} ETC=${formatCurrency(metrics?.etc)}`);

  const activities = collectActivities(project);
  if (activities.length > 0) {
    const schedule = validateProjectSchedule(project, activities);
    lines.push('');
    lines.push('CRONOGRAMA:');
    if (schedule.isValid) {
      const criticalCount = (schedule.schedule ?? []).filter((t) => t.is_critical).length;
      const minFloat = Math.min(...(schedule.schedule ?? []).map((t) => t.total_float ?? Infinity));
      lines.push(`Duración calculada: ${schedule.projectDuration} días. ${criticalCount} de ${activities.length} tareas en ruta crítica (holgura cero). Holgura mínima restante: ${Number.isFinite(minFloat) ? minFloat.toFixed(1) : 'N/A'} días.`);
    } else {
      lines.push(`No se pudo validar el cronograma: ${(schedule.errors ?? []).slice(0, 2).join(' ')}`);
    }
  }

  const risks = Array.isArray(project.risks) ? project.risks : [];
  if (risks.length > 0) {
    const topRisks = [...risks]
      .map((r) => ({ ...r, emv: toNumber(r.probability) * toNumber(r.impact_cost ?? r.impact) }))
      .sort((a, b) => b.emv - a.emv)
      .slice(0, 3);
    lines.push('');
    lines.push('RIESGOS (top 3 por exposición):');
    topRisks.forEach((r) => lines.push(`- ${r.name ?? r.description ?? 'Riesgo'} (prob=${r.probability ?? '?'}, impacto=${formatCurrency(r.impact_cost ?? r.impact)}, estado=${r.status ?? 'abierto'})`));
  }

  const quality = project.quality;
  if (quality && (quality.defects?.length > 0 || quality.audits?.length > 0)) {
    const defects = Array.isArray(quality.defects) ? quality.defects : [];
    const pre = defects.filter((d) => d.phase === 'pre-release' || d.pre_release).length;
    lines.push('');
    lines.push('CALIDAD:');
    lines.push(`${defects.length} defectos registrados. ${quality.audits?.length ?? 0} auditorías QA/QC realizadas.`);
  }

  const economics = project.economics;
  const hasEconomics = economics?.years?.some((y) => toNumber(y.cost_sin_ia) > 0 || toNumber(y.cost_con_ia) > 0);
  if (hasEconomics) {
    lines.push('');
    lines.push('EVALUACIÓN ECONÓMICA:');
    lines.push(`Inversión inicial: ${formatCurrency(economics.initial_investment)}. Horizonte: ${economics.years.length} periodo(s).`);
  }

  const changes = Array.isArray(project.change_requests) ? project.change_requests : [];
  const pending = changes.filter((c) => c.status === 'Propuesto').length;
  if (changes.length > 0) {
    lines.push('');
    lines.push('CONTROL DE CAMBIOS:');
    lines.push(`${changes.length} solicitudes registradas, ${pending} propuestas sin decidir.`);
  }

  return lines.join('\n');
};

export function AiAdvisorPanel({ project, metrics }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const summary = buildProjectSummary(project, metrics);
      const text = await requestAiFeasibility(summary);
      setResult(text);
    } catch (err) {
      setError(err.message || 'No se pudo completar el análisis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={20} className="text-blueprint-600" /> Asistente de IA — Viabilidad del proyecto</h3>
          <p className="mt-1 text-sm text-gray-600">Analiza el estado actual (EVM, riesgos, calidad, cronograma) y sugiere qué hacer para que el proyecto sea factible.</p>
        </div>
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-blueprint-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Analizando...' : 'Analizar con IA'}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-blueprint-100 bg-blueprint-50/60 p-4 text-sm text-gray-800 whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
