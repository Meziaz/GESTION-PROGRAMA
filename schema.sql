-- Create Database and Schema for EVM Projects Manager
-- Execute against the target PostgreSQL database with: psql -U postgres -d evm_projects_db -f schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Elimina el esquema relacional anterior (sin uso: el frontend nunca llegó a
-- consumirlo) para reemplazarlo por la tabla única basada en JSONB de abajo.
DROP TABLE IF EXISTS ai_analyses CASCADE;
DROP TABLE IF EXISTS wbs_activity_predecessors CASCADE;
DROP TABLE IF EXISTS wbs_activities CASCADE;
DROP TABLE IF EXISTS wbs_phases CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS cut_dates CASCADE;
DROP VIEW IF EXISTS project_summary;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'name'
    ) THEN
        DROP TABLE projects CASCADE;
    END IF;
END $$;

-- Projects table
-- El proyecto completo (fases WBS, actividades, equipo, fechas de corte, etc.)
-- se guarda como JSON dentro de la columna `data`, para que todos los usuarios
-- que abran la aplicación vean y editen los mismos datos desde PostgreSQL.
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Fin del esquema
