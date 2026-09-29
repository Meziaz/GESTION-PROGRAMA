# Gestor de Proyectos TI - Sistema EVM (Earned Value Management)

Aplicación React completa para la gestión de costos de proyectos TI con análisis EVM (Earned Value Management) y análisis IA.

## 🎯 Características Principales

### Vista 1: Dashboard Principal
- Resumen ejecutivo de proyectos
- Tarjetas con métricas: Total de proyectos, Proyectos en riesgo, Proyectos saludables
- Tabla completa de proyectos con CPI, SPI y estado
- Estados automáticos: Saludable (verde), Atención (amarillo), Crítico (rojo)

### Vista 2: Nuevo Proyecto
- Formulario completo con generación de WBS por IA
- Integración con Gemini para generar estructura de desglose de trabajo
- 6 fases estándar: Análisis, Diseño, Desarrollo, Pruebas, Implementación, Mantenimiento
- Gestión de equipo dinámico
- Estimación de contingencia

### Vista 3: Detalle del Proyecto
- Métricas EVM completas: BAC, PV, EV, AC
- Variaciones: CV, SV, CPI, SPI
- Pronósticos: EAC, ETC, VAC, TCPI
- Curva S en tiempo real con gráfico interactivo
- Fechas de corte para seguimiento
- Análisis IA con recomendaciones ejecutivas
- Gestión de WBS con progreso por actividad

## 🚀 Instalación

### Requisitos Previos
- Node.js 18+ y npm
- PostgreSQL 12+ (opcional)
- SQL Server (opcional)
- Clave API de Gemini configurada en el servidor

### Pasos de Instalación

1. **Clonar o descargar el proyecto**
```bash
cd "c:\Users\User\OneDrive - UNIVERSIDAD TÉCNICA DE AMBATO\Escritorio\QUINTO SEMESTRE\GESTION DE PROYECTOS TI\PROYECTO"
```

2. **Instalar dependencias de frontend**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear o editar `.env.local` en la raíz del proyecto:
```env
GEMINI_API_KEY=tu_clave_de_gemini
```

La clave se utiliza únicamente en `server.js`; no se expone al frontend.

4. **Crear base de datos PostgreSQL** (Opcional - para backend)

Si deseas usar PostgreSQL como fuente de verdad permanente:

```bash
psql -U postgres -d evm_projects_db -f schema.sql
```

Alternativamente, ejecuta el script línea por línea después de crear y seleccionar la base de datos objetivo.

5. **Configurar backend (opcional)**

Si quieres usar el backend de Express:

```bash
npm install express pg cors
```

Crear archivo `server.js` en la raíz del proyecto (ver sección de Server.js más abajo)

Luego ejecuta:
```bash
node server.js
```

## 🏃 Ejecución

### ⚠️ IMPORTANTE: Ejecutar DOS Servidores

#### **Terminal 1: Backend Server**

El backend actúa como proxy para las llamadas a Gemini API (necesario para evitar CORS):

```bash
npm run server
```

**Deberías ver:**
```
Servidor backend en puerto 3000
Manejo de llamadas a Gemini API
```

#### **Terminal 2: Frontend Development**

En una **nueva terminal** (sin cerrar Terminal 1):

```bash
npm run dev
```

**Deberías ver:**
```
VITE v5.4.21 ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Acceso

Abre en tu navegador: **http://localhost:5173**

### Build para Producción
```bash
npm run build
```

### Preview de Producción
```bash
npm run preview
```

### Ejecutar Backend (si está configurado)
```bash
npm run server
```

## 📊 Uso de la Aplicación

### 1. Crear un Nuevo Proyecto
1. Haz clic en "+ Nuevo Proyecto" en el dashboard
2. Completa la información básica del proyecto
3. Haz clic en "Generar WBS con IA"
4. Revisa y edita las fases y actividades generadas
5. Haz clic en "Guardar Proyecto"

### 2. Agregar Fechas de Corte
1. Abre un proyecto desde el dashboard
2. Haz clic en "Agregar Fecha de Corte"
3. Ingresa:
   - Fecha de corte
   - % completado real
   - Costo real gastado
4. El sistema calcula automáticamente PV, EV, CPI, SPI
5. Los gráficos se actualizan en tiempo real

### 3. Ver Análisis IA
1. En la vista de detalle del proyecto
2. Haz clic en "Analizar Proyecto"
3. Recibe un análisis con 4 secciones:
   - 🔍 Estado actual del proyecto
   - 📊 Interpretación de métricas clave
   - ⚠️ Riesgos identificados
   - ✅ Recomendaciones concretas

## 🔧 Configuración de Backend (Server.js)

Si deseas sincronizar con PostgreSQL, aquí está el código del servidor Express:

```javascript
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:<password>@localhost:5432/evm_projects_db',
});

app.use(cors());
app.use(express.json());

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET project by ID with all related data
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    const project = projectResult.rows[0];

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const teamResult = await pool.query('SELECT * FROM team_members WHERE project_id = $1', [req.params.id]);
    const phaseResult = await pool.query('SELECT * FROM wbs_phases WHERE project_id = $1 ORDER BY phase_order', [req.params.id]);
    const cutDateResult = await pool.query('SELECT * FROM cut_dates WHERE project_id = $1 ORDER BY cut_date DESC', [req.params.id]);

    project.team_members = teamResult.rows;
    project.wbs_phases = phaseResult.rows;
    project.cut_dates = cutDateResult.rows;

    // Get activities for each phase
    for (let phase of project.wbs_phases) {
      const actResult = await pool.query('SELECT * FROM wbs_activities WHERE phase_id = $1 ORDER BY id', [phase.id]);
      phase.activities = actResult.rows;
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create new project
app.post('/api/projects', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique } = req.body;

    const projectResult = await client.query(
      'INSERT INTO projects (name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, description, start_date, end_date, bac, project_type, contingency_percentage, estimation_technique]
    );

    const project = projectResult.rows[0];

    // Insert team members
    if (req.body.team_members && req.body.team_members.length > 0) {
      for (let member of req.body.team_members) {
        await client.query(
          'INSERT INTO team_members (project_id, member_name, member_role) VALUES ($1, $2, $3)',
          [project.id, member.member_name, member.member_role]
        );
      }
    }

    // Insert WBS phases and activities
    if (req.body.wbs_phases && req.body.wbs_phases.length > 0) {
      for (let phase of req.body.wbs_phases) {
        const phaseResult = await client.query(
          'INSERT INTO wbs_phases (project_id, phase_order, phase_name, percentage) VALUES ($1, $2, $3, $4) RETURNING *',
          [project.id, phase.phase_order, phase.phase_name, phase.percentage]
        );

        if (phase.activities && phase.activities.length > 0) {
          for (let activity of phase.activities) {
            await client.query(
              'INSERT INTO wbs_activities (phase_id, activity_name, deliverable, duration_days, cost, progress_percentage) VALUES ($1, $2, $3, $4, $5, $6)',
              [phaseResult.rows[0].id, activity.activity_name, activity.deliverable, activity.duration_days, activity.cost, activity.progress_percentage || 0]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json(project);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// PUT update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, description, status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST add cut date
app.post('/api/projects/:id/cut-dates', async (req, res) => {
  try {
    const { cut_date, actual_percentage, actual_cost, pv_value, ev_value } = req.body;

    const result = await pool.query(
      'INSERT INTO cut_dates (project_id, cut_date, actual_percentage, actual_cost, pv_value, ev_value) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.id, cut_date, actual_percentage, actual_cost, pv_value, ev_value]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding cut date:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST save AI analysis
app.post('/api/projects/:id/analyses', async (req, res) => {
  try {
    const { analysis_text, cpi_snapshot, spi_snapshot, eac_snapshot } = req.body;

    const result = await pool.query(
      'INSERT INTO ai_analyses (project_id, analysis_text, cpi_snapshot, spi_snapshot, eac_snapshot) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, analysis_text, cpi_snapshot, spi_snapshot, eac_snapshot]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 📚 Estructura del Proyecto

```
PROYECTO/
├── src/
│   ├── views/
│   │   ├── Dashboard.jsx          # Vista 1: Dashboard principal
│   │   ├── NewProjectForm.jsx     # Vista 2: Formulario nuevo proyecto
│   │   └── ProjectDetail.jsx      # Vista 3: Detalle y EVM
│   ├── utils/
│   │   ├── evmCalculations.js     # Cálculos EVM (CPI, SPI, EAC, etc)
│   │   ├── storageManager.js      # Gestión de localStorage
│   │   └── anthropicService.js    # Integración con API Gemini
│   ├── App.jsx                     # Componente principal
│   ├── main.jsx                    # Punto de entrada
│   └── index.css                   # Estilos Tailwind
├── schema.sql                      # Schema PostgreSQL
├── server.js                       # Backend Express (comentado en App.jsx)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── .env.local                      # Variables de entorno
```

## 📊 Fórmulas de Cálculo EVM

### Curva S (PV - Planned Value)
```
PV(t) = BAC / (1 + e^(-k*(t - midpoint)))
where:
  midpoint = total_days / 2
  k = 10 / total_days
```

### Métricas Básicas
- **EV = (% Completado / 100) * BAC**
- **CV = EV - AC** (Cost Variance)
- **SV = EV - PV** (Schedule Variance)

### Índices de Desempeño
- **CPI = EV / AC** (Cost Performance Index)
- **SPI = EV / PV** (Schedule Performance Index)

### Pronósticos
- **EAC = BAC / CPI** (Estimate At Completion)
- **ETC = EAC - AC** (Estimate To Complete)
- **VAC = BAC - EAC** (Variance At Completion)
- **TCPI = (BAC - EV) / (BAC - AC)** (To Complete Performance Index)

### Estado del Proyecto
- **Saludable**: CPI ≥ 1 Y SPI ≥ 1 (Verde)
- **Atención**: Algún índice entre 0.85-1 (Amarillo)
- **Crítico**: Algún índice < 0.85 (Rojo)

## 🎨 Diseño y Estilos

- **Framework CSS**: Tailwind CSS
- **Gráficos**: Recharts
- **Iconos**: Lucide React
- **Colores principales**:
  - Primario: Índigo (#4F46E5)
  - Éxito: Verde
  - Advertencia: Amarillo
  - Error: Rojo

## 🔐 Seguridad

- Las claves API se almacenan en `.env.local` (no commitear)
- La base de datos usa autenticación PostgreSQL
- CORS habilitado para desarrollo local
- Validación de datos en frontend

## 📦 Dependencias Principales

- **react**: 18.2.0 - Framework UI
- **recharts**: 2.10.3 - Gráficos
- **tailwindcss**: 3.3.6 - Estilos CSS
- **lucide-react**: 0.294.0 - Iconos
- **axios**: 1.6.0 - Cliente HTTP
- **express**: 4.18.2 - Backend (opcional)
- **pg**: 8.11.3 - Driver PostgreSQL
- **vite**: 5.0.8 - Build tool

## 🐛 Troubleshooting

### La API de Gemini no funciona
- Verifica que `GEMINI_API_KEY` esté correcta en `.env.local`
- Asegúrate que el servidor backend está ejecutándose: `npm run server`
- Comprueba que tienes conexión a internet
- Confirma que tu clave tiene permisos activos en la consola de Gemini

### Error CORS o "Failed to fetch"
- Necesitas ejecutar DOS terminales:
  - Terminal 1: `npm run server` (backend proxy)
  - Terminal 2: `npm run dev` (frontend)
- Verifica que el puerto 3000 no está siendo usado por otra aplicación

### Gráficos no se renderizan
- Verifica que Recharts esté instalado: `npm install recharts`
- Recarga la página del navegador (Ctrl+F5)

### Base de datos no conecta
- Verifica que PostgreSQL está ejecutándose: `psql -U postgres`
- Confirma la contraseña en la connection string
- Asegúrate que schema.sql fue ejecutado correctamente

### Los datos no persisten
- Verifica que localStorage esté habilitado en el navegador
- Abre Developer Tools > Application > Local Storage

## 📝 Licencia

Proyecto educativo - Gestión de Proyectos TI

## 👥 Autor

Desarrollado como aplicación de Gestión de Proyectos TI con análisis EVM e IA

---

**Nota**: La aplicación usa `window.localStorage` por defecto. Para usar PostgreSQL o SQL Server como fuente de verdad permanente, configura el backend Express y conecta las vistas a los endpoints de `server.js`.
