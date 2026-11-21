import React, { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';
import Dashboard from './views/Dashboard';
import NewProjectForm from './views/NewProjectForm';
import ProjectDetail from './views/ProjectDetail';
import { initializeStorage } from './utils/storageManager';
import { PROJECT_SECTIONS } from './utils/projectSections';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    initializeStorage();
    setStorageReady(true);
  }, []);

  const handleViewChange = (newView, projectId = null, message = null) => {
    setView(newView);
    if (projectId) {
      setSelectedProjectId(projectId);
      setActiveSection('home');
    }
    setEditMode(false);
    if (message) setPendingMessage(message);
  };

  const handleEditProject = (projectId) => {
    setSelectedProjectId(projectId);
    setEditMode(true);
    setView('new-project');
  };

  if (!storageReady) {
    return <div className="flex min-h-screen items-center justify-center text-gray-600">Cargando proyectos...</div>;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            onNewProject={() => handleViewChange('new-project')}
            onViewDetail={(projectId) => handleViewChange('detail', projectId)}
            onEditProject={handleEditProject}
            pendingMessage={pendingMessage}
            onPendingMessageShown={() => setPendingMessage(null)}
          />
        );
      case 'new-project':
        return (
          <NewProjectForm
            projectId={editMode ? selectedProjectId : null}
            editMode={editMode}
            onSave={(message) => handleViewChange('dashboard', null, message)}
            onCancel={() => handleViewChange('dashboard')}
          />
        );
      case 'detail':
        return (
          <ProjectDetail
            projectId={selectedProjectId}
            onBack={() => handleViewChange('dashboard')}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        );
      default:
        return null;
    }
  };

  const titles = {
    dashboard: 'Proyectos',
    'new-project': editMode ? 'Editar Proyecto' : 'Nuevo Proyecto',
    detail: 'Detalle del Proyecto',
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 z-[100] flex h-screen w-[250px] flex-col bg-navy text-white">
        <div className="border-b border-white/10 p-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={24} />
            <div>
              <div className="text-sm font-bold leading-tight">Gestor de Proyectos TI</div>
              <div className="text-xs text-white/50">EVM Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto p-2">
          <p className="mb-1 px-2 text-xs uppercase tracking-wide text-white/50">Módulos</p>
          <button
            type="button"
            onClick={() => handleViewChange('dashboard')}
            className={`mb-1 flex w-full items-center gap-2 rounded p-2 text-left text-white transition-colors ${
              view === 'dashboard' ? 'bg-blueprint-600' : 'hover:bg-white/10'
            }`}
          >
            📁 <span>Proyectos</span>
          </button>

          {view === 'detail' && (
            <>
              <hr className="my-2 border-white/10" />
              <p className="mb-1 px-2 text-xs uppercase tracking-wide text-white/50">Proyecto</p>
              {PROJECT_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`mb-1 flex w-full items-center gap-2 rounded p-2 text-left text-sm text-white transition-colors ${
                      isActive ? 'bg-blueprint-600' : 'hover:bg-white/10'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={16} />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="ml-[250px] flex-1">
        <div className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
          <h6 className="mb-0 font-semibold text-gray-600">{titles[view]}</h6>
        </div>
        <div className="min-h-[calc(100vh-60px)] p-4">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
