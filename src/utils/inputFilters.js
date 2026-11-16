// Filtros y validaciones de contenido reutilizados en todos los formularios del sistema
// (Nuevo/Editar Proyecto, tareas del WBS, seguimiento). Centralizados aquí para que el
// criterio sea el mismo en toda la app y no se repita la misma lógica en cada archivo.

// Nombres de personas: solo letras, tildes y espacios.
export const LETTERS_ONLY_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
export const filterLettersOnly = (value) => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');

// Texto libre con formato de título (nombre de proyecto, rol, tarea, entregable):
// solo letras, números y espacios. Nada de símbolos ni puntuación.
const FREE_TEXT_CHARSET_REGEX = /[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g;
export const filterFreeText = (value) => value.replace(FREE_TEXT_CHARSET_REGEX, '');

// Texto libre extenso (descripción): al menos la mitad de los caracteres deben ser letras reales.
// Rechaza cosas como "327842734723-----&&/&/&" o ",,-,ñ-435345990))))" que "tienen una letra" pero son basura.
export const hasReasonableLetterRatio = (value, minRatio = 0.5) => {
  const clean = String(value ?? '').replace(/\s/g, '');
  if (clean.length === 0) return false;
  const letters = (clean.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) ?? []).length;
  return letters / clean.length >= minRatio;
};

// ID de tarea: letras, números, guion y guion bajo (formato T-01-01), forzado a mayúsculas.
export const filterIdCharset = (value) => value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');

// Predecesoras: igual que un ID, pero permitiendo coma y espacio para separar varios.
export const filterPredecessorsInput = (value) => value.toUpperCase().replace(/[^A-Z0-9_,\s-]/g, '');

// Campos numéricos (costos, tiempos, porcentajes): solo dígitos y un único punto decimal.
// El input type="number" no bloquea caracteres inválidos en todos los navegadores;
// con un input de texto + este filtro el comportamiento es el mismo en cualquiera.
export const filterDecimal = (value) => {
  let clean = String(value ?? '').replace(/[^0-9.]/g, '');
  const firstDot = clean.indexOf('.');
  if (firstDot !== -1) {
    clean = clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, '');
  }
  return clean;
};
