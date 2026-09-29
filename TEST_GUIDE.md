# 🧪 Guía de Prueba Rápida - WBS Implementation

## ✅ Pre-requisitos
- Node.js instalado
- Gemini API Key configurada en `.env.local`
- Base de datos PostgreSQL (opcional, usa localStorage por defecto)

## 🚀 Pasos para Prueba

### 1. Iniciar el Servidor
```bash
npm run server
```
Debería ver:
```
╔════════════════════════════════════════════════════════════════════╗
║     EVM Projects Manager - Servidor iniciado correctamente        ║
```

### 2. En otra terminal, iniciar la aplicación
```bash
npm run dev
```

### 3. Abrir en navegador
```
http://localhost:5173
```

---

## 📋 Pruebas Específicas

### Test 1: Crear Proyecto con WBS Generado
**Objetivo**: Verificar que el WBS se genera con todos los campos

1. Click en "Nuevo Proyecto"
2. Completar:
   - Nombre: `Proyecto Test EVM`
   - Descripción: `Sistema de gestión de inventario con integraciones API`
   - Fecha inicio: Hoy
   - Fecha fin: +180 días
   - BAC: `100000`
   - Administrador: `Juan Pérez`
   - Asistente: `María García`
3. Agregar miembros del equipo (mínimo 1):
   - Nombre: `Carlos López`
   - Rol: `Tech Lead`
4. Click "Generar con IA"
5. **Verificar**:
   - ✅ Se genera WBS con 6 fases
   - ✅ Cada fase tiene 3-5 actividades
   - ✅ Tabla muestra: Actividad, Entregable, Duración, Costo, Rol Asignado, Predecesoras
   - ✅ Panel de validación muestra ✓ Verde (WBS Válido)

---

### Test 2: Validación de Dependencias
**Objetivo**: Verificar que las validaciones funcionan

#### Subtest 2a: Predecesoras válidas
1. En WBS generada, expandir una fase
2. Ver que hay predecesoras (ej: "A0, A1")
3. **Debería** mostrar validación en verde

#### Subtest 2b: Crear ciclo (si fuera posible editar)
1. Si se pudiera editar, crear:
   - Actividad A: sin predecesoras
   - Actividad B: predecesora A
   - Actividad A: agregar predecesora B
2. **Debería** mostrar error rojo: "Ciclo detectado"

#### Subtest 2c: Predecesora inexistente
1. Editar predecesoras de una actividad
2. Cambiar a ID inexistente (ej: "XYZ999")
3. **Debería** mostrar error: "Referencias inválidas"

---

### Test 3: Guardar y Agregar Punto de Control
**Objetivo**: Verificar cálculos EVM

1. Guardar proyecto (si todo es válido)
2. Click "Ver" en dashboard
3. Scroll a "Agregar Fecha de Corte"
4. Completar:
   - Fecha: Hoy
   - % Avance Real: `30`
   - Costo Real: `32000`
   - Opcional: MTBF, DRE
5. Click "Agregar"
6. **Verificar métricas calculadas**:
   - PV: Debe ser ~30% de BAC (30000)
   - EV: 30% × 100000 = 30000
   - AC: 32000
   - CV: 30000 - 32000 = -2000 (negativo, sobre presupuesto)
   - SV: 30000 - ~30000 = ~0 (en cronograma)
   - CPI: 30000/32000 = 0.94 (bajo, rojo)
   - SPI: 30000/30000 = 1.0 (bien)

---

### Test 4: Pronósticos (3 Escenarios)
**Objetivo**: Verificar EAC optimista, realista, pesimista

Con los datos del Test 3:
- CPI = 0.94
- SPI = 1.0
- BAC = 100000

**Esperado**:
- ✅ EAC Optimista: 100000 / 0.94 = 106,383 (usando CPI)
- ✅ EAC Realista: 100000 / ((0.94+1.0)/2) = 103,092 (promedio)
- ✅ EAC Pesimista: 100000 / 1.0 = 100,000 (usando SPI)

**Verificar**: Mostrados en columna "Pronósticos y Predicciones"

---

### Test 5: TCPI (To Complete Performance Index)
**Objetivo**: Verificar índices requeridos

**TCPI (BAC)**:
- Fórmula: (BAC - EV) / (BAC - AC)
- Cálculo: (100000 - 30000) / (100000 - 32000) = 70000 / 68000 = 1.03
- **Significado**: Debe mejorar performance en 3% para completar a presupuesto

**TCPI (EAC)**:
- Fórmula: (BAC - EV) / (EAC - AC)
- Cálculo: (100000 - 30000) / (106383 - 32000) = 70000 / 74383 = 0.94
- **Significado**: Puede mantener performance actual para completar al EAC

---

### Test 6: Dashboard Visual
**Objetivo**: Verificar que los indicadores se muestren correctamente

1. Ir a Dashboard
2. Ver tarjeta "Proyectos en Riesgo":
   - Debería contar proyectos con CPI < 1 o SPI < 1
3. En tabla de proyectos:
   - CPI en rojo (0.94 < 1)
   - SPI en verde (1.0 ≥ 1)
   - Status: "Atención" (amarillo)

---

### Test 7: Análisis IA
**Objetivo**: Verificar recomendaciones

1. En vista de detalle, click "Generar Análisis"
2. **Esperar** respuesta de Gemini (15-30 segundos)
3. **Verificar análisis contiene**:
   - ✅ Estado (Verde/Amarillo/Rojo)
   - ✅ Análisis de métricas (CPI bajo)
   - ✅ Riesgos identificados
   - ✅ Recomendaciones (aumentar presupuesto, acelerar)
   - ✅ Texto en español

---

### Test 8: Curva S
**Objetivo**: Verificar gráfico

1. En vista de detalle, scroll al gráfico
2. **Verificar**:
   - ✅ Eje X: Días del proyecto
   - ✅ Eje Y: USD acumulados
   - ✅ PV: Curva Sigmoid
   - ✅ EV: Línea hasta punto de corte
   - ✅ AC: Línea hasta punto de corte

---

## 🐛 Solución de Problemas

### Error: "GEMINI_API_KEY no configurada"
```bash
# Verificar .env.local
cat .env.local | grep GEMINI_API_KEY
# Si no existe, agregar:
echo "GEMINI_API_KEY=your_key_here" >> .env.local
```

### Error: "Conexión rechazada a base de datos"
- La app usa localStorage por defecto, OK para pruebas
- Si quieres PostgreSQL, ver SETUP_INSTRUCTIONS.md

### WBS no se genera
1. Verificar Gemini API Key es válida
2. Verificar conexión a internet
3. Revisar console del servidor: `npm run server` en otra terminal
4. Esperado: Tarda 10-20 segundos en generar

### Validación muestra errores falsos
- Recargar página (F5)
- Generar WBS de nuevo
- Si persiste, revisar console (F12)

---

## 📊 Datos de Prueba Sugeridos

### Proyecto Pequeño (30 días)
```
BAC: 50,000
Duración: 30 días
Fases esperadas: 6 (condensadas)
```

### Proyecto Mediano (180 días)
```
BAC: 500,000
Duración: 180 días
Fases esperadas: 6 (estándar)
Actividades esperadas: 20-30
```

### Proyecto Grande (360 días)
```
BAC: 1,000,000
Duración: 360 días
Fases esperadas: 6 (expandidas)
Actividades esperadas: 30-50
```

---

## ✅ Checklist de Validación

- [ ] WBS genera con todos los campos
- [ ] Validación de dependencias funciona
- [ ] Puntos de control calculan correctamente
- [ ] EVM métricas son matemáticamente correctas
- [ ] 3 escenarios de EAC mostrados
- [ ] TCPI calculados correctamente
- [ ] Dashboard muestra estado correcto
- [ ] Análisis IA devuelve recomendaciones
- [ ] Gráficos visualizan correctamente
- [ ] Sin errores en consola (F12)

---

## 🎯 Duración Estimada de Pruebas

- Test 1: 3 minutos
- Test 2: 2 minutos
- Test 3: 2 minutos
- Test 4: 1 minuto
- Test 5: 1 minuto
- Test 6: 2 minutos
- Test 7: 2 minutos (+ espera IA)
- Test 8: 1 minuto

**Total**: ~15 minutos (+ tiempos de espera de IA)

---

**¡Listo para probar! Si encuentras problemas, revisa la consola del navegador (F12) para más detalles.**
