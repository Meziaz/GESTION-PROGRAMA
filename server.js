import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

// Cargar .env.local explícitamente
dotenv.config({ path: '.env.local' });

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// PostgreSQL Pool - Connection to database
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, max: parseInt(process.env.DB_POOLSIZE, 10) || 10 }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      max: parseInt(process.env.DB_POOLSIZE, 10) || 10,
    };
const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Error en pool de PostgreSQL:', err);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    databaseConfigured: Boolean(process.env.DATABASE_URL || process.env.DB_HOST)
  });
});

// ============================================================================
// DATABASE API ENDPOINTS
// ============================================================================

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.bac, p.project_type, p.status, p.created_at
      FROM projects p
      ORDER BY p.created_at DESC;
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo proyectos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single project with all details
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectResult.rows[0];
    
    // Get team members
    const teamResult = await pool.query('SELECT id, member_name, member_role FROM team_members WHERE project_id = $1', [id]);
    project.team_members = teamResult.rows;
    
    // Get cut dates
    const cutDatesResult = await pool.query(`
      SELECT * FROM cut_dates WHERE project_id = $1 ORDER BY cut_date DESC
    `, [id]);
    project.cut_dates = cutDatesResult.rows;
    
    res.json(project);
  } catch (error) {
    console.error('❌ Error obteniendo proyecto:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique } = req.body;
    
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique]
    );
    
    res.status(201).json(projectResult.rows[0]);
  } catch (error) {
    console.error('❌ Error creando proyecto:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique, status } = req.body;
    
    const result = await pool.query(
      `UPDATE projects 
       SET name = $1, description = $2, start_date = $3, end_date = $4, bac = $5, project_type = $6, contingency_percentage = $7, estimation_technique = $8, status = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error actualizando proyecto:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully', id });
  } catch (error) {
    console.error('❌ Error eliminando proyecto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD cut date
app.post('/api/projects/:id/cut-dates', async (req, res) => {
  try {
    const { id } = req.params;
    const { cut_date, actual_percentage, actual_cost, pv_value, ev_value, cpi, spi } = req.body;
    
    const result = await pool.query(
      `INSERT INTO cut_dates (project_id, cut_date, actual_percentage, actual_cost, pv_value, ev_value, cpi, spi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, cut_date, actual_percentage, actual_cost, pv_value, ev_value, cpi, spi]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error agregando fecha de corte:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET cut dates for project
app.get('/api/projects/:id/cut-dates', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM cut_dates WHERE project_id = $1 ORDER BY cut_date DESC`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo fechas de corte:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║     EVM Projects Manager - Servidor iniciado correctamente        ║
╠════════════════════════════════════════════════════════════════════╣
║  URL:              http://localhost:${PORT}                              ║
║  Health:           http://localhost:${PORT}/health                        ║
║  API Projects:     http://localhost:${PORT}/api/projects                  ║
╠════════════════════════════════════════════════════════════════════╣
║  Base de datos:    ${(process.env.DB_NAME || 'No configurada').padEnd(50)}║
║  Host DB:          ${(process.env.DB_HOST || 'localhost').padEnd(47)}║
╚════════════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async (signal) => {
  console.log(`Cerrando servidor por ${signal}.`);
  await pool.end().catch(() => undefined);
  server.close(() => process.exit(0));
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
