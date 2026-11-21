import React from 'react';
import { Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collectActivities } from './wbsValidationUI';
import { formatCurrency } from './evmCalculations';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// EV "de abajo hacia arriba": en vez de un único % de avance para todo el proyecto, usa el
// costo y el % de avance de cada actividad del EDT y los agrega por fase. Permite ver qué
// paquetes de trabajo están realmente atrasando el proyecto, en vez de un número global ciego.
export function WbsEvmPanel({ project, topDownEv }) {
  const activities = collectActivities(project);
  if (activities.length === 0) return null;

  const phaseMap = new Map();
  for (const activity of activities) {
    const key = activity.phase_id ?? activity.phase_name;
    if (!phaseMap.has(key)) {
      phaseMap.set(key, { phase_id: key, phase_name: activity.phase_name, phase_order: toNumber(activity.phase_order), bac: 0, ev: 0 });
    }
    const entry = phaseMap.get(key);
    const cost = toNumber(activity.cost);
    const progress = toNumber(activity.progress_percentage);
    entry.bac += cost;
    entry.ev += cost * (progress / 100);
  }

  const phases = [...phaseMap.values()].sort((a, b) => a.phase_order - b.phase_order);
  const totalBac = phases.reduce((sum, p) => sum + p.bac, 0);
  const totalEv = phases.reduce((sum, p) => sum + p.ev, 0);
  const globalPct = totalBac > 0 ? (totalEv / totalBac) * 100 : 0;

  const chartData = phases.map((p) => ({
    name: p.phase_name.length > 20 ? `${p.phase_name.slice(0, 20)}…` : p.phase_name,
    BAC: Math.round(p.bac * 100) / 100,
    EV: Math.round(p.ev * 100) / 100,
  }));

  const hasTopDown = Number.isFinite(topDownEv);
  const diff = hasTopDown ? totalEv - topDownEv : null;
  const diffIsRelevant = hasTopDown && totalBac > 0 && Math.abs(diff) > totalBac * 0.02;

  return (
    <div className="bg-white rounded-lg shadow-sm border-0 p-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1"><Layers size={20} /> Valor Ganado por Paquete EDT (bottom-up)</h3>
      <p className="text-sm text-gray-600 mb-4">
        Calcula el EV de cada fase del EDT usando el costo y el % de avance de sus actividades, y los suma.
        Es una forma más precisa de ver qué paquetes de trabajo están realmente atrasando el proyecto, en vez
        de depender de un solo % global.
      </p>

      <ResponsiveContainer width="100%" height={Math.max(180, phases.length * 45)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="BAC" fill="#d1d5db" radius={[0, 3, 3, 0]} />
          <Bar dataKey="EV" fill="#4d84e0" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
              <th className="py-2 pr-2">Paquete (Fase EDT)</th>
              <th className="py-2 pr-2 text-right">BAC</th>
              <th className="py-2 pr-2 text-right">% Avance</th>
              <th className="py-2 pr-2 text-right">EV</th>
              <th className="py-2 pr-2 text-right">Peso</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((p) => {
              const pct = p.bac > 0 ? (p.ev / p.bac) * 100 : 0;
              const weight = totalBac > 0 ? (p.bac / totalBac) * 100 : 0;
              return (
                <tr key={p.phase_id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2 font-medium text-gray-900">{p.phase_name}</td>
                  <td className="py-1.5 pr-2 text-right font-mono">{formatCurrency(p.bac)}</td>
                  <td className={`py-1.5 pr-2 text-right font-mono font-semibold ${pct >= 100 ? 'text-green-600' : pct === 0 ? 'text-gray-400' : 'text-amberline'}`}>{pct.toFixed(1)}%</td>
                  <td className="py-1.5 pr-2 text-right font-mono">{formatCurrency(p.ev)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono text-gray-500">{weight.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-2 pr-2">Total</td>
              <td className="py-2 pr-2 text-right font-mono">{formatCurrency(totalBac)}</td>
              <td className="py-2 pr-2 text-right font-mono">{globalPct.toFixed(1)}%</td>
              <td className="py-2 pr-2 text-right font-mono">{formatCurrency(totalEv)}</td>
              <td className="py-2 pr-2 text-right"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {hasTopDown && (
        <div className="mt-4 rounded-lg border border-paper-line p-4 text-sm">
          <p className="text-gray-700">
            <span className="font-semibold">EV bottom-up (por EDT):</span> {formatCurrency(totalEv)} ·{' '}
            <span className="font-semibold">EV reportado en el último corte:</span> {formatCurrency(topDownEv)}
          </p>
          <p className={`mt-1 ${diffIsRelevant ? 'text-amberline font-medium' : 'text-gray-500'}`}>
            Diferencia: {formatCurrency(diff)}
            {diffIsRelevant
              ? ' — revisa si el % del corte coincide con el avance real registrado en cada actividad del EDT.'
              : ' (dentro de un margen razonable).'}
          </p>
        </div>
      )}
    </div>
  );
}
