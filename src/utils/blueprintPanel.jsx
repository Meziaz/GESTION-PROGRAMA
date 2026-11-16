import React, { useState, useEffect } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertModal } from './AlertModal';

const emptyBlueprint = () => ({
  proposito: '',
  objetivos: '',
  incluye: '',
  excluye: '',
  entregables: '',
  stack: '',
  supuestos: '',
  restricciones: '',
  hitos: '',
  criterios: '',
});

const textareaClass = 'w-full px-3 py-2 bg-white border border-paper-line rounded-lg text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';

export function BlueprintPanel({ project, onSave }) {
  const [blueprint, setBlueprint] = useState({ ...emptyBlueprint(), ...(project.blueprint ?? {}) });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setBlueprint({ ...emptyBlueprint(), ...(project.blueprint ?? {}) });
  }, [project.id]);

  const field = (key) => ({
    value: blueprint[key],
    onChange: (e) => setBlueprint((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...project, blueprint });
      setAlert({ type: 'success', message: 'Blueprint guardado correctamente.' });
    } catch (saveError) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${saveError.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Blueprint del proyecto (Project Charter One-Pager)</h3>
        <p className="text-sm text-gray-600 mb-4">Autoriza el proyecto: problema, objetivos, alcance y entregables de alto nivel.</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Propósito</label>
          <textarea rows={3} placeholder="¿Qué problema resuelve o qué capacidad debe existir al terminar el proyecto?" className={textareaClass} {...field('proposito')} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Objetivos (medibles)</label>
          <textarea rows={3} placeholder="Ej: Reducir el tiempo de atención en un 40%..." className={textareaClass} {...field('objetivos')} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alcance incluido</label>
            <textarea rows={4} className={textareaClass} {...field('incluye')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exclusiones</label>
            <textarea rows={4} className={textareaClass} {...field('excluye')} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Entregables (de alto nivel)</label>
          <textarea rows={3} placeholder="Ej: Módulo de facturación, Dashboard BI..." className={textareaClass} {...field('entregables')} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Detalles técnicos adicionales</h3>
            <p className="text-sm text-gray-600 mt-1">Stack, supuestos, restricciones, hitos macro y criterios de éxito (opcional).</p>
          </div>
          {showDetails ? <ChevronUp className="text-gray-600 shrink-0" size={20} /> : <ChevronDown className="text-gray-600 shrink-0" size={20} />}
        </button>

        {showDetails && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Stack / arquitectura</label>
              <textarea rows={3} placeholder="Base de datos, frontend, hosting, integraciones..." className={textareaClass} {...field('stack')} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supuestos</label>
                <textarea rows={3} className={textareaClass} {...field('supuestos')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Restricciones (presupuesto, plazos, recursos)</label>
                <textarea rows={3} className={textareaClass} {...field('restricciones')} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Hitos macro</label>
              <textarea rows={3} placeholder="Ej: Semana 2: diagnóstico. Semana 6: piloto. Semana 12: implementación final." className={textareaClass} {...field('hitos')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Criterios de éxito (métricas)</label>
              <textarea rows={3} placeholder="Ej: reducción del tiempo en un 40%, 0 errores críticos, 100% trazabilidad..." className={textareaClass} {...field('criterios')} />
            </div>
          </div>
        )}
      </div>

      <AlertModal type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blueprint-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blueprint-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Blueprint'}
        </button>
      </div>
    </div>
  );
}
