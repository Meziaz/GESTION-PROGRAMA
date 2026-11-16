import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Ventana emergente reutilizada por toda la app para mostrar mensajes puntuales
// (errores de validación, de guardado, de conexión, o confirmaciones de éxito).
// A diferencia de ConfirmModal, solo tiene un botón: el usuario debe cerrarla para seguir.
const STYLES = {
  error: { title: 'Error', Icon: XCircle, iconColor: 'text-red-600' },
  warning: { title: 'Atención', Icon: AlertTriangle, iconColor: 'text-amberline' },
  success: { title: 'Listo', Icon: CheckCircle, iconColor: 'text-green-600' },
};

export function AlertModal({ type = 'error', title, message, closeLabel = 'Aceptar', onClose }) {
  if (!message) return null;
  const style = STYLES[type] ?? STYLES.error;
  const { Icon, iconColor } = style;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3">
          <Icon className={`shrink-0 mt-0.5 ${iconColor}`} size={24} />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{title ?? style.title}</h3>
            <p className="text-gray-700 text-sm">{message}</p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-white rounded-lg bg-blueprint-600 hover:bg-blueprint-700"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
