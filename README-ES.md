# 📊 Gestor de Proyectos TI - EVM Dashboard

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple?logo=vite)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-4.18-green?logo=express)](https://expressjs.com)
[![Gemini](https://img.shields.io/badge/Gemini-AI-orange)](https://ai.google.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-3.3-cyan?logo=tailwindcss)](https://tailwindcss.com)

## 🎯 ¿Qué es?

Aplicación web **completa** para gestión de costos de proyectos TI con análisis EVM (Earned Value Management) y generación automática de WBS usando inteligencia artificial.

## ✨ Características

### 📈 Gestión de Proyectos
- **Dashboard** con resumen de proyectos
- **Cálculos EVM automáticos**: CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI
- **Gráficos S-Curve** con 3 líneas: PV (Planificado), EV (Ganado), AC (Real)
- **Fechas de Corte** para seguimiento en tiempo real
- **Estado de Proyecto** automático: Saludable / Atención / Crítico

### 🤖 Inteligencia Artificial
- **Generación automática de WBS** con 6 fases usando Gemini AI
- **Análisis ejecutivo** de proyectos con IA
- Recomendaciones y riesgos identificados automáticamente
- Respuestas en español con formato profesional

### 📋 Validaciones
- ✅ Todos los campos requeridos
- ✅ Mínimo 1 miembro de equipo
- ✅ Fechas válidas (inicio < fin)
- ✅ Presupuesto > 0
- ✅ Interfaz intuitiva y amigable

### 💾 Persistencia
- **localStorage** para datos en navegador (default)
- **PostgreSQL** opcional para producción (schema.sql incluido)

## 🚀 Inicio Rápido (5 minutos)

### 1️⃣ Configura tu API Key

Edita `.env.local` (está en la raíz):

```env
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_API_KEY=tu_clave_de_gemini
```

**¿Dónde obtenerla?**
1. Ve a https://ai.google.dev
2. Click en "API Keys"
3. Copia y pega aquí

### 2️⃣ Abre DOS Terminales

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 3️⃣ Abre tu Navegador

```
http://localhost:5173
```

¡Listo! 🎉

## 📖 Documentación

| Archivo | Descripción |
|---------|-------------|
| **[START_HERE.md](START_HERE.md)** | ⭐ Lee esto primero - Instrucciones paso a paso |
| **[DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md)** | Explicación de localStorage vs PostgreSQL |
| **[VERIFY_SETUP.md](VERIFY_SETUP.md)** | Checklist de verificación |
| **[CHANGES.md](CHANGES.md)** | Cambios técnicos realizados |
| **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** | Guía detallada con troubleshooting |
| **[QUICK_START.md](QUICK_START.md)** | Referencia rápida |

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Frontend (React + Vite + Tailwind)              │  │
│  │  • Dashboard (Overview proyectos)                │  │
│  │  • NewProjectForm (Crear proyectos)             │  │
│  │  • ProjectDetail (Métricas EVM + Gráficos)      │  │
│  └──────────────────────────────────────────────────┘  │
│              ↓ (HTTP JSON)                              │
├─────────────────────────────────────────────────────────┤
│              SERVIDOR BACKEND (Express)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  • POST /api/generate-wbs   (Generar WBS + IA)  │  │
│  │  • POST /api/analyze-project (Análisis + IA)    │  │
│  │  • GET  /health             (Health check)      │  │
│  └──────────────────────────────────────────────────┘  │
│              ↓ (HTTPS)                                  │
├─────────────────────────────────────────────────────────┤
│         Gemini API (Gemini Sonnet 4)                 │
│  • Generación de WBS estructurado                       │
│  • Análisis EVM ejecutivo                               │
│  • Recomendaciones y riesgos                            │
├─────────────────────────────────────────────────────────┤
│           PERSISTENCIA LOCAL                            │
│  • localStorage (navegador) - ACTIVO                    │
│  • PostgreSQL (schema.sql) - OPCIONAL                   │
└─────────────────────────────────────────────────────────┘
```

## 📊 Ejemplo de Proyecto

Abre la app y verás 2 proyectos de ejemplo:

### Proyecto 1: "Desarrollo Sistema CRM"
- **BAC:** $50,000
- **Duración:** 180 días
- **Equipo:** 4 miembros
- **WBS:** 6 fases con actividades

### Proyecto 2: "Migración Cloud AWS"
- **BAC:** $75,000
- **Duración:** 200 días
- **Equipo:** 4 miembros
- **WBS:** 6 fases con actividades

Edita, analiza y practica con ellos.

## 🛠️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18.2 + Vite 5.0 |
| **UI/CSS** | Tailwind CSS 3.3 |
| **Gráficos** | Recharts 2.10 |
| **Iconos** | Lucide React 0.294 |
| **Backend** | Express.js 4.18 |
| **IA** | Gemini |
| **Base Datos (opt)** | PostgreSQL 12+ |
| **Persistencia** | localStorage + JSON |

## 📝 Cálculos EVM Incluidos

Todos los indicadores de gestión de proyectos:

```
MÉTRICAS BÁSICAS:
├── BAC (Presupuesto Autorizado)
├── PV (Valor Planificado) - Curva Sigmoidea
├── EV (Valor Ganado)
└── AC (Costo Real)

VARIACIONES:
├── CV = EV - AC (Variación de Costo)
├── SV = EV - PV (Variación de Cronograma)

ÍNDICES DE DESEMPEÑO:
├── CPI = EV / AC (Índice Desempeño Costo)
├── SPI = EV / PV (Índice Desempeño Cronograma)

PRONÓSTICOS:
├── EAC = BAC / CPI (Costo Final Estimado)
├── ETC = EAC - AC (Costo por Completar)
├── VAC = BAC - EAC (Variación a Completación)
└── TCPI = (BAC - EV) / (EAC - AC) (Desempeño Requerido)

ESTADO DEL PROYECTO:
├── 🟢 Saludable: CPI ≥ 1 AND SPI ≥ 1
├── 🟡 Atención: CPI 0.85-1 O SPI 0.85-1
└── 🔴 Crítico: CPI < 0.85 O SPI < 0.85
```

## 🔐 Seguridad

- ✅ API Key guardada en `.env.local` (NO en código)
- ✅ Backend proxy para no exponer la API Key en frontend
- ✅ CORS configurado correctamente
- ✅ Validaciones en servidor y cliente
- ✅ localStorage aislado por dominio

## 📦 Instalación

### Requisitos
- Node.js 16+ (Recomendado 18+)
- npm 8+
- API Key de Gemini

### Pasos

```bash
# 1. Clona o descarga el proyecto
cd PROYECTO

# 2. Instala dependencias
npm install

# 3. Configura tu API Key
# Edita .env.local con tu clave

# 4. En Terminal 1 - Backend
npm run server

# 5. En Terminal 2 - Frontend
npm run dev

# 6. Abre en navegador
http://localhost:5173
```

## 🧪 Pruebas

### Verificar Servidor Backend
```bash
curl http://localhost:3000/health
# Respuesta: {"status":"ok","apiKeyConfigured":true}
```

### Crear Proyecto de Prueba
1. "+ Nuevo Proyecto"
2. Completa todos los campos
3. Agrega 1+ miembro de equipo
4. Haz clic en "Generar WBS con IA"
5. Espera 10-15 segundos
6. ¡Se generarán 6 fases automáticamente!

### Analizar Proyecto
1. Abre un proyecto
2. Haz clic en "Analizar Proyecto"
3. Espera el análisis con IA
4. Verás 4 secciones: Estado, Interpretación, Riesgos, Recomendaciones

## 🐛 Troubleshooting

### Error: "Failed to fetch"
**Causa:** Backend no está ejecutándose

**Solución:**
```bash
# Terminal 1
npm run server
```

### Error: "GEMINI_API_KEY no configurada"
**Causa:** .env.local no tiene la clave o es incompleta

**Solución:**
1. Edita `.env.local`
2. Reemplaza `YOUR_API_KEY_HERE` con tu clave real
3. Reinicia Terminal 1

### Puerto 3000 ya en uso
**Solución:**
```bash
npm run server -- --port 3001
```

---

### 📞 Más Documentación

- [START_HERE.md](START_HERE.md) - Instrucciones completas
- [VERIFY_SETUP.md](VERIFY_SETUP.md) - Checklist
- [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) - Guía detallada

## 📄 Licencia

Proyecto educativo para Gestión de Proyectos TI.

## 🤝 Contribuciones

¿Ideas para mejorar? ¡Sugerencias bienvenidas!

---

## 🚀 ¡Empezar Ahora!

→ **[Haz clic aquí para leer START_HERE.md](START_HERE.md)** ← Instrucciones ultra claras paso a paso

---

**Creado con ❤️ para la gestión profesional de proyectos TI**
