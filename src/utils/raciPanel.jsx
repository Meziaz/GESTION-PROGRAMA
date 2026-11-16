import React from 'react';
import { Download, AlertTriangle, CheckCircle } from 'lucide-react';

const RACI_OPTIONS = ['', 'R', 'A', 'C', 'I'];
const RACI_LABELS = { R: 'Responsable', A: 'Accountable', C: 'Consultado', I: 'Informado' };

const collectRows = (project) => {
  const rows = [];
  for (const phase of project?.wbs_phases ?? []) {
    if (!phase || typeof phase !== 'object') continue;
    for (const activity of Array.isArray(phase.activities) ? phase.activities : []) {
      rows.push({
        id: activity.id,
        name: activity.activity_name || activity.id,
        phaseName: phase.phase_name ?? '',
      });
    }
  }
  return rows;
};

const downloadCsv = (filename, headers, rows) => {
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function RaciPanel({ project, onSave }) {
  const rows = collectRows(project);
  const members = Array.isArray(project.team_members) ? project.team_members : [];
  const raci = project.raci ?? {};

  const getCell = (activityId, memberId) => raci[activityId]?.[memberId] ?? '';

  const setCell = async (activityId, memberId, value) => {
    const nextRaci = {
      ...raci,
      [activityId]: { ...(raci[activityId] ?? {}), [memberId]: value },
    };
    await onSave({ ...project, raci: nextRaci });
  };

  if (members.length === 0 || rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-paper-line bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900">Matriz RACI no disponible</h3>
        <p className="mt-2 text-sm text-gray-600">
          Necesitas al menos un miembro de equipo y una tarea en el WBS para construir la matriz.
        </p>
      </div>
    );
  }

  const problems = rows
    .map((row) => ({
      row,
      accountableCount: members.filter((member) => getCell(row.id, member.id) === 'A').length,
    }))
    .filter(({ accountableCount }) => accountableCount !== 1);

  const downloadRows = rows.map((row) => [
    row.phaseName,
    row.id,
    row.name,
    ...members.map((member) => getCell(row.id, member.id) || '—'),
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Matriz RACI</h3>
            <p className="mt-1 text-sm text-gray-600">Un miembro por celda: quién ejecuta (R), quién aprueba (A), a quién se consulta (C), a quién se informa (I).</p>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv('matriz-raci.csv', ['Fase', 'ID', 'Tarea', ...members.map((m) => m.member_name || 'Miembro')], downloadRows)}
            className="flex items-center gap-2 text-sm text-blueprint-600 hover:text-blueprint-900 font-medium"
          >
            <Download size={16} /> Descargar matriz RACI
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-4 font-mono text-xs text-ink-soft">
          <span><b className="text-ink">R</b> Responsable — ejecuta el trabajo</span>
          <span><b className="text-ink">A</b> Accountable — dueño final (uno por fila)</span>
          <span><b className="text-ink">C</b> Consultado — provee información</span>
          <span><b className="text-ink">I</b> Informado — recibe actualizaciones</span>
        </div>

        {problems.length > 0 ? (
          <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 flex-shrink-0 text-red-600" size={18} />
              <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                {problems.map(({ row, accountableCount }) => (
                  <li key={row.id}>
                    {row.id} — {row.name}: {accountableCount === 0 ? 'sin Accountable asignado' : `tiene ${accountableCount} Accountable (debe ser exactamente uno)`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 rounded-lg border-l-4 border-green-500 bg-green-50 p-3">
            <CheckCircle className="text-green-600" size={18} />
            <p className="text-sm text-green-800">Regla cumplida: un único Accountable por tarea.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-700">Tarea (WBS)</th>
                {members.map((member) => (
                  <th key={member.id} className="px-3 py-2 text-center font-medium text-gray-700">
                    <p>{member.member_name || 'Sin nombre'}</p>
                    <p className="text-xs font-normal text-gray-500">{member.member_role || ''}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{row.id} · {row.name}</p>
                    <p className="text-xs text-gray-500">{row.phaseName}</p>
                  </td>
                  {members.map((member) => {
                    const value = getCell(row.id, member.id);
                    return (
                      <td key={member.id} className="px-3 py-2 text-center">
                        <select
                          value={value}
                          onChange={(e) => setCell(row.id, member.id, e.target.value)}
                          title={RACI_LABELS[value] ?? ''}
                          className={`rounded border px-2 py-1 text-center font-mono text-xs font-semibold outline-none focus:ring-2 focus:ring-blueprint-600 ${
                            value === 'A' ? 'border-amberline text-amberline' : value === 'R' ? 'border-blueprint-500 text-blueprint-700' : 'border-paper-line text-ink-soft'
                          }`}
                        >
                          {RACI_OPTIONS.map((option) => (
                            <option key={option || 'none'} value={option}>{option || '—'}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
