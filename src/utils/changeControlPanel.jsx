import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, GitPullRequestArrow, CheckCircle2 } from 'lucide-react';
import { filterDecimal, filterFreeText } from './inputFilters';
import { downloadCsv } from './csvExport';
import { formatCurrency } from './evmCalculations';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

const inputClass = 'w-full px-2 py-1.5 bg-white border border-paper-line rounded text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';
const STATUS_OPTIONS = ['Propuesto', 'Aprobado', 'Rechazado'];
const STATUS_STYLE = {
  'Propuesto': 'text-amberline border-amberline',
  'Aprobado': 'text-green-700 border-green-300',
  'Rechazado': 'text-red-700 border-red-300',
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyChange = (index) => ({
  id: `cr-${Date.now()}-${index}`,
  code: `CR-${String(index + 1).padStart(2, '0')}`,
  date: todayStr(),
  change: '',
  deliverable: '',
  hours: 0,
  rate: 0,
  status: 'Propuesto',
  approver: '',
  version: '',
  applied: false,
});

export function ChangeControlPanel({ project, onSave }) {
  const [changes, setChanges] = useState(project.change_requests ?? []);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [changeToDelete, setChangeToDelete] = useState(null);

  useEffect(() => {
    setChanges(project.change_requests ?? []);
  }, [project.id]);

  const updateChange = (id, patch) => setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addChange = () => setChanges((prev) => [...prev, emptyChange(prev.length)]);
  const costOf = (c) => toNumber(c.hours) * toNumber(c.rate);

  const proposedImpact = changes.filter((c) => c.status === 'Propuesto').reduce((sum, c) => sum + costOf(c), 0);
  const approvedImpact = changes.filter((c) => c.status === 'Aprobado').reduce((sum, c) => sum + costOf(c), 0);
  const pendingApprovedImpact = changes.filter((c) => c.status === 'Aprobado' && !c.applied).reduce((sum, c) => sum + costOf(c), 0);
  const bacActual = toNumber(project.bac);
  const newBac = Math.round((bacActual + pendingApprovedImpact) * 100) / 100;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...project, change_requests: changes });
      setAlert({ type: 'success', message: 'Control de cambios guardado correctamente.' });
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const applyApprovedToBac = async () => {
    if (pendingApprovedImpact === 0) return;
    setSaving(true);
    try {
      const updatedChanges = changes.map((c) => (c.status === 'Aprobado' && !c.applied ? { ...c, applied: true } : c));
      const saved = await onSave({ ...project, change_requests: updatedChanges, bac: newBac });
      setChanges(updatedChanges);
      setAlert({ type: 'success', message: `BAC actualizado a ${formatCurrency(newBac)} con los cambios aprobados.` });
      return saved;
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo aplicar al BAC: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><GitPullRequestArrow size={20} /> Control de cambios</h3>
        <p className="text-sm text-gray-600 mb-4">
          Bitácora de solicitudes de cambio. Un cambio no afecta el presupuesto (BAC) hasta que queda en estado
          "Aprobado" y se aplica explícitamente — así la línea base solo se mueve de forma controlada y auditable.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">BAC vigente</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(bacActual)}</p>
            <p className="mt-1 text-xs text-gray-400">Línea base actual del proyecto</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Propuestos (sin decidir)</p>
            <p className="mt-1 text-2xl font-bold text-amberline">{formatCurrency(proposedImpact)}</p>
            <p className="mt-1 text-xs text-gray-400">{changes.filter((c) => c.status === 'Propuesto').length} solicitud(es)</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Aprobados (impacto total)</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(approvedImpact)}</p>
            <p className="mt-1 text-xs text-gray-400">{pendingApprovedImpact === 0 ? 'Ya reflejado en el BAC' : `${formatCurrency(pendingApprovedImpact)} pendiente de aplicar`}</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Nuevo BAC si se aplica</p>
            <p className={`mt-1 text-2xl font-bold ${pendingApprovedImpact !== 0 ? 'text-blueprint-700' : 'text-gray-300'}`}>{formatCurrency(newBac)}</p>
            <p className="mt-1 text-xs text-gray-400">BAC vigente + aprobados pendientes</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={applyApprovedToBac}
            disabled={saving || pendingApprovedImpact === 0}
            className="flex items-center gap-2 rounded-lg border border-blueprint-600 px-4 py-2 text-sm font-medium text-blueprint-700 transition-colors hover:bg-blueprint-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={16} />
            Aplicar cambios aprobados al BAC ({formatCurrency(pendingApprovedImpact)})
          </button>
          {pendingApprovedImpact === 0 && approvedImpact !== 0 && (
            <span className="text-xs text-gray-500">No hay impacto aprobado pendiente por aplicar.</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-gray-900">Solicitudes de cambio</h4>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => downloadCsv('control_cambios.csv', ['Código', 'Fecha', 'Cambio', 'Entregable', 'Horas', 'Tarifa', 'Costo', 'Estado', 'Aprobador', 'Versión'], changes.map((c) => [c.code, c.date, c.change, c.deliverable, c.hours, c.rate, costOf(c), c.status, c.approver, c.version]))}
              className="flex items-center gap-1.5 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium"
            >
              <Download size={16} /> Descargar
            </button>
            <button type="button" onClick={addChange} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
              <Plus size={16} /> Agregar cambio
            </button>
          </div>
        </div>

        {changes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin solicitudes de cambio registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1080px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-2 pr-2 w-24">Código</th>
                  <th className="py-2 pr-2 w-32">Fecha</th>
                  <th className="py-2 pr-2">Cambio</th>
                  <th className="py-2 pr-2">Entregable</th>
                  <th className="py-2 pr-2 w-20 text-right">Horas</th>
                  <th className="py-2 pr-2 w-24 text-right">Tarifa</th>
                  <th className="py-2 pr-2 w-28 text-right">Costo</th>
                  <th className="py-2 pr-2 w-36">Estado</th>
                  <th className="py-2 pr-2 w-32">Aprobador</th>
                  <th className="py-2 pr-2 w-24">Versión</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2"><input className={inputClass} value={c.code} maxLength={20} onChange={(e) => updateChange(c.id, { code: e.target.value })} /></td>
                    <td className="py-1.5 pr-2"><input type="date" className={inputClass} value={c.date} onChange={(e) => updateChange(c.id, { date: e.target.value })} /></td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={c.change} maxLength={160} onChange={(e) => updateChange(c.id, { change: filterFreeText(e.target.value) })} placeholder="Ej: Agregar validación SUNAT adicional" /></td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={c.deliverable} maxLength={120} onChange={(e) => updateChange(c.id, { deliverable: filterFreeText(e.target.value) })} placeholder="Entregable / paquete EDT afectado" /></td>
                    <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={c.hours} onChange={(e) => updateChange(c.id, { hours: filterDecimal(e.target.value) })} /></td>
                    <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={c.rate} onChange={(e) => updateChange(c.id, { rate: filterDecimal(e.target.value) })} /></td>
                    <td className="py-1.5 pr-2 text-right font-mono text-gray-900">{formatCurrency(costOf(c))}</td>
                    <td className="py-1.5 pr-2">
                      <select className={`${inputClass} font-medium ${STATUS_STYLE[c.status] ?? ''}`} value={c.status} onChange={(e) => updateChange(c.id, { status: e.target.value })}>
                        {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      {c.applied && <p className="mt-1 text-[11px] text-green-600">✓ aplicado al BAC</p>}
                    </td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={c.approver} maxLength={60} onChange={(e) => updateChange(c.id, { approver: filterFreeText(e.target.value) })} /></td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={c.version} maxLength={20} onChange={(e) => updateChange(c.id, { version: e.target.value })} placeholder="v1.1" /></td>
                    <td className="py-1.5 text-center">
                      <button type="button" onClick={() => setChangeToDelete(c.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      {changeToDelete && (
        <ConfirmModal title="Eliminar solicitud de cambio" message="¿Seguro que quieres eliminar esta solicitud de cambio?" confirmLabel="Eliminar" onConfirm={() => { setChanges((prev) => prev.filter((c) => c.id !== changeToDelete)); setChangeToDelete(null); }} onCancel={() => setChangeToDelete(null)} />
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blueprint-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50">
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar control de cambios'}
        </button>
      </div>
    </div>
  );
}
