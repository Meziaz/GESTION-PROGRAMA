## 🔍 VERIFICACIÓN RÁPIDA DE CONFIGURACIÓN

### ✅ PASO 1: Verificar que npm está instalado

```bash
npm --version
```

**Resultado esperado:** `v18.0.0` (o superior)

---

### ✅ PASO 2: Verificar que las dependencias están instaladas

```bash
npm list express cors dotenv
```

**Resultado esperado:**
```
├── cors@2.8.5
├── dotenv@16.x.x
└── express@4.18.2
```

---

### ✅ PASO 3: Verificar el archivo .env.local

```bash
# En Windows
type .env.local

# En Mac/Linux
cat .env.local
```

**Resultado esperado:**
```
GEMINI_API_KEY=tu_clave_de_gemini
```

**NO debe mostrar:** `tu_clave_de_gemini` como valor real (eso significa que no está configurada)

---

### ✅ PASO 4: Iniciar Backend (Terminal 1)

```bash
npm run server
```

**Resultado esperado:**
```
╔════════════════════════════════════════════╗
║  🚀 SERVIDOR BACKEND INICIADO EXITOSAMENTE 🚀    ║
╠════════════════════════════════════════════╣
║  Puerto: 3000                                ║
║  ✅ GEMINI_API_KEY está configurada             ║
```

**Si ves:** `⚠️  ADVERTENCIA: GEMINI_API_KEY no configurada`
→ Edita `.env.local` y reinicia

---

### ✅ PASO 5: Probar el servidor en otra terminal

Sin cerrar Terminal 1, abre una nueva terminal y ejecuta:

```bash
curl http://localhost:3000/health
```

**Resultado esperado:**
```json
{
  "status":"ok",
  "timestamp":"2026-06-06T...",
  "apiKeyConfigured":true
}
```

**Si da error:** El servidor no está ejecutándose en Terminal 1

---

### ✅ PASO 6: Iniciar Frontend (Terminal 2)

Sin cerrar Terminal 1, abre OTRA nueva terminal y ejecuta:

```bash
npm run dev
```

**Resultado esperado:**
```
VITE v5.4.21  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

### ✅ PASO 7: Abrir en el navegador

```
http://localhost:5173
```

**Deberías ver:**
- Header: "Gestor de Proyectos TI"
- 2 proyectos de ejemplo en la tabla
- Botón "+ Nuevo Proyecto"

---

### ✅ PASO 8: Probar Generación de WBS

1. Haz clic en "+ Nuevo Proyecto"
2. Completa:
   - Nombre: "Test Project"
   - Descripción: "Test"
   - Fecha inicio: (selecciona una fecha)
   - Fecha fin: (selecciona posterior)
   - BAC: 50000
   - Agrega 1+ miembro de equipo
3. Haz clic en "Generar WBS con IA"

**Resultado esperado:**
- Se mostrarán 6 fases automáticamente
- Puedes ver y editar las actividades
- Sin errores en la consola

---

## 🚨 SI ALGO FALLA

### ❌ Puerto 3000 ya está en uso

```bash
# Encuentra qué está usando el puerto 3000
# En Windows:
netstat -ano | findstr :3000

# Termina el proceso o usa otro puerto:
npm run server -- --port 3001
```

### ❌ No puedo encontrar npm

```bash
# Reinstala Node.js desde https://nodejs.org/
# Luego reinicia tu terminal
```

### ❌ Las dependencias no se instalaron

```bash
# Borra node_modules y reinstala
rm -rf node_modules  # Mac/Linux
rmdir /s node_modules  # Windows

npm install
```

### ❌ El servidor dice "GEMINI_API_KEY no configurada"

```bash
# Verifica que .env.local existe en la raíz
# Contiene:
GEMINI_API_KEY=tu_clave_de_gemini

# Guarda el archivo y reinicia Terminal 1:
npm run server
```

---

## 🎯 CHECKLIST DE EJECUCIÓN CORRECTA

```
[ ] npm --version       → Muestra versión
[ ] npm list express    → Muestra express@4.18.2
[ ] .env.local existe   → Contiene tu API key real
[ ] Terminal 1: npm run server    → Puerto 3000 ✅
[ ] curl health check   → {"status":"ok","apiKeyConfigured":true}
[ ] Terminal 2: npm run dev       → Puerto 5173 ✅
[ ] Navegador: http://localhost:5173 → Carga la app ✅
[ ] Dashboard muestra 2 proyectos de ejemplo ✅
[ ] Crear proyecto sin errores ✅
[ ] Generar WBS sin errores → Se muestran 6 fases ✅
```

Si todos están ✅, ¡tu app funciona perfectamente!

---

## 📞 RESUMEN RÁPIDO

**Para ejecutar la app:**

```bash
# Terminal 1
npm run server

# Terminal 2 (NUEVA)
npm run dev

# Navegador
http://localhost:5173
```

**¡Eso es todo!** 🚀
