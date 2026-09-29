-- Create Database and Schema for EVM Projects Manager
-- Execute against the target PostgreSQL database with: psql -U postgres -d evm_projects_db -f schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    bac NUMERIC(15,2),
    project_type VARCHAR(100),
    contingency_percentage NUMERIC(5,2) DEFAULT 10,
    estimation_technique VARCHAR(100),
    status VARCHAR(50) DEFAULT 'saludable',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    member_name VARCHAR(255),
    member_role VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- WBS Phases table
CREATE TABLE IF NOT EXISTS wbs_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_order INTEGER,
    phase_name VARCHAR(100),
    percentage NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- WBS Activities table
CREATE TABLE IF NOT EXISTS wbs_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID NOT NULL REFERENCES wbs_phases(id) ON DELETE CASCADE,
    activity_name VARCHAR(255),
    deliverable TEXT,
    optimal_time NUMERIC(10,2),
    estimated_time NUMERIC(10,2),
    pessimistic_time NUMERIC(10,2),
    duration_days NUMERIC(10,2),
    cost NUMERIC(15,2),
    progress_percentage NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE wbs_activities
    ADD COLUMN IF NOT EXISTS optimal_time NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS estimated_time NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS pessimistic_time NUMERIC(10,2);
ALTER TABLE wbs_activities ALTER COLUMN duration_days TYPE NUMERIC(10,2);

CREATE TABLE IF NOT EXISTS wbs_activity_predecessors (
    activity_id UUID NOT NULL REFERENCES wbs_activities(id) ON DELETE CASCADE,
    predecessor_id UUID NOT NULL REFERENCES wbs_activities(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, predecessor_id),
    CHECK (activity_id <> predecessor_id)
);

-- Cut Dates table (Earned Value Management snapshots)
CREATE TABLE IF NOT EXISTS cut_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cut_date DATE NOT NULL,
    actual_percentage NUMERIC(5,2),
    actual_cost NUMERIC(15,2),
    pv_value NUMERIC(15,2),
    ev_value NUMERIC(15,2),
    cpi NUMERIC(8,4),
    spi NUMERIC(8,4),
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Analyses table
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    analysis_text TEXT,
    generated_at TIMESTAMP DEFAULT NOW(),
    cpi_snapshot NUMERIC(8,4),
    spi_snapshot NUMERIC(8,4),
    eac_snapshot NUMERIC(15,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_cut_dates_project ON cut_dates(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_activities_phase ON wbs_activities(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_predecessors_activity ON wbs_activity_predecessors(activity_id);
CREATE INDEX IF NOT EXISTS idx_wbs_predecessors_predecessor ON wbs_activity_predecessors(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_team_members_project ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_phases_project ON wbs_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_project ON ai_analyses(project_id);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects table
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Datos de ejemplo opcionales (comentado)
-- Para agregar datos de prueba, ejecutar después de la inicialización:
/*
INSERT INTO projects (name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique, status)
VALUES (
    'Desarrollo Sistema CRM',
    'Implementación de plataforma CRM para gestión de clientes',
    '2024-06-01',
    '2024-12-31',
    50000.00,
    'Desarrollo de software',
    10,
    'Bottom-Up',
    'saludable'
);
*/

-- Create views for useful queries
CREATE OR REPLACE VIEW project_summary AS
SELECT
    p.id,
    p.name,
    p.bac,
    COUNT(DISTINCT cd.id) as cut_date_count,
    MAX(cd.cut_date) as latest_cut_date,
    (SELECT actual_percentage FROM cut_dates WHERE project_id = p.id ORDER BY cut_date DESC LIMIT 1) as current_completion
FROM projects p
LEFT JOIN cut_dates cd ON p.id = cd.project_id
GROUP BY p.id, p.name, p.bac;

-- Fin del esquema
