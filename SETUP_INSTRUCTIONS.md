## ⚡ INSTRUCCIONES PARA EJECUTAR CON ÉXITO

### 🔑 PASO 1: Configurar API Key de Gemini

**Edita el archivo `.env.local`:**

```
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_API_KEY=tu_clave_de_gemini
```

Reemplaza `YOUR_API_KEY_HERE` con tu clave real de Gemini.

**Cómo obtener la clave:**
1. Abre la consola de Google AI Studio
2. Inicia sesión o crea una cuenta
3. Dirígete a "API Keys" en el menú
4. Haz clic en "Create Key"
5. Copia la clave y pégala en `.env.local` en AMBOS lugares

---

### 🖥️ PASO 2: Abrir DOS Terminales

#### **Terminal 1: Backend Server**

```bash
cd "c:\Users\User\OneDrive - UNIVERSIDAD TÉCNICA DE AMBATO\Escritorio\QUINTO SEMESTRE\GESTION DE PROYECTOS TI\PROYECTO"
npm run server
```

**Deberías ver:**
```
Servidor backend en puerto 3000
Manejo de llamadas a Gemini API
```

**❌ NO CIERRES ESTA TERMINAL**

---

#### **Terminal 2: Frontend Development**

En una **nueva terminal** (sin cerrar la primera):

```bash
cd "c:\Users\User\OneDrive - UNIVERSIDAD TÉCNICA DE AMBATO\Escritorio\QUINTO SEMESTRE\GESTION DE PROYECTOS TI\PROYECTO"
npm run dev
```

**Deberías ver:**
```
VITE v5.4.21 ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

---

### 🌐 PASO 3: Abre la Aplicación

Haz clic o copia en el navegador:
```
http://localhost:5173
```

---

## ✅ Flujo de Trabajo Correcto

1. ✅ **Terminal 1 ejecutando:** `npm run server` (puerto 3000)
2. ✅ **Terminal 2 ejecutando:** `npm run dev` (puerto 5173)
3. ✅ **Navegador abierto:** http://localhost:5173
4. ✅ **API key configurada** en `.env.local`

---

## 🧪 Prueba de Funcionamiento

### ✅ Test 1: Dashboard
- Deberías ver 2 proyectos de ejemplo
- Total proyectos: 2
- Proyectos en riesgo: 0

### ✅ Test 2: Ver Detalle
- Haz clic en "Ver detalle" en cualquier proyecto
- Verás métricas EVM
- Curva S con gráfico

### ✅ Test 3: Análisis IA
- Haz clic en "Analizar Proyecto"
- **IMPORTANTE:** El servidor backend debe estar ejecutándose
- Deberías ver análisis con 4 secciones

### ✅ Test 4: Crear Nuevo Proyecto
- Haz clic en "+ Nuevo Proyecto"
- Completa TODOS los campos
- Agrega AL MENOS 1 miembro del equipo
- Haz clic en "Generar WBS con IA"
- **IMPORTANTE:** El servidor backend debe estar ejecutándose
- Verás las fases generadas automáticamente

---

## 🚨 Troubleshooting

### ❌ Error: "No se pudo generar la WBS"

**Solución:**
1. Verifica que el servidor backend esté ejecutándose en Terminal 1
2. Confirma que tu API key es correcta en `.env.local`
3. Asegúrate que tienes conexión a internet
4. Comprueba que el puerto 3000 no esté siendo usado por otra aplicación

### ❌ Error: "Failed to fetch"

**Solución:**
1. Terminal 1: ¿Está ejecutándose `npm run server`?
2. ¿El servidor dice "Puerto 3000"?
3. Si no, cierra Terminal 1 y reinicia: `npm run server`

### ❌ Página en blanco

**Solución:**
1. Recarga la página (Ctrl+F5)
2. Abre DevTools (F12)
3. Ve a la pestaña "Console" para ver errores
4. Verifica que Terminal 2 esté ejecutándose

### ❌ No ve los 2 proyectos de ejemplo

**Solución:**
1. Abre DevTools (F12)
2. Ve a "Application" → "Local Storage"
3. Debería haber una entrada `evm_projects` con datos
4. Si está vacío, recarga la página (Ctrl+F5)

### ❌ API Key inválida

**Solución:**
1. Abre la consola de Google AI Studio
2. Verifica que tu clave esté activa (no deletada)
3. Copia la clave completa sin espacios extras
4. Pega en `.env.local` en AMBOS lugares
5. Reinicia el servidor: `npm run server`

---

## 📊 Arquitectura

```
Frontend (React) → http://localhost:5173
      ↓
Backend Server (Express) → http://localhost:3000
      ↓
Usa el endpoint de Gemini configurado en `server.js`
```

**¿Por qué dos servidores?**
- El Frontend no puede llamar directamente a Gemini API (CORS bloqueado)
- El Backend es un "proxy" que hace llamadas seguras a Gemini
- El Frontend llama al Backend, que llama a Gemini

---

## 🎯 Validaciones Implementadas

✅ Nombre del proyecto: Requerido
✅ Descripción: Requerida
✅ Fecha inicio: Requerida y menor a fecha fin
✅ Fecha fin: Requerida y mayor a fecha inicio
✅ Presupuesto (BAC): Requerido y mayor a 0
✅ **Equipo: MÍNIMO 1 MIEMBRO REQUERIDO** ⭐
✅ Todos los campos visibles están validados

---

## 💾 Datos Persistentes

Los proyectos se guardan automáticamente en:
- **localStorage** del navegador (caché rápido)
- **PostgreSQL** (opcional, para producción)

Para usar PostgreSQL:
```bash
psql -U postgres -f schema.sql
```

---

## 📝 Resumen de Comandos

| Comando | Descripción | Terminal |
|---------|-------------|----------|
| `npm run server` | Inicia backend (puerto 3000) | Terminal 1 |
| `npm run dev` | Inicia frontend (puerto 5173) | Terminal 2 |
| `npm run build` | Build para producción | Cualquiera |
| `npm install` | Instala dependencias | Cualquiera |

---

## ✨ ¡Listo!

**Ahora tienes todo configurado. Ejecuta:**

```bash
# Terminal 1
npm run server

# Terminal 2 (NUEVA terminal)
npm run dev
```

**Luego abre:** http://localhost:5173

¡Disfruta tu aplicación de gestión de proyectos con análisis EVM e IA! 🚀
