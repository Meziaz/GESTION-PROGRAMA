# PostgreSQL Setup & Database Initialization

## Prerequisites

1. **PostgreSQL instalado**: Descargar desde https://www.postgresql.org/download/
   - Windows: https://www.postgresql.org/download/windows/
   - Durante la instalación, usa contraseña: `<password>` para el usuario `postgres`

## Setup Steps

### 1. Verify PostgreSQL Installation
```bash
# Windows
psql --version

# Should output: psql (PostgreSQL) X.X.X
```

### 2. Check PostgreSQL Service is Running
```powershell
# Windows - Check if service is running
Get-Service postgresql-x64-* | Select-Object Name, Status

# Should show: Status = Running
```

### 3. Initialize Database with Migrations
```bash
# From project directory
npm run db:init

# or manually
node initdb.js
```

Expected output:
```
🔧 Inicializando base de datos PostgreSQL...

✅ Conectado a PostgreSQL (base de datos por defecto)

📦 Creando base de datos: evm_projects_db...
✅ Base de datos creada

✅ Conectado a base de datos: evm_projects_db

📝 Leyendo schema.sql...
🔄 Ejecutando migraciones...

✅ Migraciones completadas exitosamente

📊 Tablas creadas:
   ✓ ai_analyses
   ✓ cut_dates
   ✓ projects
   ✓ team_members
   ✓ wbs_activities
   ✓ wbs_phases

📈 Datos de ejemplo:
   ✓ Proyectos: 1
   ✓ Fases WBS: 6
   ✓ Actividades: 7
   ✓ Miembros de equipo: 3
   ✓ Fechas de corte: 3

✅ Base de datos inicializada correctamente!
```

### 4. Start Server
```bash
npm run server

# Output should show database connection info
```

### 5. Test Database Connection
```bash
# Check health endpoint
curl http://localhost:3000/health

# Response should show:
# {
#   "status": "ok",
#   "timestamp": "2025-06-07T...",
#   "apiKeyConfigured": true,
#   "databaseConfigured": true
# }
```

## Troubleshooting

### Error: Connection refused
- **Problema**: PostgreSQL no está corriendo
- **Solución**: 
  ```powershell
  # Windows - Start the service
  Start-Service postgresql-x64-XX
  ```

### Error: FATAL: password authentication failed
- **Problema**: Contraseña incorrecta
- **Solución**: Verificar que `.env.local` tiene:
  ```
  DB_PASSWORD=<password>
  ```

### Error: Database "evm_projects_db" does not exist
- **Problema**: Las migraciones no se ejecutaron
- **Solución**: Ejecutar `npm run db:init` nuevamente

### Error: relation "projects" does not exist
- **Problema**: Las tablas no se crearon correctamente
- **Solución**: 
  1. Eliminar la base de datos: `dropdb -U postgres evm_projects_db`
  2. Ejecutar: `npm run db:init`

## Manual Database Check

```bash
# Connect to database
psql -U postgres -d evm_projects_db

# List tables
\dt

# View projects
SELECT * FROM projects;

# View cut dates
SELECT * FROM cut_dates;

# Exit
\q
```

## Environment Variables

El archivo `.env.local` debe contener:

```env
GEMINI_API_KEY=your_api_key_here

# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/evm_projects_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=evm_projects_db
DB_USER=postgres
DB_PASSWORD=<password>
DB_POOLSIZE=10
```

## API Endpoints (with Database)

### Projects

```bash
# Get all projects
GET /api/projects

# Get single project
GET /api/projects/:id

# Create project
POST /api/projects
{
  "name": "Project Name",
  "description": "Description",
  "start_date": "2025-06-01",
  "end_date": "2025-12-31",
  "bac": 50000,
  "project_type": "Desarrollo de software",
  "contingency_percentage": 10,
  "estimation_technique": "Bottom-Up"
}

# Update project
PUT /api/projects/:id

# Delete project
DELETE /api/projects/:id
```

### Cut Dates

```bash
# Add cut date
POST /api/projects/:id/cut-dates
{
  "cut_date": "2025-06-15",
  "actual_percentage": 25,
  "actual_cost": 12500,
  "pv_value": 12500,
  "ev_value": 12500,
  "cpi": 1.0,
  "spi": 1.0
}

# Get cut dates
GET /api/projects/:id/cut-dates
```

## Next Steps

1. ✅ Ejecutar `npm run db:init`
2. ✅ Ejecutar `npm run server`
3. ✅ En otra terminal, ejecutar `npm run dev`
4. ✅ Acceder a http://localhost:5173
5. ✅ Crear y guardar proyectos (ahora en PostgreSQL)

Los proyectos ahora se guardarán automáticamente en PostgreSQL en lugar de solo en localStorage.
