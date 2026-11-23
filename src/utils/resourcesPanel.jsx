import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, AlertTriangle, Wallet } from 'lucide-react';
import { formatCurrency } from './evmCalculations';
import { calculatePertDuration } from './criticalPathService';
import { filterDecimal, filterFreeText } from './inputFilters';
import { downloadCsv } from './csvExport';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

const inputClass = 'w-full px-2 py-1.5 bg-white border border-paper-line rounded text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const emptySettings = () => ({
  hours_month: 160,
  load_factor: 1.3635,
  external_surcharge: 0.15,
  hours_day: 8,
});

const emptyResource = (index) => ({
  id: `res-${Date.now()}-${index}`,
  role: '',
  name: '',
  type: 'interno',
  monthly_salary: 0,
  external_hour_cost: 0,
  assigned_days: 0,
  dedication_pct: 100,
});

const emptyCostItem = (prefix, index) => ({
  id: `${prefix}-${Date.now()}-${index}`,
  concept: '',
  detail: '',
  qty: 1,
  unit_cost: 0,
});

// Reproduce exactamente la hoja COSTOS del Excel de clase:
// interno -> costo hora = salario / horas al mes; hora cargada = costo hora x factor prestacional.
// externo -> costo hora es un dato directo; hora cargada = costo hora x (1 + recargo/IVA).
const computeResource = (resource, settings) => {
  const isExternal = resource.type === 'externo';
  const hourCost = isExternal ? toNumber(resource.external_hour_cost) : toNumber(resource.monthly_salary) / Math.max(1, toNumber(settings.hours_month));
  const loadedHour = isExternal ? hourCost * (1 + toNumber(settings.external_surcharge)) : hourCost * toNumber(settings.load_factor);
  const dayValue = loadedHour * toNumber(settings.hours_day);
  // % de dedicación parcial: si el recurso solo dedica una fracción de su jornada a este
  // proyecto, los días asignados se escalan a "días efectivos" antes de costear.
  const dedicationRatio = toNumber(resource.dedication_pct ?? 100) / 100;
  const effectiveDays = toNumber(resource.assigned_days) * dedicationRatio;
  const total = dayValue * effectiveDays;
  return { hourCost, loadedHour, dayValue, effectiveDays, total };
};

// Suma la duración de las tareas del WBS cuyo "responsable" coincide con el nombre del recurso,
// para comparar lo costeado aquí contra lo que realmente dice el cronograma.
const scheduledDaysForResource = (project, resourceName) => {
  const name = String(resourceName ?? '').trim().toLowerCase();
  if (!name) return null;
  let total = 0;
  let found = false;
  for (const phase of project?.wbs_phases ?? []) {
    for (const activity of phase?.activities ?? []) {
      if (String(activity?.responsable ?? '').trim().toLowerCase() === name) {
        found = true;
        total += toNumber(activity.duration_days);
      }
    }
  }
  return found ? total : null;
};

const CostItemsTable = ({ title, hint, items, onChange, prefix }) => {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.qty) * toNumber(item.unit_cost), 0);

  const updateItem = (id, patch) => onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const addItem = () => onChange([...items, emptyCostItem(prefix, items.length)]);
  const removeItem = (id) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
        </div>
        <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
          <Plus size={16} /> Agregar
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin conceptos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="py-2 pr-2">Concepto</th>
                <th className="py-2 pr-2">Detalle</th>
                <th className="py-2 pr-2 w-20 text-right">Cant</th>
                <th className="py-2 pr-2 w-28 text-right">Costo unit.</th>
                <th className="py-2 pr-2 w-28 text-right">Total</th>
                <th className="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2">
                    <input className={inputClass} value={item.concept} maxLength={80} onChange={(e) => updateItem(item.id, { concept: filterFreeText(e.target.value) })} placeholder="Ej: Cloud Computing" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputClass} value={item.detail} maxLength={120} onChange={(e) => updateItem(item.id, { detail: e.target.value })} placeholder="Ej: AWS/Azure" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={`${inputClass} text-right`} value={item.qty} onChange={(e) => updateItem(item.id, { qty: filterDecimal(e.target.value) })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={`${inputClass} text-right`} value={item.unit_cost} onChange={(e) => updateItem(item.id, { unit_cost: filterDecimal(e.target.value) })} />
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-gray-900">{formatCurrency(toNumber(item.qty) * toNumber(item.unit_cost))}</td>
                  <td className="py-1.5 text-center">
                    <button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 text-right text-sm font-semibold text-gray-900">Subtotal: {formatCurrency(subtotal)}</div>
    </div>
  );
};

export function ResourcesPanel({ project, onSave }) {
  const [settings, setSettings] = useState({ ...emptySettings(), ...(project.resource_settings ?? {}) });
  const [resources, setResources] = useState(project.resources ?? []);
  const [costItems, setCostItems] = useState({
    technology: project.cost_items?.technology ?? [],
    fixed: project.cost_items?.fixed ?? [],
    indirect: project.cost_items?.indirect ?? [],
  });
  const [contingencyPct, setContingencyPct] = useState(project.contingency_percentage ?? 15);
  const [managementReservePct, setManagementReservePct] = useState(project.management_reserve_percentage ?? 5);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [resourceToDelete, setResourceToDelete] = useState(null);

  useEffect(() => {
    setSettings({ ...emptySettings(), ...(project.resource_settings ?? {}) });
    setResources(project.resources ?? []);
    setCostItems({
      technology: project.cost_items?.technology ?? [],
      fixed: project.cost_items?.fixed ?? [],
      indirect: project.cost_items?.indirect ?? [],
    });
    setContingencyPct(project.contingency_percentage ?? 15);
    setManagementReservePct(project.management_reserve_percentage ?? 5);
  }, [project.id]);

  const updateResource = (id, patch) => setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addResource = () => setResources((prev) => [...prev, emptyResource(prev.length)]);
  const confirmRemoveResource = () => {
    setResources((prev) => prev.filter((r) => r.id !== resourceToDelete));
    setResourceToDelete(null);
  };

  const computedResources = resources.map((r) => ({ ...r, ...computeResource(r, settings), scheduledDays: scheduledDaysForResource(project, r.name) }));
  const subtotalMO = computedResources.reduce((sum, r) => sum + r.total, 0);
  const subtotalTech = costItems.technology.reduce((sum, i) => sum + toNumber(i.qty) * toNumber(i.unit_cost), 0);
  const subtotalFixed = costItems.fixed.reduce((sum, i) => sum + toNumber(i.qty) * toNumber(i.unit_cost), 0);
  const subtotalIndirect = costItems.indirect.reduce((sum, i) => sum + toNumber(i.qty) * toNumber(i.unit_cost), 0);
  const totalCostos = subtotalMO + subtotalTech + subtotalFixed + subtotalIndirect;
  const contingencyAmount = totalCostos * (toNumber(contingencyPct) / 100);
  const totalEstimated = totalCostos + contingencyAmount; // línea base / BAC (incluye contingencia)
  const managementReserveAmount = totalEstimated * (toNumber(managementReservePct) / 100);
  const totalAuthorization = totalEstimated + managementReserveAmount; // fuera de la línea base

  // Guardar recursos SIEMPRE reparte su costo a las tareas del EDT cuyo
  // "responsable" coincida con el nombre del recurso (tarifa cargada por día ×
  // duración PERT de la tarea). Así "Costeo (Recursos)" y el EVM bottom-up de
  // "EDT y Cronograma" quedan conectados automáticamente con una sola acción:
  // no existe un botón aparte de "sincronizar".
  const handleSave = async () => {
    setSaving(true);
    try {
      const rateByName = new Map(
        computedResources
          .filter((r) => String(r.name ?? '').trim())
          .map((r) => [String(r.name).trim().toLowerCase(), r.dayValue]),
      );
      let updatedCount = 0;
      const nextPhases = (project.wbs_phases ?? []).map((phase) => ({
        ...phase,
        activities: (phase.activities ?? []).map((activity) => {
          const key = String(activity.responsable ?? '').trim().toLowerCase();
          const rate = rateByName.get(key);
          if (!key || rate === undefined) return activity;
          const duration = calculatePertDuration(activity);
          updatedCount += 1;
          return { ...activity, cost: Math.round(rate * duration * 100) / 100 };
        }),
      }));
      const saved = await onSave({
        ...project,
        resource_settings: settings,
        resources,
        cost_items: costItems,
        contingency_percentage: toNumber(contingencyPct),
        management_reserve_percentage: toNumber(managementReservePct),
        wbs_phases: nextPhases,
      });
      setAlert({
        type: 'success',
        message: updatedCount > 0
          ? `Recursos y costos guardados. Costo recalculado automáticamente en ${updatedCount} tarea(s) del EDT (tarifa/día × duración de cada tarea).`
          : 'Recursos y costos guardados correctamente.',
      });
      return saved;
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const useAsBac = async () => {
    setSaving(true);
    try {
      await onSave({
        ...project,
        resource_settings: settings,
        resources,
        cost_items: costItems,
        contingency_percentage: toNumber(contingencyPct),
        management_reserve_percentage: toNumber(managementReservePct),
        bac: Math.round(totalEstimated * 100) / 100,
      });
      setAlert({ type: 'success', message: `BAC actualizado a ${formatCurrency(totalEstimated)}.` });
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo actualizar el BAC: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const downloadRows = computedResources.map((r) => [
    r.role, r.name, r.type, r.monthly_salary, r.external_hour_cost, r.hourCost.toFixed(4), r.loadedHour.toFixed(4), r.dayValue.toFixed(2), r.assigned_days, r.dedication_pct ?? 100, r.total.toFixed(2),
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Wallet size={20} /> Recursos y capacidad</h3>
            <p className="text-sm text-gray-600 mt-1">Costea el equipo y calcula el presupuesto (BAC) a partir de la carga asignada, igual que la hoja de costos de clase.</p>
          </div>
          <button type="button" onClick={() => downloadCsv('recursos.csv', ['Rol', 'Nombre', 'Tipo', 'Salario nominal', 'Costo hora externo', 'Costo hora', 'Hora cargada', 'Valor día', 'Días', 'Dedicación %', 'Total'], downloadRows)} className="flex items-center gap-2 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium">
            <Download size={16} /> Descargar recursos
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-blueprint-100 bg-blueprint-50/60 p-4 sm:grid-cols-4">
          <label className="text-xs font-medium text-blueprint-900">
            Horas laborales/mes
            <input className={`${inputClass} mt-1`} value={settings.hours_month} onChange={(e) => setSettings((s) => ({ ...s, hours_month: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">
            Factor de carga prestacional
            <input className={`${inputClass} mt-1`} value={settings.load_factor} onChange={(e) => setSettings((s) => ({ ...s, load_factor: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">
            Recargo externo (IVA)
            <input className={`${inputClass} mt-1`} value={settings.external_surcharge} onChange={(e) => setSettings((s) => ({ ...s, external_surcharge: filterDecimal(e.target.value) }))} />
          </label>
          <label className="text-xs font-medium text-blueprint-900">
            Horas por día a costear
            <input className={`${inputClass} mt-1`} value={settings.hours_day} onChange={(e) => setSettings((s) => ({ ...s, hours_day: filterDecimal(e.target.value) }))} />
          </label>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Mano de obra</h4>
          <button type="button" onClick={addResource} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
            <Plus size={16} /> Agregar recurso
          </button>
        </div>

        {computedResources.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin recursos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1120px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-2 pr-2">Rol</th>
                  <th className="py-2 pr-2">Nombre</th>
                  <th className="py-2 pr-2 w-24">Tipo</th>
                  <th className="py-2 pr-2 w-28 text-right">Salario / Costo h.</th>
                  <th className="py-2 pr-2 w-24 text-right">Costo hora</th>
                  <th className="py-2 pr-2 w-24 text-right">Hora cargada</th>
                  <th className="py-2 pr-2 w-24 text-right">Valor día</th>
                  <th className="py-2 pr-2 w-20 text-right">Días</th>
                  <th className="py-2 pr-2 w-24 text-right">Dedicación %</th>
                  <th className="py-2 pr-2 w-20 text-right">Cronograma</th>
                  <th className="py-2 pr-2 w-28 text-right">Total</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {computedResources.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2"><input className={inputClass} value={r.role} maxLength={60} onChange={(e) => updateResource(r.id, { role: filterFreeText(e.target.value) })} placeholder="Dev. Senior" /></td>
                    <td className="py-1.5 pr-2"><input className={inputClass} value={r.name} maxLength={60} onChange={(e) => updateResource(r.id, { name: e.target.value })} placeholder="Opcional" /></td>
                    <td className="py-1.5 pr-2">
                      <select className={inputClass} value={r.type} onChange={(e) => updateResource(r.id, { type: e.target.value })}>
                        <option value="interno">Interno</option>
                        <option value="externo">Externo</option>
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      {r.type === 'interno' ? (
                        <input className={`${inputClass} text-right`} value={r.monthly_salary} onChange={(e) => updateResource(r.id, { monthly_salary: filterDecimal(e.target.value) })} />
                      ) : (
                        <input className={`${inputClass} text-right`} value={r.external_hour_cost} onChange={(e) => updateResource(r.id, { external_hour_cost: filterDecimal(e.target.value) })} />
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono text-gray-700">{r.hourCost.toFixed(2)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono text-gray-700">{r.loadedHour.toFixed(2)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono text-gray-700">{r.dayValue.toFixed(2)}</td>
                    <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={r.assigned_days} onChange={(e) => updateResource(r.id, { assigned_days: filterDecimal(e.target.value) })} /></td>
                    <td className="py-1.5 pr-2">
                      <input className={`${inputClass} text-right`} value={r.dedication_pct ?? 100} onChange={(e) => updateResource(r.id, { dedication_pct: filterDecimal(e.target.value) })} title="% de su jornada dedicado a este proyecto" />
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono text-xs">
                      {r.scheduledDays === null ? (
                        <span className="text-gray-300">—</span>
                      ) : r.scheduledDays === toNumber(r.assigned_days) ? (
                        <span className="text-green-600">{r.scheduledDays}d</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amberline" title="No coincide con los días costeados">
                          <AlertTriangle size={12} /> {r.scheduledDays}d
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono font-semibold text-gray-900">{formatCurrency(r.total)}</td>
                    <td className="py-1.5 text-center">
                      <button type="button" onClick={() => setResourceToDelete(r.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-right text-sm font-semibold text-gray-900">Subtotal mano de obra: {formatCurrency(subtotalMO)}</div>
        <p className="mt-1 text-xs text-gray-500">"Dedicación %" escala los días a "días efectivos" (ej. 50% de dedicación en 20 días = 10 días efectivos de costo). La columna "Cronograma" compara los días costeados aquí (sin escalar) contra la suma de duraciones del WBS cuyo responsable coincide con el nombre del recurso.</p>
        <p className="mt-2 rounded-lg border border-blueprint-100 bg-blueprint-50/60 p-3 text-xs text-gray-600">
          Al guardar, el costo de cada tarea del EDT se recalcula automáticamente (tarifa/día del recurso × duración), usando el campo "Responsable" de cada tarea para saber a quién cobrarle. "EDT y Cronograma" y este costeo quedan siempre sincronizados — no hace falta un botón aparte.
        </p>
      </div>

      <CostItemsTable title="Tecnología / infraestructura" hint="Cloud, licencias, certificados, equipos..." items={costItems.technology} onChange={(items) => setCostItems((c) => ({ ...c, technology: items }))} prefix="tech" />
      <CostItemsTable title="Costos fijos" hint="Suscripciones, internet, telefonía..." items={costItems.fixed} onChange={(items) => setCostItems((c) => ({ ...c, fixed: items }))} prefix="fix" />
      <CostItemsTable title="Costos indirectos" hint="Electricidad, administración..." items={costItems.indirect} onChange={(items) => setCostItems((c) => ({ ...c, indirect: items }))} prefix="ind" />

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de costos estimados</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Directos (mano de obra)</span><span className="font-mono text-gray-900">{formatCurrency(subtotalMO)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Tecnología</span><span className="font-mono text-gray-900">{formatCurrency(subtotalTech)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Fijos</span><span className="font-mono text-gray-900">{formatCurrency(subtotalFixed)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Indirectos</span><span className="font-mono text-gray-900">{formatCurrency(subtotalIndirect)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold"><span>TOTAL COSTOS</span><span className="font-mono">{formatCurrency(totalCostos)}</span></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Reserva de contingencia (%) — riesgos conocidos, dentro de la línea base</span>
            <input className={`${inputClass} w-24 text-right`} value={contingencyPct} onChange={(e) => setContingencyPct(filterDecimal(e.target.value))} />
          </div>
          <div className="flex justify-between"><span className="text-gray-600">Monto de contingencia</span><span className="font-mono text-gray-900">{formatCurrency(contingencyAmount)}</span></div>
          <div className="flex justify-between border-t-2 border-blueprint-600 pt-2 text-base font-bold text-blueprint-700"><span>TOTAL ESTIMADO (BAC / línea base)</span><span className="font-mono">{formatCurrency(totalEstimated)}</span></div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-gray-600">Reserva de gestión (%) — riesgos desconocidos, fuera de la línea base</span>
            <input className={`${inputClass} w-24 text-right`} value={managementReservePct} onChange={(e) => setManagementReservePct(filterDecimal(e.target.value))} />
          </div>
          <div className="flex justify-between"><span className="text-gray-600">Monto de reserva de gestión</span><span className="font-mono text-gray-900">{formatCurrency(managementReserveAmount)}</span></div>
          <div className="flex justify-between border-t-2 border-navy pt-2 text-base font-bold text-navy"><span>AUTORIZACIÓN TOTAL (BAC + reserva de gestión)</span><span className="font-mono">{formatCurrency(totalAuthorization)}</span></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={useAsBac} disabled={saving} className="rounded-lg border border-blueprint-600 px-4 py-2 text-sm font-medium text-blueprint-700 transition-colors hover:bg-blueprint-50 disabled:opacity-50">
            Usar {formatCurrency(totalEstimated)} como BAC del proyecto
          </button>
          {toNumber(project.bac) !== Math.round(totalEstimated * 100) / 100 && (
            <span className="text-xs text-gray-500">BAC actual del proyecto: {formatCurrency(project.bac)}</span>
          )}
        </div>
      </div>

      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      {resourceToDelete && (
        <ConfirmModal
          title="Eliminar recurso"
          message="¿Seguro que quieres eliminar este recurso? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={confirmRemoveResource}
          onCancel={() => setResourceToDelete(null)}
        />
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blueprint-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50">
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar recursos y costos'}
        </button>
      </div>
    </div>
  );
}
