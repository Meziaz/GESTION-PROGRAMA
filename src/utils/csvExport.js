// Exportación a CSV reutilizada por los paneles con tablas (Recursos, Calidad, Riesgos...).
export const downloadCsv = (filename, headers, rows) => {
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
