import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, Calculator } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { filterDecimal } from './inputFilters';
import { downloadCsv } from './csvExport';
import { formatCurrency } from './evmCalculations';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';

const inputClass = 'w-full px-2 py-1.5 bg-white border border-paper-line rounded text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const emptyYear = (index) => ({
  id: `ey-${Date.now()}-${index}`,
  label: `Año ${index + 1}`,
  cost_sin_ia: 0,
  cost_con_ia: 0,
});

const formatMonths = (value) => {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  const years = Math.floor(value / 12);
  const months = Math.round(value - years * 12);
  if (years <= 0) return `${Math.round(value)} meses`;
  return `${years}a ${months}m (${Math.round(value)} meses)`;
};

// Payback interpolado: busca el primer año donde el flujo acumulado cruza cero y
// prorratea el mes exacto dentro de ese año usando el ahorro de ese mismo año.
const computePayback = (initialInvestment, years) => {
  let cumulative = -initialInvestment;
  for (let i = 0; i < years.length; i += 1) {
    const savings = toNumber(years[i].cost_sin_ia) - toNumber(years[i].cost_con_ia);
    const prevCumulative = cumulative;
    cumulative += savings;
    if (prevCumulative < 0 && cumulative >= 0 && savings > 0) {
      const fraction = -prevCumulative / savings;
      return i * 12 + fraction * 12;
    }
  }
  return null;
};

export function EconomicsPanel({ project, onSave }) {
  const [initialInvestment, setInitialInvestment] = useState(
    project.economics?.initial_investment ?? project.bac ?? 0,
  );
  const [years, setYears] = useState(
    project.economics?.years?.length ? project.economics.years : [emptyYear(0), emptyYear(1), emptyYear(2)],
  );
  const [notes, setNotes] = useState(project.economics?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [yearToDelete, setYearToDelete] = useState(null);

  useEffect(() => {
    setInitialInvestment(project.economics?.initial_investment ?? project.bac ?? 0);
    setYears(project.economics?.years?.length ? project.economics.years : [emptyYear(0), emptyYear(1), emptyYear(2)]);
    setNotes(project.economics?.notes ?? '');
  }, [project.id]);

  const updateYear = (id, patch) => setYears((prev) => prev.map((y) => (y.id === id ? { ...y, ...patch } : y)));
  const addYear = () => setYears((prev) => [...prev, emptyYear(prev.length)]);

  const totalSinIa = years.reduce((sum, y) => sum + toNumber(y.cost_sin_ia), 0);
  const totalConIaOperational = years.reduce((sum, y) => sum + toNumber(y.cost_con_ia), 0);
  const tcoSinIa = totalSinIa;
  const tcoConIa = toNumber(initialInvestment) + totalConIaOperational;
  const savingsTotal = tcoSinIa - tcoConIa;
  // ROI = (Beneficios totales - TCO) / TCO. "Beneficios totales" es el costo que se evita
  // (TCO Sin IA); el denominador es el TCO completo de la opción elegida, no solo la
  // inversión inicial, siguiendo la fórmula de la hoja de Evaluación Económica del curso.
  const roiPct = tcoConIa > 0 ? (savingsTotal / tcoConIa) * 100 : null;
  const paybackMonths = computePayback(toNumber(initialInvestment), years);

  const cashFlowData = (() => {
    let cumulative = -toNumber(initialInvestment);
    return [
      { label: 'Inicio', sin_ia: 0, con_ia: 0, acumulado: cumulative },
      ...years.map((y) => {
        const savings = toNumber(y.cost_sin_ia) - toNumber(y.cost_con_ia);
        cumulative += savings;
        return { label: y.label, sin_ia: toNumber(y.cost_sin_ia), con_ia: toNumber(y.cost_con_ia), acumulado: Math.round(cumulative * 100) / 100 };
      }),
    ];
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...project,
        economics: { initial_investment: toNumber(initialInvestment), years, notes },
      });
      setAlert({ type: 'success', message: 'Evaluación económica guardada correctamente.' });
    } catch (error) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><Calculator size={20} /> Evaluación económica</h3>
        <p className="text-sm text-gray-600 mb-4">
          Compara el costo de seguir con el proceso actual ("Sin IA") contra el costo de implementar y operar la solución
          ("Con IA"), a lo largo del horizonte de análisis. TCO = Costo Total de Propiedad.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">TCO Sin IA</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(tcoSinIa)}</p>
            <p className="mt-1 text-xs text-gray-400">Costo acumulado sin cambiar nada</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">TCO Con IA</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(tcoConIa)}</p>
            <p className="mt-1 text-xs text-gray-400">Inversión inicial + operación</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Ahorro total</p>
            <p className={`mt-1 text-2xl font-bold ${savingsTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(savingsTotal)}</p>
            <p className="mt-1 text-xs text-gray-400">TCO Sin IA − TCO Con IA</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">ROI</p>
            <p className={`mt-1 text-2xl font-bold ${roiPct === null ? 'text-gray-300' : roiPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {roiPct === null ? 'N/A' : `${roiPct.toFixed(1)}%`}
            </p>
            <p className="mt-1 text-xs text-gray-400">(Beneficios − TCO) / TCO</p>
          </div>
          <div className="rounded-lg border border-paper-line p-4">
            <p className="text-xs font-medium text-gray-500">Periodo de recuperación</p>
            <p className={`mt-1 text-2xl font-bold ${paybackMonths === null ? 'text-gray-300' : 'text-gray-900'}`}>
              {paybackMonths === null ? 'No se recupera' : formatMonths(paybackMonths)}
            </p>
            <p className="mt-1 text-xs text-gray-400">Payback dentro del horizonte analizado</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
          <label className="font-medium">Inversión inicial (USD)</label>
          <input className={`${inputClass} w-40`} value={initialInvestment} onChange={(e) => setInitialInvestment(filterDecimal(e.target.value))} />
          <span className="text-gray-400">Por defecto, el BAC del proyecto.</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-gray-900">Comparación por año</h4>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => downloadCsv('evaluacion_economica.csv', ['Periodo', 'Costo Sin IA', 'Costo Con IA', 'Ahorro'], years.map((y) => [y.label, y.cost_sin_ia, y.cost_con_ia, toNumber(y.cost_sin_ia) - toNumber(y.cost_con_ia)]))}
              className="flex items-center gap-1.5 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium"
            >
              <Download size={16} /> Descargar
            </button>
            <button type="button" onClick={addYear} className="flex items-center gap-1.5 text-sm font-medium text-blueprint-600 hover:text-blueprint-900">
              <Plus size={16} /> Agregar periodo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="py-2 pr-2">Periodo</th>
                <th className="py-2 pr-2 w-36 text-right">Costo Sin IA</th>
                <th className="py-2 pr-2 w-36 text-right">Costo Con IA</th>
                <th className="py-2 pr-2 w-36 text-right">Ahorro</th>
                <th className="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => {
                const savings = toNumber(y.cost_sin_ia) - toNumber(y.cost_con_ia);
                return (
                  <tr key={y.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2"><input className={inputClass} value={y.label} maxLength={40} onChange={(e) => updateYear(y.id, { label: e.target.value })} /></td>
                    <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={y.cost_sin_ia} onChange={(e) => updateYear(y.id, { cost_sin_ia: filterDecimal(e.target.value) })} /></td>
                    <td className="py-1.5 pr-2"><input className={`${inputClass} text-right`} value={y.cost_con_ia} onChange={(e) => updateYear(y.id, { cost_con_ia: filterDecimal(e.target.value) })} /></td>
                    <td className={`py-1.5 pr-2 text-right font-mono ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(savings)}</td>
                    <td className="py-1.5 text-center">
                      <button type="button" onClick={() => setYearToDelete(y.id)} className="text-gray-400 hover:text-red-600" aria-label="Eliminar"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <h5 className="text-sm font-semibold text-gray-900 mb-2">Flujo de caja acumulado</h5>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={cashFlowData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Bar dataKey="sin_ia" name="Costo Sin IA" fill="#ea580c" radius={[3, 3, 0, 0]} />
              <Bar dataKey="con_ia" name="Costo Con IA" fill="#4d84e0" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="acumulado" name="Flujo acumulado" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-500">La línea verde cruza el cero en el punto de recuperación de la inversión (payback).</p>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Supuestos y notas</label>
          <textarea
            className="w-full px-3 py-2 bg-white border border-paper-line rounded-lg text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none"
            rows={3}
            maxLength={600}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: costo Sin IA = horas-hombre actuales; costo Con IA incluye licencias + mantenimiento + soporte."
          />
        </div>
      </div>

      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      {yearToDelete && (
        <ConfirmModal title="Eliminar periodo" message="¿Seguro que quieres eliminar este periodo?" confirmLabel="Eliminar" onConfirm={() => { setYears((prev) => prev.filter((y) => y.id !== yearToDelete)); setYearToDelete(null); }} onCancel={() => setYearToDelete(null)} />
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blueprint-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50">
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar evaluación económica'}
        </button>
      </div>
    </div>
  );
}
