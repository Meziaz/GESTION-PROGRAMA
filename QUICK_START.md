## 🚀 GUÍA RÁPIDA DE INICIO

### ✅ Se ha instalado correctamente

Tu aplicación **Gestor de Proyectos TI** está lista. Todas las dependencias han sido instaladas.

### 📋 Pasos Siguientes

#### 1️⃣ **Configurar tu API Key de Gemini**

Abre el archivo `.env.local` en la raíz del proyecto y reemplaza:
```
GEMINI_API_KEY=tu_clave_de_gemini
```

**Cómo obtener tu API Key:**
1. Abre la consola de Google AI Studio
2. Inicia sesión o crea una cuenta
3. Ve a "API Keys" en el menú
4. Crea una nueva clave
5. Copia y pega en `.env.local`

#### 2️⃣ **Iniciar la aplicación en modo desarrollo**

En la terminal, desde la carpeta del proyecto:
```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:5173**

#### 3️⃣ **Explorar la Aplicación**

**Dashboard Principal:**
- Visualiza el total de proyectos
- Proyectos en riesgo (CPI o SPI < 1)
- Tabla con métricas clave
- Botón "+ Nuevo Proyecto"

**Crear Nuevo Proyecto:**
1. Completa la información básica
2. Haz clic en "Generar WBS con IA"
3. Revisa y edita las fases y actividades
4. Haz clic en "Guardar Proyecto"

**Ver Detalle del Proyecto:**
1. Desde el Dashboard, haz clic en "Ver detalle"
2. Agrega fechas de corte para seguimiento
3. Visualiza métricas EVM en tiempo real
4. Haz clic en "Analizar Proyecto" para obtener análisis IA

### 📊 Datos de Ejemplo

La aplicación viene con 2 proyectos de ejemplo:
- **Desarrollo Sistema CRM**: 50,000 USD
- **Migración Cloud AWS**: 75,000 USD

Cada uno tiene 3 fechas de corte con datos de progreso real.

### 🔧 Configuración Opcional: Base de Datos PostgreSQL

Si deseas usar PostgreSQL como fuente de verdad permanente:

```bash
# 1. Crea la base de datos
psql -U postgres -f schema.sql

# 2. El schema incluye:
#    - Tabla projects
#    - Tabla team_members
#    - Tabla wbs_phases y wbs_activities
#    - Tabla cut_dates
#    - Tabla ai_analyses
#    - Índices de performance
```

### 🛠️ Comandos Útiles

```bash
# Desarrollar
npm run dev

# Build para producción
npm run build

# Preview de producción local
npm run preview

# Backend (si está configurado)
npm run server
```

### 📊 Características Principales

✅ **3 Vistas Completas**
- Dashboard con resumen ejecutivo
- Formulario de nuevo proyecto con WBS IA
- Detalle de proyecto con EVM completo

✅ **Métricas EVM**
- Valores Base: BAC, PV, EV, AC
- Variaciones: CV, SV
- Índices: CPI, SPI
- Pronósticos: EAC, ETC, VAC, TCPI

✅ **Gráficos**
- Curva S con PV, AC, EV
- Línea de referencia "Hoy"
- Tooltip interactivo

✅ **IA Integrada**
- Generación de WBS por Gemini
- Análisis ejecutivo automático
- Identificación de riesgos

✅ **Persistencia**
- localStorage para caché rápido
- PostgreSQL opcional para verdad permanente

### 🎨 Diseño

- **Colores**: Índigo primario, Verde/Amarillo/Rojo para estados
- **Responsive**: Diseño adaptable a todos los dispositivos
- **Profesional**: Estilo ejecutivo y limpio

### 📚 Documentación Completa

Ver `README.md` para:
- Guía de instalación completa
- Estructura del proyecto
- Fórmulas EVM detalladas
- Troubleshooting
- Código del backend Express

### 💡 Ejemplo de Uso

1. **Dashboard** → Ve 2 proyectos de ejemplo
2. **Haz clic en "Ver detalle"** → Ve métricas EVM
3. **Haz clic en "Analizar Proyecto"** → Recibe análisis IA con recomendaciones
4. **Agrega fecha de corte** → Gráficos se actualizan en tiempo real

### 🚨 Troubleshooting Rápido

**¿No funciona la IA?**
- Verifica que la API key esté correcta en `.env.local`
- Recarga la página (Ctrl+Shift+R)

**¿No ves los gráficos?**
- Recharts está instalado
- Recarga la página del navegador

**¿Los datos no se guardan?**
- localStorage está habilitado por defecto
- Abre DevTools > Application > Local Storage

---

**¡Tu aplicación está lista!** 🎉

Ejecuta `npm run dev` y comienza a gestionar tus proyectos TI con análisis EVM e IA.
