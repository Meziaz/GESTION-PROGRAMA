/**
 * EVM (Earned Value Management) Calculations
 * All calculations return values with proper formatting
 */

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clampPercentage = (value) => Math.min(100, Math.max(0, toFiniteNumber(value)));

export const generateSigmoidCurve = (bac, durationDays) => {
  /**
   * Generate PV (Planned Value) using sigmoid curve
   * PV(t) = BAC / (1 + e^(-k*(t - midpoint)))
   * midpoint = duration/2, k = 10/duration
   * Normalized: PV(0)=0, PV(duration)=BAC
   */
  const curve = [];
  const budget = Math.max(0, toFiniteNumber(bac));
  const days = Math.max(1, Math.floor(toFiniteNumber(durationDays, 1)));
  const midpoint = days / 2;
  const k = 10 / days;

  // Generate raw curve
  const rawCurve = [];
  for (let day = 0; day <= days; day++) {
    const sigmoid = 1 / (1 + Math.exp(-k * (day - midpoint)));
    rawCurve.push(sigmoid);
  }

  // Normalize: first value should be ~0, last should be ~1
  const minVal = rawCurve[0];
  const maxVal = rawCurve[days];
  const range = maxVal - minVal;

  for (let day = 0; day <= days; day++) {
    const normalizedSigmoid = (rawCurve[day] - minVal) / range;
    const pv = normalizedSigmoid * budget;
    curve.push({
      day,
      pv: Math.round(pv * 100) / 100,
    });
  }

  return curve;
};

export const calculateEVMetrics = (bac, cutDates) => {
  /**
   * Calculate EVM metrics for all cut dates
   * Returns array with metrics for each cut date
   */
  if (!cutDates || cutDates.length === 0) {
    return [];
  }

  const budget = Math.max(0, toFiniteNumber(bac));
  return cutDates.map((cutDate) => {
    const source = cutDate && typeof cutDate === 'object' ? cutDate : {};
    const ev = (clampPercentage(source.actual_percentage) / 100) * budget;
    const pv = Math.max(0, toFiniteNumber(source.pv_value));
    const ac = Math.max(0, toFiniteNumber(source.actual_cost));

    const cv = ev - ac;
    const sv = ev - pv;
    const cpi = ac > 0 ? ev / ac : null;
    const spi = pv > 0 ? ev / pv : null;

    return {
      ...source,
      ev: Math.round(ev * 100) / 100,
      cv: Math.round(cv * 100) / 100,
      sv: Math.round(sv * 100) / 100,
      cpi: cpi !== null ? parseFloat(cpi.toFixed(2)) : null,
      spi: spi !== null ? parseFloat(spi.toFixed(2)) : null,
    };
  });
};

export const calculateProjectMetrics = (bac, latestMetrics) => {
  /**
   * Calculate all EVM metrics for the latest cut date
   * Returns comprehensive EVM dashboard metrics
   * Includes optimistic, realistic, and pessimistic EAC scenarios
   */
  const budget = Math.max(0, toFiniteNumber(bac));
  const emptyMetrics = {
    bac: Math.round(budget * 100) / 100,
    pv: 0,
    ev: 0,
    ac: 0,
    cv: 0,
    sv: 0,
    cpi: null,
    spi: null,
    eac_optimistic: null,
    eac_realistic: null,
    eac_pessimistic: null,
    etc: null,
    vac: null,
    tcpi_bac: null,
    tcpi_eac: null,
  };
  if (!latestMetrics || typeof latestMetrics !== 'object') return emptyMetrics;

  const pv = Math.max(0, toFiniteNumber(latestMetrics.pv_value));
  const ev = (clampPercentage(latestMetrics.actual_percentage) / 100) * budget;
  const ac = Math.max(0, toFiniteNumber(latestMetrics.actual_cost));
  const cv = ev - ac;
  const sv = ev - pv;
  const cpi = ac > 0 ? ev / ac : null;
  const spi = pv > 0 ? ev / pv : null;

  let eacOptimistic = null;
  let eacRealistic = null;
  let eacPessimistic = null;
  let etc = null;
  let vac = null;
  let tcpiBac = null;
  let tcpiEac = null;

  if (cpi !== null && cpi > 0) {
    eacOptimistic = budget / cpi;
    eacRealistic = spi !== null && spi > 0 ? budget / ((cpi + spi) / 2) : eacOptimistic;
    etc = eacOptimistic - ac;
    vac = budget - eacOptimistic;
  }
  eacPessimistic = spi !== null && spi > 0 ? budget / spi : eacOptimistic;

  if (budget - ac > 0) {
    tcpiBac = (budget - ev) / (budget - ac);
  }
  if (eacOptimistic !== null && eacOptimistic - ac > 0) {
    tcpiEac = (budget - ev) / (eacOptimistic - ac);
  }

  const round2 = (value) => Math.round(value * 100) / 100;
  const roundIndex = (value) => value === null ? null : parseFloat(toFiniteNumber(value).toFixed(2));
  const roundNullable = (value) => value === null || !Number.isFinite(value) ? null : round2(value);
  return {
    bac: round2(budget),
    pv: round2(pv),
    ev: round2(ev),
    ac: round2(ac),
    cv: round2(cv),
    sv: round2(sv),
    cpi: roundIndex(cpi),
    spi: roundIndex(spi),
    eac_optimistic: roundNullable(eacOptimistic),
    eac_realistic: roundNullable(eacRealistic),
    eac_pessimistic: roundNullable(eacPessimistic),
    etc: roundNullable(etc),
    vac: roundNullable(vac),
    tcpi_bac: roundIndex(tcpiBac),
    tcpi_eac: roundIndex(tcpiEac),
  };
};

export const getProjectStatus = (cpi, spi) => {
  /**
   * Determine project status based on CPI and SPI
   * saludable (healthy): CPI >= 1 AND SPI >= 1
   * atención (attention): any between 0.85-1
   * crítico (critical): any < 0.85
   */
  const cpiValue = cpi === null || cpi === undefined || cpi === '' ? Number.NaN : Number(cpi);
  const spiValue = spi === null || spi === undefined || spi === '' ? Number.NaN : Number(spi);
  if (!Number.isFinite(cpiValue) || !Number.isFinite(spiValue)) {
    return 'pendiente';
  }

  if (cpiValue < 0.85 || spiValue < 0.85) {
    return 'crítico';
  }

  if ((cpiValue >= 0.85 && cpiValue < 1) || (spiValue >= 0.85 && spiValue < 1)) {
    return 'atención';
  }

  return 'saludable';
};

export const formatCurrency = (value) => {
  const number = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) return 'N/A';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

export const formatIndex = (value) => {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'N/A';
  return Number(value).toFixed(2);
};

export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'saludable':
      return 'bg-green-100 text-green-800';
    case 'atención':
      return 'bg-red-100 text-red-800';
    case 'crítico':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusLabel = (status) => {
  switch (status) {
    case 'saludable':
      return 'Saludable';
    case 'atención':
      return 'Atención';
    case 'crítico':
      return 'Crítico';
    default:
      return 'Pendiente';
  }
};
