import React from 'react';
import { X } from 'lucide-react';

// Modal de confirmación reutilizado por toda la app para acciones que pierden datos
// (eliminar proyecto, descartar cambios, quitar un miembro del equipo, borrar una tarea, etc.).
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  busyLabel,
  onConfirm,
  onCancel,
  danger = true,
  busy = false,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg p-6 max-w-sm">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={18} />
        </button>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-gray-700 bg-white border border-paper-line rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-white rounded-lg disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blueprint-600 hover:bg-blueprint-700'
            }`}
          >
            {busy ? (busyLabel ?? 'Procesando...') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
