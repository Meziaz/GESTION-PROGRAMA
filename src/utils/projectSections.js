import { Gauge, FileText, Network, Users2, BarChart3, Calculator, ShieldCheck, AlertOctagon, GitPullRequestArrow } from 'lucide-react';

// Lista de módulos del detalle de un proyecto. Única fuente de verdad: la usa App.jsx
// para dibujar los botones en el sidebar oscuro, y ProjectDetail.jsx para saber qué
// contenido mostrar según la sección activa.
export const PROJECT_SECTIONS = [
  { id: 'home', label: 'Resumen ejecutivo', icon: Gauge },
  { id: 'charter', label: 'Acta y Alcance', icon: FileText },
  { id: 'schedule', label: 'EDT y Cronograma', icon: Network },
  { id: 'team', label: 'Equipo y Recursos', icon: Users2 },
  { id: 'evm', label: 'Valor Ganado (EVM)', icon: BarChart3 },
  { id: 'economics', label: 'Evaluación Económica', icon: Calculator },
  { id: 'quality', label: 'Calidad', icon: ShieldCheck },
  { id: 'risks', label: 'Riesgos', icon: AlertOctagon },
  { id: 'changes', label: 'Control de Cambios', icon: GitPullRequestArrow },
];
