import React, { useCallback, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
    setTimeout(() => setToast((current) => (current?.message === message ? null : current)), 3000);
  }, []);

  return [toast, showToast];
}

const STYLES = {
  success: { box: 'bg-green-50 border-green-500 text-green-800', Icon: CheckCircle, iconColor: 'text-green-600' },
  error: { box: 'bg-red-50 border-red-500 text-red-800', Icon: XCircle, iconColor: 'text-red-600' },
  warning: { box: 'bg-amber-50 border-amberline text-amber-900', Icon: AlertTriangle, iconColor: 'text-amberline' },
};

export function Toast({ toast }) {
  if (!toast) return null;
  const { box, Icon, iconColor } = STYLES[toast.type] ?? STYLES.success;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4">
      <div className={`flex items-center gap-2 rounded-lg border-l-4 px-4 py-3 text-sm font-medium shadow-lg ${box}`}>
        <Icon size={18} className={`shrink-0 ${iconColor}`} />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
