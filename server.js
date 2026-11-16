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
// El proyecto completo (WBS, equipo, fechas de corte, etc.) viaja tal cual
// entre el frontend y la columna `data` (JSONB) de la tabla `projects`.
// ============================================================================

const projectRowToJson = (row) => ({
  id: row.id,
  ...row.data,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, data, created_at, updated_at FROM projects ORDER BY created_at DESC');
    res.json(result.rows.map(projectRowToJson));
  } catch (error) {
    console.error('❌ Error obteniendo proyectos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, data, created_at, updated_at FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    res.json(projectRowToJson(result.rows[0]));
  } catch (error) {
    console.error('❌ Error obteniendo proyecto:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE project
app.post('/api/projects', async (req, res) => {
  try {
    const { id: _ignoredId, created_at: _ignoredCreatedAt, updated_at: _ignoredUpdatedAt, ...data } = req.body ?? {};
    const result = await pool.query(
      'INSERT INTO projects (data) VALUES ($1) RETURNING id, data, created_at, updated_at',
      [data]
    );
    res.status(201).json(projectRowToJson(result.rows[0]));
  } catch (error) {
    console.error('❌ Error creando proyecto:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE project (reemplaza el proyecto completo)
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id: _ignoredId, created_at: _ignoredCreatedAt, updated_at: _ignoredUpdatedAt, ...data } = req.body ?? {};
    const result = await pool.query(
      'UPDATE projects SET data = $1, updated_at = NOW() WHERE id = $2 RETURNING id, data, created_at, updated_at',
      [data, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    res.json(projectRowToJson(result.rows[0]));
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
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    res.json({ message: 'Proyecto eliminado correctamente.', id });
  } catch (error) {
    console.error('❌ Error eliminando proyecto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD cut date (agrega una fecha de corte dentro del JSON del proyecto)
app.post('/api/projects/:id/cut-dates', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT data FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    const project = result.rows[0].data ?? {};
    const cutDates = Array.isArray(project.cut_dates) ? project.cut_dates : [];
    if (cutDates.some((item) => item.cut_date === req.body?.cut_date)) {
      return res.status(400).json({ error: 'Ya existe una fecha de corte para este proyecto.' });
    }
    const savedCutDate = { ...req.body, id: `cd-${Date.now()}`, created_at: new Date().toISOString() };
    const nextCutDates = [...cutDates, savedCutDate].sort((a, b) => String(a.cut_date).localeCompare(String(b.cut_date)));
    const nextData = { ...project, cut_dates: nextCutDates };
    await pool.query('UPDATE projects SET data = $1, updated_at = NOW() WHERE id = $2', [nextData, id]);
    res.status(201).json(savedCutDate);
  } catch (error) {
    console.error('❌ Error agregando fecha de corte:', error);
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
