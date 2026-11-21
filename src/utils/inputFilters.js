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

// Nombre de proyecto (y de rol/miembro del equipo, que en la práctica se usa igual: "Legal/Tax
// Expert", "Dev. Senior"): como el texto libre de arriba, pero permitiendo la puntuación normal
// de un título real ("Sistema... - Gimnasio JEMAG", "Fase 1 (Piloto)", "QA/QC Lead").
export const TITLE_TEXT_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-&.,()/]+$/;
const PROJECT_NAME_CHARSET_REGEX = /[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-&.,()/]/g;
export const filterProjectNameText = (value) => value.replace(PROJECT_NAME_CHARSET_REGEX, '');

// ID de tarea: letras, números, guion y guion bajo (formato T-01-01 o act-010). No se fuerza
// a mayúsculas: algunos proyectos (ej. importados de ProjectLibre) usan IDs en minúscula, y
// forzar el caso rompía la referencia al compararla contra el ID real de la tarea.
export const filterIdCharset = (value) => value.replace(/[^A-Za-z0-9_-]/g, '');

// Predecesoras: igual que un ID, pero permitiendo coma y espacio para separar varios, y
// ":" + "+" para el sufijo opcional de tipo de dependencia y retraso/adelanto (ej: "T-01:SS+2").
// Tampoco se fuerza a mayúsculas, por la misma razón que filterIdCharset.
export const filterPredecessorsInput = (value) => value.replace(/[^A-Za-z0-9_,\s:+-]/g, '');

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
