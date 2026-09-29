# 🔧 SOLUCIÓN: Errores en Dashboard y Configuración de PostgreSQL

## PROBLEMA 1: Error "latestMetrics.cpi.toFixed is not a function"

**Causa**: Cuando se guardaba un cut date, se guardaban `cpi` y `spi` como strings (usando `.toFixed(2)`). Al intentar hacer `.toFixed()` de nuevo sobre un string en el Dashboard, fallaba.

**Solución Aplicada**:
✅ Se cambió para guardar `cpi` y `spi` como números, no strings
✅ Se agregó conversión a número en Dashboard para mayor robustez
✅ Ahora `.toFixed()` se aplica solo cuando se muestra el valor

**Archivos Modificados**:
- `src/views/ProjectDetail.jsx` - Línea 204: Guardar números sin `.toFixed()`
- `src/views/Dashboard.jsx` - Línea 166: Convertir a número antes de usar `.toFixed()`

---

## PROBLEMA 2: Base de Datos PostgreSQL

**Antes**: Los proyectos solo se guardaban en localStorage (desaparecían al limpiar caché)
**Ahora**: La aplicación utiliza `localStorage` como fuente local. PostgreSQL y SQL Server están disponibles como backends opcionales mediante `server.js`; no se requiere una base de datos para usar la interfaz.

### PASO 1: Instalar PostgreSQL (si no está instalado)

1. Descargar PostgreSQL: https://www.postgresql.org/download/windows/
2. **Importante**: Usar contraseña `<password>` para el usuario `postgres`
3. Completar la instalación (todas las opciones por defecto están bien)

### PASO 2: Ejecutar Migraciones de Base de Datos

```bash
# En la terminal del proyecto
npm run db:init
```

Debería ver:
```
✅ Base de datos creada
✅ Conectado a base de datos: evm_projects_db
✅ Migraciones completadas exitosamente
📊 Tablas creadas: projects, team_members, wbs_phases, wbs_activities, cut_dates, ai_analyses
📈 Datos de ejemplo: 1 proyecto, 6 fases, 7 actividades, etc.
✅ Base de datos inicializada correctamente!
```

### PASO 3: Verificar Configuración .env.local

El archivo `.env.local` puede tener la configuración PostgreSQL opcional:
```
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/evm_projects_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=evm_projects_db
DB_USER=postgres
DB_PASSWORD=<password>
```

### PASO 4: Iniciar el Servidor Backend

```bash
# En una terminal
npm run server

# Debería mostrar:
# ✅ URL: http://localhost:3000
# ✅ Base de datos: evm_projects_db
# ✅ Gemini API: ✅ Configurada
```

### PASO 5: Iniciar la Aplicación Frontend (en otra terminal)

```bash
npm run dev

# Acceder a: http://localhost:5173
```

---

## ✅ VERIFICACIÓN

### Test 1: Dashboard sin errores
1. Ir a http://localhost:5173
2. Ver lista de proyectos
3. Volver del detail ✅ (sin errores blancos)

### Test 2: Guardar localmente
1. Crear un nuevo proyecto
2. Recargar la página
3. El proyecto debe seguir visible ✅

### Test 3: Backend PostgreSQL opcional
1. Configurar las variables de PostgreSQL en `.env.local`
2. Ejecutar `npm run db:init`
3. Iniciar `npm run server`
4. Verificar los endpoints de `/api/projects`

---

## 📊 Archivos Modificados en Esta Sesión

| Archivo | Cambios |
|---------|---------|
| `src/views/Dashboard.jsx` | Conversión de números, protección en `.toFixed()` |
| `src/views/ProjectDetail.jsx` | Guardar `cpi`/`spi` como números |
| `.env.local` | Agregadas credenciales PostgreSQL |
| `package.json` | Agregado script `npm run db:init` |
| `server.js` | Agregada conexión a PostgreSQL, endpoints CRUD |
| `initdb.js` | **NUEVO**: Script de inicialización de BD |
| `POSTGRES_SETUP.md` | **NUEVO**: Guía completa de PostgreSQL |

---

## 🚀 Workflow Completo

```bash
# 1. Una sola vez - Inicializar base de datos
npm run db:init

# 2. En dos terminales distintas (simultáneamente):
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev

# 3. Acceder a http://localhost:5173
```

---

## ⚠️ Si Algo Falla

### Error: "FATAL: password authentication failed"
→ Asegúrate que PostgreSQL está corriendo y usa contraseña `<password>`

### Error: "database does not exist"
→ Ejecuta `npm run db:init` de nuevo

### Error: "connection refused"
→ Verifica que:
   - PostgreSQL está corriendo: `Get-Service postgresql-x64-* | Select Status`
   - Si no: `Start-Service postgresql-x64-XX` (reemplaza XX con tu versión)

### Error: Dashboard blanco al volver
→ Abre Devtools (F12) y verifica la consola. Si dice error de `cpi`, limpia localStorage:
   ```javascript
   // En la consola del navegador
   localStorage.clear()
   location.reload()
   ```

---

## 📝 Notas

- La aplicación guarda los proyectos en `localStorage` por defecto
- PostgreSQL y SQL Server son integraciones opcionales del backend
- Las fechas de corte, EVM y el análisis de IA siguen funcionando sin base de datos

---

## 🎯 Próximos Pasos Opcionales

1. Integrar API en el frontend para guardar/cargar desde PostgreSQL
2. Agregar autenticación de usuarios
3. Agregar más análisis de riesgos en IA
4. Implementar dashboard con gráficos de portafolio

---

**Todos los cambios están listos. Solo necesitas:**
1. ✅ Instalar PostgreSQL con contraseña `<password>`
2. ✅ Ejecutar `npm run db:init`
3. ✅ Ejecutar `npm run server` (una terminal)
4. ✅ Ejecutar `npm run dev` (otra terminal)

¡Listo! 🎉
