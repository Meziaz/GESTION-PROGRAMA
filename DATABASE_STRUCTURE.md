## 📊 ESTRUCTURA DE BASES DE DATOS

Tu aplicación tiene **DOS capas de persistencia**:

### 1️⃣ **CAPA 1: localStorage (Frontend) - ACTIVA AHORA** ✅

**Ubicación:** Browser → Developer Tools → Application → Local Storage
**Carve:** `evm_projects`
**Contenido:** Todos tus proyectos, fechas de corte, WBS, equipos

**Ventajas:**
- ✅ Funciona SIN necesidad de configurar ninguna base de datos
- ✅ Los datos persisten en el navegador
- ✅ No requiere servidor de base de datos externo
- ✅ Perfecto para desarrollo local

**Estado:** YA ESTÁ EN USO - Los 2 proyectos de ejemplo están aquí

---

### 2️⃣ **CAPA 2: PostgreSQL (Servidor) - OPCIONAL** 

**Ubicación:** `/schema.sql` (Si quieres usarla)
**Uso:** Sincronización con un servidor backend profesional
**Ventajas:**
- Múltiples usuarios simultáneamente
- Backup automático
- Escalabilidad en producción

**Estado:** NO NECESARIA PARA DESARROLLO LOCAL

---

## 🔧 CÓMO EJECUTAR CORRECTAMENTE

### ✅ FORMA CORRECTA:

**Abre DOS Terminales:**

#### **Terminal 1 - Backend Server:**
```bash
npm run server
```

**Deberías ver:**
```
╔════════════════════════════════════════════╗
║  🚀 SERVIDOR BACKEND INICIADO EXITOSAMENTE 🚀    ║
╠════════════════════════════════════════════╣
║  Puerto: 3000                                ║
║  Health Check: http://localhost:3000/health   ║
╠════════════════════════════════════════════╣
║  ✅ GEMINI_API_KEY está configurada             ║
```

#### **Terminal 2 - Frontend:**
```bash
npm run dev
```

**Deberías ver:**
```
VITE v5.4.21 ready in xxx ms
➜  Local:   http://localhost:5173/
```

#### **Navegador:**
```
http://localhost:5173
```

---

## ❌ PROBLEMAS COMUNES

### ❌ Error: "Failed to fetch" al generar WBS

**Causas:**
1. ❌ Escribiste `npm run service` en lugar de `npm run server`
2. ❌ La Terminal 1 (servidor) no está ejecutándose
3. ❌ GEMINI_API_KEY no está en `.env.local`

**Solución:**
```bash
# Terminal 1 - IMPORTANTE: server, NO service
npm run server

# Terminal 2
npm run dev
```

---

### ❌ "GEMINI_API_KEY no configurada"

**Solución:**
1. Abre `.env.local`
2. Verifica que `GEMINI_API_KEY` tenga tu clave real (no el placeholder)
3. Reinicia Terminal 1: `npm run server`

```
GEMINI_API_KEY=tu_clave_de_gemini
```

---

## 🧪 PRUEBA RÁPIDA DEL SERVIDOR

Una vez que esté ejecutándose el servidor, puedes verificar:

```bash
curl http://localhost:3000/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-06T...",
  "apiKeyConfigured": true
}
```

---

## 📁 ARCHIVOS DE DATOS

### localStorage (Navegador)
```
Browser Storage
├── Local Storage
    └── evm_projects (contiene tus proyectos en JSON)
```

### PostgreSQL (Opcional - Para Producción)
```
DATABASE: evm_projects_db
├── projects
├── team_members
├── wbs_phases
├── wbs_activities
├── cut_dates
└── ai_analyses
```

---

## 🎯 FLUJO CORRECTO DE EJECUCIÓN

```
1. Abre Terminal 1
2. Ejecuta: npm run server
   ↓
   Servidor en Puerto 3000 ✅
   
3. Abre Terminal 2 (NUEVA)
4. Ejecuta: npm run dev
   ↓
   Frontend en Puerto 5173 ✅
   
5. Abre navegador: http://localhost:5173
   ↓
   App lista ✅
   
6. Haz clic en "+ Nuevo Proyecto"
7. Completa los datos
8. Haz clic en "Generar WBS con IA"
   ↓
   Frontend → http://localhost:3000/api/generate-wbs
   ↓
   Servidor → API de Gemini
   ↓
   Respuesta → Frontend → ¡WBS generada! ✅
```

---

## 💾 DÓNDE SE GUARDAN LOS DATOS

✅ **Automáticamente en localStorage** cuando:
- Creas un nuevo proyecto
- Agregas una fecha de corte
- Editas actividades del WBS

Los datos persisten en tu navegador incluso si cierras la app.

---

## 🚀 COMANDOS ÚTILES

| Comando | Función | Terminal |
|---------|---------|----------|
| `npm run server` | Backend (IA proxy) | 1 |
| `npm run dev` | Frontend (React) | 2 |
| `npm run build` | Build producción | Cualquiera |
| `npm install` | Instalar dependencias | Cualquiera |
| `curl http://localhost:3000/health` | Verificar servidor | Cualquiera |

---

## ✅ CHECKLIST ANTES DE GENERAR WBS

- [ ] `.env.local` tiene tu GEMINI_API_KEY real
- [ ] Terminal 1: `npm run server` ejecutándose
- [ ] Terminal 2: `npm run dev` ejecutándose
- [ ] Navegador: http://localhost:5173 abierto
- [ ] Servidor responde: `curl http://localhost:3000/health`
- [ ] Proyecto tiene nombre y descripción
- [ ] Proyecto tiene al menos 1 miembro de equipo

Si todo está ✅, haz clic en "Generar WBS con IA"

---

## 🎓 RESUMEN FINAL

Tu aplicación:
- **Usa localStorage** para guardar datos (sin necesidad de BD externa)
- **Usa un servidor Express** como proxy para llamadas a Gemini
- **Tiene PostgreSQL opcional** en schema.sql para producción
- **Funciona completamente sin configurar nada más**

Solo necesitas:
1. Tu API key de Gemini
2. Dos terminales ejecutando `npm run server` y `npm run dev`
3. ¡Listo! 🚀
