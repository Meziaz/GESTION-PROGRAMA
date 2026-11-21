# Gestor de Proyectos TI — Sistema EVM

Aplicación de gestión de proyectos de TI con Valor Ganado (EVM), riesgos, calidad,
cronograma (CPM/PERT), evaluación económica, control de cambios y un asistente de
IA que analiza el estado del proyecto y sugiere qué hacer para que sea viable.

Hecha con **React + Vite** (frontend) y **Express + PostgreSQL** (backend). Los
datos se guardan en PostgreSQL para que todos los que abran la app vean los mismos
proyectos, no cada quien en su navegador.

## Requisitos

- **Node.js 18 o superior** (probado con Node 20 y 24) y npm.
- **PostgreSQL 12 o superior**, instalado y corriendo localmente (o accesible por red).
- Una clave de **Anthropic (Claude)** — *opcional*, solo para el botón "Analizar con IA"
  del Resumen ejecutivo. Sin ella, el resto de la app funciona igual.

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd PROYECTO
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a un archivo nuevo llamado **`.env.local`** (con ese nombre
exacto, no `.env`) y completa tus datos reales:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```ini
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/evm_projects_db

# Opcional — solo para el Asistente de IA
ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
```

Si no usas `DATABASE_URL`, puedes usar en su lugar `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER` y `DB_PASSWORD` por separado (están comentados en `.env.example`).

### 3. Crear la base de datos y sus tablas

Con PostgreSQL corriendo, este comando crea la base de datos (si no existe) y las
tablas automáticamente — no hace falta `createdb` manual ni correr `schema.sql` a mano:

```bash
npm run db:init
```

Si todo sale bien verás `✅ Base de datos inicializada correctamente!`.

### 4. Levantar la aplicación (dos procesos, dos terminales)

La app necesita **dos servidores corriendo al mismo tiempo**: el backend
(Express, que habla con PostgreSQL) y el frontend (Vite). Si solo levantas uno,
el dashboard se ve vacío.

**Terminal 1 — backend:**
```bash
npm run server
```
Deberías ver un banner confirmando el puerto (por defecto `3000`) y si la base
de datos y la IA quedaron configuradas.

**Terminal 2 — frontend:**
```bash
npm run dev
```
Abre la URL que imprime Vite — normalmente **http://localhost:5173**.

### 5. Verificar que todo funciona

- Abre `http://localhost:5173` → deberías ver el Dashboard con la lista de proyectos (vacía la primera vez).
- Abre `http://localhost:3000/health` en el navegador → debe responder algo como:
  ```json
  {"status":"ok","databaseConfigured":true,"aiConfigured":true}
  ```
  Si `databaseConfigured` sale en `false`, revisa `DATABASE_URL`/`DB_*` en `.env.local`.
  Si `aiConfigured` sale en `false`, es porque no pusiste `ANTHROPIC_API_KEY` — no es un error, solo desactiva el botón de IA.

## Módulos de la aplicación

Dentro de cada proyecto, en este orden (coincide con el orden en que se dicta la
materia: acta → EDT/cronograma → equipo → costos/EVM → evaluación económica →
calidad → riesgos → control de cambios):

1. **Resumen ejecutivo** — tablero con semáforos (CPI/SPI, riesgos, calidad) y el Asistente de IA.
2. **Acta y Alcance** — diagnóstico, blueprint y acta de constitución.
3. **EDT y Cronograma** — estructura de desglose, diagrama de Gantt, ruta crítica (CPM/PERT con estimación de tres puntos), dependencias SS/FF/SF con retraso/adelanto, y detección de sobreasignación de recursos.
4. **Equipo y Recursos** — matriz RACI y costeo (factor prestacional, recargo IVA, reserva de contingencia vs. reserva de gestión).
5. **Valor Ganado (EVM)** — PV/EV/AC, CV/SV, CPI/SPI, EAC (optimista/realista/pesimista/excepcional), ETC, VAC, TCPI, pronóstico de costo por regresión lineal y Curva S.
6. **Evaluación Económica** — TCO, ROI, periodo de recuperación (payback).
7. **Calidad** — auditorías QA/QC, Pareto de defectos, DRE, MTBF, Costo de Calidad (CoQ).
8. **Riesgos** — matriz Probabilidad × Impacto (5×5), EMV, RBS, árbol de decisión.
9. **Control de Cambios** — bitácora de solicitudes; el presupuesto (BAC) no se mueve hasta que un cambio se aprueba y se aplica explícitamente.

También hay un **Dashboard general** (fuera de cualquier proyecto) con comparación
de CPI/SPI entre todos los proyectos del portafolio.

## Problemas comunes

- **"No se pudo conectar con el servidor" en el Dashboard** → el backend (`npm run server`) no está corriendo, o PostgreSQL no está levantado.
- **`npm run server` falla con `EADDRINUSE`** → ya hay algo usando el puerto 3000. Ciérralo o cambia `PORT` en `.env.local`.
- **`npm run db:init` falla al conectar** → revisa que PostgreSQL esté corriendo y que el usuario/password en `.env.local` sean correctos.
- **El botón "Analizar con IA" muestra un error de crédito** → tu cuenta de Anthropic no tiene saldo. Entra a console.anthropic.com → Plans & Billing → agrega crédito. No es un bug de la app.

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el frontend (Vite) en modo desarrollo |
| `npm run server` | Levanta el backend (Express + PostgreSQL) |
| `npm run db:init` | Crea la base de datos y las tablas |
| `npm run build` | Compila el frontend para producción (carpeta `dist/`) |
| `npm run preview` | Sirve localmente el build de producción |
