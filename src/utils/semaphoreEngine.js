// Motor genérico de semáforos para el Tablero de Control.
// Cada indicador (CPI, DRE, Contingencia disponible...) es una "razón" distinta,
// pero todas caen en uno de estos patrones de evaluación:
//
//   'ratio'   -> razón que idealmente vale 1 (CPI, SPI, TCPI). `invert: true` para
//                 indicadores donde un valor ALTO es desfavorable (ej. TCPI).
//   'signed'  -> valor monetario donde positivo es bueno y negativo es malo
//                 (CV, SV, VAC, Contingencia disponible), con una banda de tolerancia
//                 alrededor de cero para el estado "naranja".
//   'target'  -> valor donde más alto es mejor, comparado contra una meta, en 3 bandas
//                 (uso general).
//
// getQualityBand() es un escalón aparte: 5 bandas según % de la meta alcanzado,
// como se enseña en la clase de Calidad (Óptimo/Muy bueno/Aceptable/Riesgoso/Crítico),
// para DRE, Cobertura de código, MTBF y % de cumplimiento de auditorías.

const COLORS = {
  verde: '#16a34a',
  naranja: '#d4a843',
  rojo: '#dc2626',
  pendiente: '#9ca3af',
};

const LABELS = {
  verde: 'Saludable',
  naranja: 'Atención',
  rojo: 'Crítico',
  pendiente: 'Sin datos',
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

export const getSemaphoreStatus = (value, type, config = {}) => {
  if (!isFiniteNumber(value)) {
    return { status: 'pendiente', color: COLORS.pendiente, label: LABELS.pendiente };
  }
  const v = Number(value);

  if (type === 'ratio') {
    const low = config.low ?? 0.95;
    const high = config.high ?? 1.05;
    const invert = Boolean(config.invert);
    let status;
    if (v < low) status = invert ? 'verde' : 'rojo';
    else if (v > high) status = invert ? 'rojo' : 'verde';
    else status = 'naranja';
    return { status, color: COLORS[status], label: LABELS[status] };
  }

  if (type === 'signed') {
    const tolerance = config.tolerance ?? 0;
    let status;
    if (v > tolerance) status = 'verde';
    else if (v < -tolerance) status = 'rojo';
    else status = 'naranja';
    return { status, color: COLORS[status], label: LABELS[status] };
  }

  if (type === 'target') {
    const target = config.target ?? 100;
    const toleranceRatio = config.toleranceRatio ?? 0.85;
    let status;
    if (v >= target) status = 'verde';
    else if (v >= target * toleranceRatio) status = 'naranja';
    else status = 'rojo';
    return { status, color: COLORS[status], label: LABELS[status] };
  }

  return { status: 'pendiente', color: COLORS.pendiente, label: LABELS.pendiente };
};

// 5 bandas basadas en qué % de la meta se alcanzó — escala de la clase de Calidad.
// Óptimo >=100% · Muy bueno 90-99% · Aceptable 75-89% · Riesgoso 50-74% · Crítico <50%.
const QUALITY_BANDS = [
  { min: 1, status: 'optimo', label: 'Óptimo', color: '#16a34a' },
  { min: 0.9, status: 'muy_bueno', label: 'Muy bueno', color: '#65a30d' },
  { min: 0.75, status: 'aceptable', label: 'Aceptable', color: '#d4a843' },
  { min: 0.5, status: 'riesgoso', label: 'Riesgoso', color: '#ea580c' },
  { min: -Infinity, status: 'critico', label: 'Crítico', color: '#dc2626' },
];

export const getQualityBand = (value, target) => {
  if (!isFiniteNumber(value) || !isFiniteNumber(target) || Number(target) <= 0) {
    return { status: 'pendiente', color: COLORS.pendiente, label: LABELS.pendiente };
  }
  const ratio = Number(value) / Number(target);
  const band = QUALITY_BANDS.find((b) => ratio >= b.min);
  return { status: band.status, color: band.color, label: band.label };
};

export const QUALITY_BAND_LEGEND = QUALITY_BANDS.map(({ label, color }) => ({ label, color }));
