import React from 'react';
import { Download, Printer } from 'lucide-react';

const listOrDash = (arr) => (Array.isArray(arr) ? arr.filter((item) => item && String(item).trim()) : []);
const textOrDash = (value) => (value && String(value).trim() ? value : '—');

const buildMarkdown = (project) => {
  const problem = project.problem ?? {};
  const justification = project.justification ?? {};
  const causas = listOrDash(problem.causas);
  const efectos = listOrDash(problem.efectos);
  const phases = Array.isArray(project.wbs_phases) ? project.wbs_phases : [];
  const members = Array.isArray(project.team_members) ? project.team_members : [];
  const raci = project.raci ?? {};

  let md = `# Acta de Constitución — ${project.name || 'Proyecto sin nombre'}\n\n`;
  md += `**Descripción:** ${textOrDash(project.description)}\n\n`;
  md += `**Administrador del Proyecto:** ${textOrDash(project.project_manager)}  \n`;
  md += `**Periodo:** ${textOrDash(project.start_date)} — ${textOrDash(project.end_date)}\n\n`;

  md += `## 1. Problema central\n\n${textOrDash(problem.central)}\n\n`;
  md += `### Causas\n${causas.length ? causas.map((c) => `- ${c}`).join('\n') : '—'}\n\n`;
  md += `### Efectos\n${efectos.length ? efectos.map((e) => `- ${e}`).join('\n') : '—'}\n\n`;

  md += `## 2. Justificación\n\n`;
  md += `**Pertinencia:** ${textOrDash(justification.pertinencia)}\n\n`;
  md += `**Urgencia:** ${textOrDash(justification.urgencia)}\n\n`;
  md += `**Viabilidad:** ${textOrDash(justification.viabilidad)}\n\n`;
  md += `**Impacto:** ${textOrDash(justification.impacto)}\n\n`;

  const blueprint = project.blueprint ?? {};
  md += `## 3. Blueprint\n\n`;
  md += `**Alcance — Incluye:** ${textOrDash(blueprint.incluye)}  \n**Alcance — Excluye:** ${textOrDash(blueprint.excluye)}\n\n`;
  md += `**Stack / arquitectura:** ${textOrDash(blueprint.stack)}\n\n`;
  md += `**Supuestos:** ${textOrDash(blueprint.supuestos)}  \n**Restricciones:** ${textOrDash(blueprint.restricciones)}\n\n`;
  md += `**Hitos macro:** ${textOrDash(blueprint.hitos)}\n\n`;
  md += `**Criterios de éxito:** ${textOrDash(blueprint.criterios)}\n\n`;

  md += `## 4. Equipo del proyecto\n\n| Nombre | Rol |\n|---|---|\n`;
  members.forEach((member) => { md += `| ${member.member_name || '—'} | ${member.member_role || '—'} |\n`; });
  md += '\n';

  md += `## 5. Estructura de Desglose del Trabajo (EDT/WBS)\n\n`;
  phases.forEach((phase) => {
    md += `### ${phase.phase_order}. ${phase.phase_name}\n\n`;
    md += `| ID | Tarea | Entregable | Duración | Responsable |\n|---|---|---|---|---|\n`;
    (phase.activities ?? []).forEach((activity) => {
      md += `| ${activity.id} | ${activity.activity_name} | ${activity.deliverable || '—'} | ${activity.duration_days}d | ${activity.responsable || '—'} |\n`;
    });
    md += '\n';
  });

  md += `## 6. Matriz RACI\n\n`;
  if (members.length && phases.length) {
    md += `| Tarea | ${members.map((m) => m.member_name).join(' | ')} |\n|---|${members.map(() => '---').join('|')}|\n`;
    phases.forEach((phase) => {
      (phase.activities ?? []).forEach((activity) => {
        md += `| ${activity.id} · ${activity.activity_name} | ${members.map((m) => raci[activity.id]?.[m.id] || '—').join(' | ')} |\n`;
      });
    });
  } else {
    md += '—\n';
  }

  return md;
};

const downloadMarkdown = (project) => {
  const md = buildMarkdown(project);
  const filename = `${(project.name || 'proyecto').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-acta.md`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function ActaPanel({ project }) {
  const problem = project.problem ?? {};
  const justification = project.justification ?? {};
  const causas = listOrDash(problem.causas);
  const efectos = listOrDash(problem.efectos);
  const phases = Array.isArray(project.wbs_phases) ? project.wbs_phases : [];
  const members = Array.isArray(project.team_members) ? project.team_members : [];
  const raci = project.raci ?? {};
  const blueprint = project.blueprint ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => downloadMarkdown(project)}
          className="flex items-center gap-2 rounded-lg bg-blueprint-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blueprint-700"
        >
          <Download size={16} /> Descargar como Markdown
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-blueprint-600 px-4 py-2 text-sm font-medium text-blueprint-700 transition-colors hover:bg-blueprint-50"
        >
          <Printer size={16} /> Imprimir / Guardar como PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-8 space-y-6">
        <div className="border-b-2 border-navy pb-4">
          <h1 className="text-2xl font-bold text-navy">Acta de Constitución</h1>
          <p className="text-lg font-semibold text-gray-900 mt-1">{project.name || 'Proyecto sin nombre'}</p>
          <p className="text-sm text-gray-600 mt-2">{textOrDash(project.description)}</p>
          <p className="text-xs font-mono text-ink-soft mt-2">
            PM: {textOrDash(project.project_manager)} · Periodo: {textOrDash(project.start_date)} — {textOrDash(project.end_date)}
          </p>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-blueprint-700 mb-2">1. Problema central</h2>
          <p className="text-sm text-gray-800 mb-3">{textOrDash(problem.central)}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Causas</p>
              {causas.length ? (
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                  {causas.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              ) : <p className="text-sm text-gray-400 italic">Sin definir</p>}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Efectos</p>
              {efectos.length ? (
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                  {efectos.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              ) : <p className="text-sm text-gray-400 italic">Sin definir</p>}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blueprint-700 mb-2">2. Justificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-800">
            <p><b>Pertinencia:</b> {textOrDash(justification.pertinencia)}</p>
            <p><b>Urgencia:</b> {textOrDash(justification.urgencia)}</p>
            <p><b>Viabilidad:</b> {textOrDash(justification.viabilidad)}</p>
            <p><b>Impacto:</b> {textOrDash(justification.impacto)}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blueprint-700 mb-2">3. Blueprint</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-800">
            <p><b>Alcance — Incluye:</b> {textOrDash(blueprint.incluye)}</p>
            <p><b>Alcance — Excluye:</b> {textOrDash(blueprint.excluye)}</p>
            <p className="md:col-span-2"><b>Stack / arquitectura:</b> {textOrDash(blueprint.stack)}</p>
            <p><b>Supuestos:</b> {textOrDash(blueprint.supuestos)}</p>
            <p><b>Restricciones:</b> {textOrDash(blueprint.restricciones)}</p>
            <p><b>Hitos macro:</b> {textOrDash(blueprint.hitos)}</p>
            <p><b>Criterios de éxito:</b> {textOrDash(blueprint.criterios)}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blueprint-700 mb-2">4. Equipo del proyecto</h2>
          {members.length ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left"><th className="py-1 pr-3">Nombre</th><th className="py-1">Rol</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-1 pr-3">{m.member_name}</td>
                    <td className="py-1">{m.member_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-400 italic">Sin integrantes</p>}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blueprint-700 mb-2">5. Estructura de Desglose del Trabajo (EDT/WBS)</h2>
          {phases.length ? phases.map((phase) => (
            <div key={phase.id} className="mb-4">
              <p className="font-semibold text-gray-900 text-sm mb-1">{phase.phase_order}. {phase.phase_name}</p>
              <table className="w-full text-sm mb-2">
                <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="py-1 pr-2">ID</th><th className="py-1 pr-2">Tarea</th><th className="py-1 pr-2 text-right">Duración</th><th className="py-1">Responsable</th>
                </tr></thead>
                <tbody>
                  {(phase.activities ?? []).map((activity) => (
                    <tr key={activity.id} className="border-b border-gray-100">
                      <td className="py-1 pr-2 font-mono text-xs">{activity.id}</td>
                      <td className="py-1 pr-2">{activity.activity_name}</td>
                      <td className="py-1 pr-2 text-right">{activity.duration_days}d</td>
                      <td className="py-1">{activity.responsable || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )) : <p className="text-sm text-gray-400 italic">Sin fases registradas</p>}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blueprint-700 mb-2">6. Matriz RACI</h2>
          {members.length && phases.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead><tr className="border-b border-gray-200 text-left">
                  <th className="py-1 pr-2">Tarea</th>
                  {members.map((m) => <th key={m.id} className="py-1 px-2 text-center">{m.member_name}</th>)}
                </tr></thead>
                <tbody>
                  {phases.flatMap((phase) => phase.activities ?? []).map((activity) => (
                    <tr key={activity.id} className="border-b border-gray-100">
                      <td className="py-1 pr-2">{activity.id} · {activity.activity_name}</td>
                      {members.map((m) => (
                        <td key={m.id} className="py-1 px-2 text-center font-mono font-semibold">{raci[activity.id]?.[m.id] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-gray-400 italic">Matriz sin completar</p>}
        </section>
      </div>
    </div>
  );
}
