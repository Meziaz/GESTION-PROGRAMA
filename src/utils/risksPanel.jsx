import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from './evmCalculations';
import { filterDecimal, filterFreeText } from './inputFilters';
import { downloadCsv } from './csvExport';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

const inputClass = 'w-full px-2 py-1.5 bg-white border border-paper-line rounded text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const LEVELS = [1, 2, 3, 4, 5];
// Escala estándar de gestión de proyectos: nivel ordinal (1-5) -> probabilidad real para el cálculo de EMV.
const PROB_BY_LEVEL = { 1: 0.1, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9 };
const TYPE_OPTIONS = ['Amenaza', 'Oportunidad'];
const RESPONSE_OPTIONS = ['Mitigar', 'Evitar', 'Transferir', 'Escalar', 'Compartir', 'Aceptar', 'Explotar', 'Mejorar'];
// RBS (Risk Breakdown Structure) — categorías de primer nivel estándar en gestión de riesgos TI.
const RBS_CATEGORIES = ['Técnico', 'Externo', 'Organizacional', 'Dirección de Proyectos'];
const QUALIFIER_LABELS = { 1: 'Muy baja', 2: 'Baja', 3: 'Media', 4: 'Alta', 5: 'Muy alta' };

// Matriz 5x5 con 6 bandas de severidad (estándar de clase), en vez de 3.
const severityOf = (p, i) => {
  const score = p * i;
  if (score <= 2) return { label: 'Muy bajo', color: 'bg-green-100 text-green-800 border-green-300' };
  if (score <= 4) return { label: 'Bajo', color: 'bg-lime-100 text-lime-800 border-lime-300' };
  if (score <= 9) return { label: 'Moderado', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  if (score <= 14) return { label: 'Alto', color: 'bg-orange-100 text-orange-800 border-orange-300' };
  if (score <= 19) return { label: 'Muy alto', color: 'bg-red-100 text-red-800 border-red-300' };
  return { label: 'Crítico', color: 'bg-red-300 text-red-950 border-red-500' };
};

const emptyRisk = (index) => ({
  id: `rk-${Date.now()}-${index}`,
  description: '',
  rbs_category: 'Técnico',
  category: '',
  type: 'Amenaza',
  probability_level: 3,
  impact_level: 3,
  monetary_impact: 0,
  response: 'Mitigar',
  owner: '',
  followup_date: '',
  action: '',
  urgency_level: 3,
  proximity_level: 3,
  detectability_level: 3,
});

const emptyOption = (index) => ({ id: `opt-${Date.now()}-${index}`, name: '', base_investment: 0, branches: [] });
const emptyBranch = (index) => ({ id: `br-${Date.now()}-${index}`, label: '', probability_pct: 50, impact: 0 });

const emv = (risk) => {
  const probability = PROB_BY_LEVEL[risk.probability_level] ?? 0.5;
  const value = probability * toNumber(risk.monetary_impact);
  return risk.type === 'Oportunidad' ? -value : value;
};

export function RisksPanel({ project, onSave }) {
  const [risks, setRisks] = useState(project.risks ?? []);
  const [options, setOptions] = useState(project.decision_options ?? []);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [riskToDelete, setRiskToDelete] = useState(null);
  const [expandedRisks, setExpandedRisks] = useState({});

  useEffect(() => {
    setRisks(project.risks ?? []);
    setOptions(project.decision_options ?? []);
  }, [project.id]);

  const updateRisk = (id, patch) => setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRisk = () => setRisks((prev) => [...prev, emptyRisk(prev.length)]);
  const toggleExpanded = (id) => setExpandedRisks((prev) => ({ ...prev, [id]: !prev[id] }));

  const addOption = () => setOptions((prev) => [...prev, emptyOption(prev.length)]);
  const updateOption = (id, patch) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const removeOption = (id) => setOptions((prev) => prev.filter((o) => o.id !== id));
  const addBranch = (optionId) => setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, branches: [...o.branches, emptyBranch(o.branches.length)] } : o)));
  const updateBranch = (optionId, branchId, patch) => setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, branches: o.branches.map((b) => (b.id === branchId ? { ...b, ...patch } : b)) } : o)));
  const removeBranch = (optionId, branchId) => setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, branches: o.branches.filter((b) => b.id !== branchId) } : o)));

  const netExposure = risks.reduce((sum, r) => sum + emv(r), 0);
  const contingencyReserve = (toNumber(project.bac) * toNumber(project.contingency_percentage ?? 15)) / 100;
  const contingencyAvailable = contingencyReserve - netExposure;

  const matrix = LEVELS.map((impact) => LEVELS.map((prob) => risks.filter((r) => r.probability_level === prob && r.impact_level === impact)));

  const optionTotals = options.map((option) => {
    const branchesEmv = option.branches.reduce((sum, b) => sum + (toNumber(b.probability_pct) / 100) * toNumber(b.impact), 0);
    return { ...option, branchesEmv, total: toNumber(option.base_investment) + branchesEmv };
  });
  const bestOptionId = optionTotals.length > 0 ? optionTotals.reduce((best, o) => (o.total < best.total ? o : best), optionTotals[0]).id : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...project, risks, decision_options: options });
      setAlert({ type: 'success', message: 'Gestión de riesgos guardada correctamente.' });
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const downloadRows = risks.map((r) => [
    r.description, r.rbs_category, r.category, r.type, r.probability_level, r.impact_level,
    severityOf(r.probability_level, r.impact_level).label, r.monetary_impact, emv(r).toFixed(2), r.response,
    r.owner, r.followup_date, r.action, r.urgency_level, r.proximity_level, r.detectability_level,
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><AlertOctagon size={20} /> Gestión de riesgos</h3>
        <p className="text-sm text-gray-600 mb-4">Prioriza amenazas y oportunidades, y compara su impacto esperado contra la reserva de contingencia.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Exposición neta · EMV</p>
            <p className={`mt-1 text-2xl font-bold ${netExposure > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(netExposure)}</p>
            <p className="mt-1 text-xs text-gray-400">{risks.length} riesgo(s) registrado(s)</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Contingencia disponible</p>
            <p className={`mt-1 text-2xl font-bold ${contingencyAvailable >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(contingencyAvailable)}</p>
            <p className="mt-1 text-xs text-gray-400">Reserva {formatCurrency(contingencyReserve)} ({project.contingency_percentage ?? 15}% del BAC) − exposición neta</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-semibold text-gray-900">Registro y matriz P × I</h4>
            <p className="text-xs text-gray-500 mt-0.5">Haz clic en una fila para ver dueño, seguimiento y parámetros adicionales.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => downloadCsv('riesgos.csv', ['Descripción', 'RBS', 'Subcategoría', 'Tipo', 'Probabilidad (1-5)', 'Impacto (1-5)', 'Severidad', 'Impacto monetario', 'EMV', 'Respuesta', 'Dueño', 'Fecha seguimiento', 'Acción', 'Urgencia', 'Proximidad', 'Detectabilidad'], downloadRows)}
              className="flex items-center gap-1.5 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium"
            >
              <Download size={16} /> Descargar
            </button>
            <button type="button" onClick={addRisk} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
              <Plus size={16} /> Agregar riesgo
            </button>
          </div>
        </div>

        {risks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin riesgos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1180px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-2 w-8"></th>
                  <th className="py-2 pr-2">Descripción</th>
                  <th className="py-2 pr-2 w-32">RBS</th>
                  <th className="py-2 pr-2 w-28">Subcategoría</th>
                  <th className="py-2 pr-2 w-24">Tipo</th>
                  <th className="py-2 pr-2 w-16 text-right">P</th>
                  <th className="py-2 pr-2 w-16 text-right">I</th>
                  <th className="py-2 pr-2 w-24">Severidad</th>
                  <th className="py-2 pr-2 w-28 text-right">Impacto $</th>
                  <th className="py-2 pr-2 w-24 text-right">EMV</th>
                  <th className="py-2 pr-2 w-28">Respuesta</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => {
                  const severity = severityOf(r.probability_level, r.impact_level);
                  const isExpanded = Boolean(expandedRisks[r.id]);
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="border-b border-gray-100">
                        <td className="py-1.5 text-center">
                          <button type="button" onClick={() => toggleExpanded(r.id)} className="text-gray-400 hover:text-blueprint-600" aria-label={isExpanded ? 'Contraer' : 'Expandir'}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="py-1.5 pr-2"><input className={inputClass} value={r.description} maxLength={140} onChange={(e) => updateRisk(r.id, { description: e.target.value })} placeholder="Ej: Caída de la API oficial" /></td>
                        <td className="py-1.5 pr-2">
                          <select className={inputClass} value={r.rbs_category ?? 'Técnico'} onChange={(e) => updateRisk(r.id, { rbs_category: e.target.value })}>
                            {RBS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2"><input className={inputClass} value={r.category} maxLength={40} onChange={(e) => updateRisk(r.id, { category: filterFreeText(e.target.value) })} placeholder="Ej: Integración" /></td>
                        <td className="py-1.5 pr-2">
                          <select className={inputClass} value={r.type} onChange={(e) => updateRisk(r.id, { type: e.target.value })}>
                            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <select className={`${inputClass} text-right`} value={r.probability_level} onChange={(e) => updateRisk(r.id, { probability_level: Number(e.target.value) })}>
                            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <select className={`${inputClass} text-right`} value={r.impact_level} onChange={(e) => updateRisk(r.id, { impact_level: Number(e.target.value) })}>
                            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${severity.color}`}>{severity.label}</span></td>
                        <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={r.monetary_impact} onChange={(e) => updateRisk(r.id, { monetary_impact: filterDecimal(e.target.value) })} /></td>
                        <td className="py-1.5 pr-2 text-right font-mono font-semibold text-gray-900">{formatCurrency(emv(r))}</td>
                        <td className="py-1.5 pr-2">
                          <select className={inputClass} value={r.response} onChange={(e) => updateRisk(r.id, { response: e.target.value })}>
                            {RESPONSE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 text-center">
                          <button type="button" onClick={() => setRiskToDelete(r.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <td></td>
                          <td colSpan={11} className="py-3 pr-2">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <label className="text-xs font-medium text-gray-600">Dueño del riesgo
                                <input className={`${inputClass} mt-1`} value={r.owner ?? ''} maxLength={60} onChange={(e) => updateRisk(r.id, { owner: e.target.value })} placeholder="Responsable de monitorearlo" />
                              </label>
                              <label className="text-xs font-medium text-gray-600">Fecha de seguimiento
                                <input type="date" className={`${inputClass} mt-1`} value={r.followup_date ?? ''} onChange={(e) => updateRisk(r.id, { followup_date: e.target.value })} />
                              </label>
                              <label className="text-xs font-medium text-gray-600 sm:col-span-1">Acción específica
                                <input className={`${inputClass} mt-1`} value={r.action ?? ''} maxLength={160} onChange={(e) => updateRisk(r.id, { action: e.target.value })} placeholder="Qué se va a hacer concretamente" />
                              </label>
                              <label className="text-xs font-medium text-gray-600">Urgencia
                                <select className={`${inputClass} mt-1`} value={r.urgency_level ?? 3} onChange={(e) => updateRisk(r.id, { urgency_level: Number(e.target.value) })}>
                                  {LEVELS.map((l) => <option key={l} value={l}>{l} · {QUALIFIER_LABELS[l]}</option>)}
                                </select>
                              </label>
                              <label className="text-xs font-medium text-gray-600">Proximidad
                                <select className={`${inputClass} mt-1`} value={r.proximity_level ?? 3} onChange={(e) => updateRisk(r.id, { proximity_level: Number(e.target.value) })}>
                                  {LEVELS.map((l) => <option key={l} value={l}>{l} · {QUALIFIER_LABELS[l]}</option>)}
                                </select>
                              </label>
                              <label className="text-xs font-medium text-gray-600">Detectabilidad
                                <select className={`${inputClass} mt-1`} value={r.detectability_level ?? 3} onChange={(e) => updateRisk(r.id, { detectability_level: Number(e.target.value) })}>
                                  {LEVELS.map((l) => <option key={l} value={l}>{l} · {QUALIFIER_LABELS[l]}</option>)}
                                </select>
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {risks.length > 0 && (
          <div className="mt-6">
            <h5 className="text-sm font-semibold text-gray-900 mb-2">Matriz P × I</h5>
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <tbody>
                  {matrix.map((row, impactIndex) => {
                    const impact = 5 - impactIndex;
                    return (
                      <tr key={impact}>
                        <td className="w-6 pr-1 text-right font-mono text-gray-500">{impact}</td>
                        {LEVELS.map((prob) => {
                          const cellRisks = risks.filter((r) => r.probability_level === prob && r.impact_level === impact);
                          const severity = severityOf(prob, impact);
                          return (
                            <td key={prob} className={`h-12 w-12 border border-white text-center align-middle font-semibold ${severity.color}`} title={cellRisks.map((r) => r.description || 'Sin descripción').join(', ') || undefined}>
                              {cellRisks.length > 0 ? cellRisks.length : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr>
                    <td></td>
                    {LEVELS.map((prob) => <td key={prob} className="pt-1 text-center font-mono text-gray-500">{prob}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">Filas = Impacto (5 arriba, 1 abajo) · Columnas = Probabilidad (1 a 5). El número en cada celda es la cantidad de riesgos ahí.</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
              {[
                { label: 'Muy bajo (1-2)', color: 'bg-green-100 border-green-300' },
                { label: 'Bajo (3-4)', color: 'bg-lime-100 border-lime-300' },
                { label: 'Moderado (5-9)', color: 'bg-yellow-100 border-yellow-300' },
                { label: 'Alto (10-14)', color: 'bg-orange-100 border-orange-300' },
                { label: 'Muy alto (15-19)', color: 'bg-red-100 border-red-300' },
                { label: 'Crítico (20-25)', color: 'bg-red-300 border-red-500' },
              ].map((band) => (
                <span key={band.label} className="flex items-center gap-1.5">
                  <span className={`inline-block h-3 w-3 rounded border ${band.color}`} /> {band.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-semibold text-gray-900">Árbol de decisión</h4>
            <p className="text-xs text-gray-500 mt-0.5">Compara alternativas: inversión base más la suma del EMV de cada rama (probabilidad × impacto).</p>
          </div>
          <button type="button" onClick={addOption} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
            <Plus size={16} /> Agregar opción
          </button>
        </div>

        {optionTotals.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin opciones registradas.</p>
        ) : (
          <div className="space-y-4">
            {optionTotals.map((option) => (
              <div key={option.id} className={`rounded-lg border p-4 ${option.id === bestOptionId ? 'border-green-400 bg-green-50/50' : 'border-paper-line'}`}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <input className={`${inputClass} max-w-[220px] font-semibold`} value={option.name} maxLength={60} onChange={(e) => updateOption(option.id, { name: filterFreeText(e.target.value) })} placeholder="Ej: Cloud" />
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    Inversión base
                    <input className={`${inputClass} w-28 text-right`} value={option.base_investment} onChange={(e) => updateOption(option.id, { base_investment: filterDecimal(e.target.value) })} />
                  </label>
                  {option.id === bestOptionId && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">Recomendada</span>}
                  <button type="button" onClick={() => removeOption(option.id)} className="ml-auto text-gray-400 hover:text-red-600" aria-label="Eliminar opción"><Trash2 size={16} /></button>
                </div>

                <div className="space-y-2">
                  {option.branches.map((branch) => (
                    <div key={branch.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <input className={`${inputClass} flex-1 min-w-[160px]`} value={branch.label} maxLength={80} onChange={(e) => updateBranch(option.id, branch.id, { label: e.target.value })} placeholder="Ej: Experiencia del proveedor" />
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        Prob. %
                        <input className={`${inputClass} w-20 text-right`} value={branch.probability_pct} onChange={(e) => updateBranch(option.id, branch.id, { probability_pct: filterDecimal(e.target.value) })} />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        Impacto $
                        <input className={`${inputClass} w-28 text-right`} value={branch.impact} onChange={(e) => updateBranch(option.id, branch.id, { impact: filterDecimal(e.target.value) })} />
                      </label>
                      <button type="button" onClick={() => removeBranch(option.id, branch.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar rama"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addBranch(option.id)} className="flex items-center gap-1.5 text-xs font-medium text-blueprint-600 hover:text-blueprint-900">
                    <Plus size={14} /> Agregar rama
                  </button>
                </div>

                <div className="mt-3 flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-900">
                  <span>EMV de ramas: {formatCurrency(option.branchesEmv)}</span>
                  <span>Total: {formatCurrency(option.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      {riskToDelete && (
        <ConfirmModal title="Eliminar riesgo" message="¿Seguro que quieres eliminar este riesgo?" confirmLabel="Eliminar" onConfirm={() => { setRisks((prev) => prev.filter((r) => r.id !== riskToDelete)); setRiskToDelete(null); }} onCancel={() => setRiskToDelete(null)} />
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blueprint-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50">
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar gestión de riesgos'}
        </button>
      </div>
    </div>
  );
}
