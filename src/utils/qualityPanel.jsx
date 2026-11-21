import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, ShieldCheck, DollarSign } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { filterDecimal, filterFreeText } from './inputFilters';
import { downloadCsv } from './csvExport';
import { formatCurrency } from './evmCalculations';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

const inputClass = 'w-full px-2 py-1.5 bg-white border border-paper-line rounded text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';
const RESULT_OPTIONS = ['Aprobado', 'Con observaciones', 'No conforme'];
const RESULT_STYLE = {
  'Aprobado': 'text-green-700 border-green-300',
  'Con observaciones': 'text-amberline border-amberline',
  'No conforme': 'text-red-700 border-red-300',
};
const AUDIT_TYPE_OPTIONS = ['QA', 'QC'];
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyAudit = (index) => ({ id: `au-${Date.now()}-${index}`, code: `AU-${String(index + 1).padStart(2, '0')}`, audit_type: 'QA', scope: '', date: todayStr(), result: 'Aprobado', hours: 0, notes: '' });
const emptyDefect = (index) => ({ id: `df-${Date.now()}-${index}`, category: '', date: todayStr(), qty: 1, description: '' });
const emptyCoq = () => ({ prevention: 0, appraisal: 0, internal_failure: 0, external_failure: 0 });

const buildPareto = (defects) => {
  const totals = new Map();
  for (const defect of defects) {
    const key = String(defect.category ?? '').trim() || 'Sin categoría';
    totals.set(key, (totals.get(key) ?? 0) + toNumber(defect.qty));
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotal = sorted.reduce((sum, [, qty]) => sum + qty, 0);
  let cumulative = 0;
  return sorted.map(([category, qty]) => {
    cumulative += qty;
    return { category, qty, cumulativePct: grandTotal > 0 ? Math.round((cumulative / grandTotal) * 1000) / 10 : 0 };
  });
};

export function QualityPanel({ project, onSave }) {
  const [audits, setAudits] = useState(project.quality?.audits ?? []);
  const [defects, setDefects] = useState(project.quality?.defects ?? []);
  const [targetCompliance, setTargetCompliance] = useState(project.quality?.target_compliance ?? 90);
  const [coq, setCoq] = useState({ ...emptyCoq(), ...(project.quality?.coq ?? {}) });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [auditToDelete, setAuditToDelete] = useState(null);
  const [defectToDelete, setDefectToDelete] = useState(null);

  useEffect(() => {
    setAudits(project.quality?.audits ?? []);
    setDefects(project.quality?.defects ?? []);
    setTargetCompliance(project.quality?.target_compliance ?? 90);
    setCoq({ ...emptyCoq(), ...(project.quality?.coq ?? {}) });
  }, [project.id]);

  const updateAudit = (id, patch) => setAudits((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const addAudit = () => setAudits((prev) => [...prev, emptyAudit(prev.length)]);
  const updateDefect = (id, patch) => setDefects((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const addDefect = () => setDefects((prev) => [...prev, emptyDefect(prev.length)]);

  const totalAudits = audits.length;
  const approvedAudits = audits.filter((a) => a.result === 'Aprobado').length;
  const compliancePct = totalAudits > 0 ? Math.round((approvedAudits / totalAudits) * 1000) / 10 : null;
  const controlHours = audits.reduce((sum, a) => sum + toNumber(a.hours), 0);
  const pendingAudits = Math.max(0, totalAudits - approvedAudits);
  const paretoData = buildPareto(defects);

  const coqConformance = toNumber(coq.prevention) + toNumber(coq.appraisal);
  const coqNonConformance = toNumber(coq.internal_failure) + toNumber(coq.external_failure);
  const coqTotal = coqConformance + coqNonConformance;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...project, quality: { audits, defects, target_compliance: toNumber(targetCompliance), coq } });
      setAlert({ type: 'success', message: 'Gestión de calidad guardada correctamente.' });
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><ShieldCheck size={20} /> Gestión de calidad</h3>
        <p className="text-sm text-gray-600 mb-4">Audita el proceso, registra defectos y prioriza con un diagrama de Pareto.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">% Cumplimiento</p>
            <p className={`mt-1 text-2xl font-bold ${compliancePct === null ? 'text-gray-300' : compliancePct >= toNumber(targetCompliance) ? 'text-green-600' : 'text-red-600'}`}>
              {compliancePct === null ? '—' : `${compliancePct}%`}
            </p>
            <p className="mt-1 text-xs text-gray-400">Meta: {targetCompliance}% · {approvedAudits}/{totalAudits} aprobadas</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Horas de control</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{controlHours}h</p>
            <p className="mt-1 text-xs text-gray-400">Acumuladas en auditorías</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Auditorías pendientes</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{pendingAudits}/{totalAudits}</p>
            <p className="mt-1 text-xs text-gray-400">No aprobadas o con observaciones</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
          <label className="font-medium">Meta de cumplimiento (%)</label>
          <input className={`${inputClass} w-20`} value={targetCompliance} onChange={(e) => setTargetCompliance(filterDecimal(e.target.value))} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1"><DollarSign size={18} /> Costo de Calidad (CoQ)</h4>
        <p className="text-sm text-gray-600 mb-4">Regla 1-10-100: un defecto detectado en diseño cuesta ≈$1; el mismo defecto detectado en pruebas cuesta ≈$10-100; detectado ya en producción cuesta ≈$100-1,000+. Invertir en prevención y evaluación sale más barato que pagar fallas.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <label className="text-xs font-medium text-gray-600">Prevención
            <input className={`${inputClass} mt-1`} value={coq.prevention} onChange={(e) => setCoq((s) => ({ ...s, prevention: filterDecimal(e.target.value) }))} placeholder="Capacitación, estándares..." />
          </label>
          <label className="text-xs font-medium text-gray-600">Evaluación
            <input className={`${inputClass} mt-1`} value={coq.appraisal} onChange={(e) => setCoq((s) => ({ ...s, appraisal: filterDecimal(e.target.value) }))} placeholder="Auditorías, pruebas..." />
          </label>
          <label className="text-xs font-medium text-gray-600">Fallas internas
            <input className={`${inputClass} mt-1`} value={coq.internal_failure} onChange={(e) => setCoq((s) => ({ ...s, internal_failure: filterDecimal(e.target.value) }))} placeholder="Retrabajo antes del release..." />
          </label>
          <label className="text-xs font-medium text-gray-600">Fallas externas
            <input className={`${inputClass} mt-1`} value={coq.external_failure} onChange={(e) => setCoq((s) => ({ ...s, external_failure: filterDecimal(e.target.value) }))} placeholder="Soporte, garantías..." />
          </label>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Costo de conformidad (Prevención + Evaluación)</span><span className="font-mono text-gray-900">{formatCurrency(coqConformance)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Costo de no conformidad (Fallas internas + externas)</span><span className="font-mono text-gray-900">{formatCurrency(coqNonConformance)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold"><span>Costo total de calidad (CoQ)</span><span className="font-mono">{formatCurrency(coqTotal)}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-gray-900">Auditorías de proceso</h4>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => downloadCsv('auditorias.csv', ['Código', 'Tipo', 'Alcance', 'Fecha', 'Resultado', 'Horas', 'Notas'], audits.map((a) => [a.code, a.audit_type, a.scope, a.date, a.result, a.hours, a.notes]))} className="flex items-center gap-1.5 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium">
              <Download size={16} /> Descargar
            </button>
            <button type="button" onClick={addAudit} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
              <Plus size={16} /> Agregar auditoría
            </button>
          </div>
        </div>
        {audits.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin auditorías registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-2 pr-2 w-24">Código</th>
                  <th className="py-2 pr-2 w-20">Tipo</th>
                  <th className="py-2 pr-2">Alcance</th>
                  <th className="py-2 pr-2 w-32">Fecha</th>
                  <th className="py-2 pr-2 w-40">Resultado</th>
                  <th className="py-2 pr-2 w-20 text-right">Horas</th>
                  <th className="py-2 pr-2">Notas</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2"><input className={inputClass} value={a.code} maxLength={20} onChange={(e) => updateAudit(a.id, { code: e.target.value })} /></td>
                    <td className="py-1.5 pr-2" title={a.audit_type === 'QC' ? 'Quality Control — enfocado en el producto' : 'Quality Assurance — enfocado en el proceso'}>
                      <select className={inputClass} value={a.audit_type ?? 'QA'} onChange={(e) => updateAudit(a.id, { audit_type: e.target.value })}>
                        {AUDIT_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={a.scope} maxLength={120} onChange={(e) => updateAudit(a.id, { scope: e.target.value })} placeholder="Ej: Verificación de controles de costo" /></td>
                    <td className="py-1.5 pr-2"><input type="date" className={inputClass} value={a.date} onChange={(e) => updateAudit(a.id, { date: e.target.value })} /></td>
                    <td className="py-1.5 pr-2">
                      <select className={`${inputClass} font-medium ${RESULT_STYLE[a.result] ?? ''}`} value={a.result} onChange={(e) => updateAudit(a.id, { result: e.target.value })}>
                        {RESULT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={a.hours} onChange={(e) => updateAudit(a.id, { hours: filterDecimal(e.target.value) })} /></td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={a.notes} maxLength={160} onChange={(e) => updateAudit(a.id, { notes: e.target.value })} /></td>
                    <td className="py-1.5 text-center">
                      <button type="button" onClick={() => setAuditToDelete(a.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-gray-900">Registro de defectos</h4>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => downloadCsv('defectos.csv', ['Categoría', 'Fecha', 'Cantidad', 'Descripción'], defects.map((d) => [d.category, d.date, d.qty, d.description]))} className="flex items-center gap-1.5 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium">
              <Download size={16} /> Descargar
            </button>
            <button type="button" onClick={addDefect} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
              <Plus size={16} /> Agregar defecto
            </button>
          </div>
        </div>
        {defects.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin defectos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-2 pr-2">Categoría</th>
                  <th className="py-2 pr-2 w-32">Fecha</th>
                  <th className="py-2 pr-2 w-20 text-right">Cantidad</th>
                  <th className="py-2 pr-2">Descripción</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {defects.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2"><input className={inputClass} value={d.category} maxLength={60} onChange={(e) => updateDefect(d.id, { category: filterFreeText(e.target.value) })} placeholder="Ej: Errores de validación" /></td>
                    <td className="py-1.5 pr-2"><input type="date" className={inputClass} value={d.date} onChange={(e) => updateDefect(d.id, { date: e.target.value })} /></td>
                    <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={d.qty} onChange={(e) => updateDefect(d.id, { qty: filterDecimal(e.target.value) })} /></td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={d.description} maxLength={160} onChange={(e) => updateDefect(d.id, { description: e.target.value })} /></td>
                    <td className="py-1.5 text-center">
                      <button type="button" onClick={() => setDefectToDelete(d.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paretoData.length > 0 && (
          <div className="mt-6">
            <h5 className="text-sm font-semibold text-gray-900 mb-2">Pareto de defectos</h5>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={paretoData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <ReferenceLine yAxisId="right" y={80} stroke="#d4a843" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 11, fill: '#d4a843' }} />
                <Bar yAxisId="left" dataKey="qty" name="Defectos" fill="#4d84e0" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="% acumulado" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      {auditToDelete && (
        <ConfirmModal title="Eliminar auditoría" message="¿Seguro que quieres eliminar esta auditoría?" confirmLabel="Eliminar" onConfirm={() => { setAudits((prev) => prev.filter((a) => a.id !== auditToDelete)); setAuditToDelete(null); }} onCancel={() => setAuditToDelete(null)} />
      )}
      {defectToDelete && (
        <ConfirmModal title="Eliminar defecto" message="¿Seguro que quieres eliminar este defecto?" confirmLabel="Eliminar" onConfirm={() => { setDefects((prev) => prev.filter((d) => d.id !== defectToDelete)); setDefectToDelete(null); }} onCancel={() => setDefectToDelete(null)} />
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blueprint-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50">
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar gestión de calidad'}
        </button>
      </div>
    </div>
  );
}
