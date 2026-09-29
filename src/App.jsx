import React, { useState, useEffect } from 'react';
import Dashboard from './views/Dashboard';
import NewProjectForm from './views/NewProjectForm';
import ProjectDetail from './views/ProjectDetail';
import { initializeStorage } from './utils/storageManager';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    initializeStorage();
    setStorageReady(true);
  }, []);

  const handleViewChange = (newView, projectId = null) => {
    setView(newView);
    if (projectId) {
      setSelectedProjectId(projectId);
    }
    setEditMode(false);
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
          />
        );
      case 'new-project':
        return (
          <NewProjectForm
            projectId={editMode ? selectedProjectId : null}
            editMode={editMode}
            onSave={() => handleViewChange('dashboard')}
            onCancel={() => handleViewChange('dashboard')}
          />
        );
      case 'detail':
        return (
          <ProjectDetail projectId={selectedProjectId} onBack={() => handleViewChange('dashboard')} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">{renderView()}</div>
    </div>
  );
}
