import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { AlertModal } from './AlertModal';

const emptyProblem = () => ({
  central: '',
  causas: [''],
  efectos: [''],
  pmp: { que: '', porque: '', quienes: '', consecuencia: '', urgencia: '' },
});
const emptyJustification = () => ({ pertinencia: '', urgencia: '', viabilidad: '', impacto: '' });

const textareaClass = 'w-full px-3 py-2 bg-white border border-paper-line rounded-lg text-sm focus:ring-2 focus:ring-blueprint-600 focus:border-transparent outline-none';

const pmpQuestions = [
  { key: 'que', label: '¿Qué está ocurriendo?' },
  { key: 'porque', label: '¿Por qué es un problema?' },
  { key: 'quienes', label: '¿A quiénes afecta? (stakeholders)' },
  { key: 'consecuencia', label: '¿Cuál es la consecuencia principal?' },
  { key: 'urgencia', label: '¿Qué tan urgente es resolverlo?' },
];

const justificationFields = [
  { key: 'pertinencia', label: 'Pertinencia — ¿por qué este problema importa?' },
  { key: 'urgencia', label: 'Urgencia — ¿qué pasa si no se actúa?' },
  { key: 'viabilidad', label: 'Viabilidad — ¿es posible ejecutarlo?' },
  { key: 'impacto', label: 'Impacto — ¿qué mejora se espera?' },
];

export function DiagnosticoPanel({ project, onSave }) {
  const [problem, setProblem] = useState(project.problem ?? emptyProblem());
  const [justification, setJustification] = useState(project.justification ?? emptyJustification());
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setProblem(project.problem ?? emptyProblem());
    setJustification(project.justification ?? emptyJustification());
  }, [project.id]);

  const updateListItem = (field, index, value) => {
    setProblem((prev) => ({ ...prev, [field]: prev[field].map((item, i) => (i === index ? value : item)) }));
  };
  const addListItem = (field) => setProblem((prev) => ({ ...prev, [field]: [...prev[field], ''] }));
  const removeListItem = (field, index) => setProblem((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...project, problem, justification });
      setAlert({ type: 'success', message: 'Diagnóstico y justificación guardados correctamente.' });
    } catch (saveError) {
      setAlert({ type: 'error', message: `No se pudo guardar: ${saveError.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Árbol de problemas</h3>
        <p className="text-sm text-gray-600 mb-4">Define el problema central y sus causas y efectos. No incluyas la solución ni tecnologías aquí.</p>

        <label className="block text-sm font-medium text-gray-700 mb-2">Problema central</label>
        <textarea
          value={problem.central}
          onChange={(e) => setProblem((prev) => ({ ...prev, central: e.target.value }))}
          rows={3}
          placeholder="Ej: En [organización], el [proceso] se realiza de forma [manual/ineficiente], lo que genera [consecuencia medible]."
          className={`${textareaClass} mb-6`}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-blueprint-700 mb-2">Causas</h4>
            {problem.causas.map((causa, index) => (
              <div key={`causa-${index}`} className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={causa}
                  onChange={(e) => updateListItem('causas', index, e.target.value)}
                  placeholder={`Causa ${index + 1}`}
                  className="flex-1 rounded-lg shadow-sm border-0 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blueprint-600"
                />
                <button type="button" onClick={() => removeListItem('causas', index)} className="text-red-600 hover:text-red-800" aria-label={`Quitar causa ${index + 1}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addListItem('causas')} className="mt-1 flex items-center gap-1 text-sm text-blueprint-600 hover:underline">
              <Plus size={14} /> Agregar causa
            </button>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blueprint-700 mb-2">Efectos</h4>
            {problem.efectos.map((efecto, index) => (
              <div key={`efecto-${index}`} className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={efecto}
                  onChange={(e) => updateListItem('efectos', index, e.target.value)}
                  placeholder={`Efecto ${index + 1}`}
                  className="flex-1 rounded-lg shadow-sm border-0 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blueprint-600"
                />
                <button type="button" onClick={() => removeListItem('efectos', index)} className="text-red-600 hover:text-red-800" aria-label={`Quitar efecto ${index + 1}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addListItem('efectos')} className="mt-1 flex items-center gap-1 text-sm text-blueprint-600 hover:underline">
              <Plus size={14} /> Agregar efecto
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Técnica de las 5 preguntas clave</h3>
        <p className="text-sm text-gray-600 mb-4">Ayuda a redactar el problema de forma específica y comprobable.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pmpQuestions.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
              <textarea
                value={problem.pmp[key]}
                onChange={(e) => setProblem((prev) => ({ ...prev, pmp: { ...prev.pmp, [key]: e.target.value } }))}
                rows={2}
                className={textareaClass}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Justificación</h3>
        <p className="text-sm text-gray-600 mb-4">Pertinencia, urgencia, viabilidad e impacto del proyecto.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {justificationFields.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
              <textarea
                value={justification[key]}
                onChange={(e) => setJustification((prev) => ({ ...prev, [key]: e.target.value }))}
                rows={3}
                className={textareaClass}
              />
            </div>
          ))}
        </div>
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
          {saving ? 'Guardando...' : 'Guardar Diagnóstico y Justificación'}
        </button>
      </div>
    </div>
  );
}
