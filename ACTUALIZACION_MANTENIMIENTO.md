# Actualización del Módulo de Historial y Folios de Mantenimiento

Este documento detalla todas las mejoras, correcciones y funcionalidades implementadas en la rama **`Mantenimiento`**. Contiene la guía completa de cambios tanto en Backend (Laravel) como en Frontend (React/Vite) para facilitar la auditoría, revisión y despliegue del proyecto.

---

## 📌 1. Resumen Ejecutivo

Se rediseñó la pestaña **Historial y Folios** en el módulo de Mantenimiento (`HistorialMantenimiento.jsx`) para solucionar problemas de cálculo de tiempos, trazabilidad de fechas independientes (Incidencia vs Folio de Taller), sobreescritura accidental de fechas y problemas de diseño donde columnas como **Estatus** quedaban ocultas bajo la barra de acciones.

---

## ⏱️ 2. Trazabilidad y Tiempos Independientes (Incidencia vs Folio)

### El Problema
Anteriormente, el sistema asumía una sola fecha para la estancia en taller. Sin embargo, en la operación real:
1. Una unidad puede presentar una **Incidencia** en ruta un día (ej. hace 4 días).
2. El taller emite el **Folio Físico** posteriormente (ej. ayer o hoy).
3. Ambos eventos tienen **fechas y horas distintas** y deben medirse de forma independiente.
4. Cuando una unidad regresaba a **Operación**, el cálculo en algunos casos no detectaba la salida real y mostraba tiempos erróneos (ej. "Menos de 1 hr" cuando estuvo 3 días fuera).

### Solución Implementada
- **Cálculo Backend con Carbon (`HistorialOperativoController.php`)**:
  - Se calculan de forma independiente:
    - `tiempo_incidencia`: Tiempo transcurrido desde la fecha y hora de la incidencia (`fecha_registro`).
    - `tiempo_folio`: Tiempo transcurrido desde la fecha y hora oficial del folio emitido en taller (`fecha_folio_mantenimiento`).
  - **Detección de Retorno a Operación**: El sistema busca en la bitácora el momento exacto en que la unidad pasó de `mantenimiento` a `operacion`. La fecha de corte se fija a ese instante:
    - Si la unidad ya está en Operación: Etiqueta **`Estuvo`** (ej. `Estuvo 3d` o `Estuvo < 1h`).
    - Si la unidad continúa en Mantenimiento: Etiqueta **`Lleva`** (ej. `Lleva 4d`).
  - **Filtrado por Día**: En la vista "Por Día", las unidades que ya volvieron a Operación no se muestran activas en la fecha actual, manteniendo la lista enfocada exclusivamente en lo que está pendiente o ocurrió ese día.

---

## 🎨 3. Optimización Visual de la Tabla de Folios

### Ajustes de Tamaño y Distribución
- **Ancho Total Optimizado (1020px)**: Se ajustó el `min-width` para que las **8 columnas** quepan en pantallas de laptops (1280px / 1366px / 1440px / 1920px) sin obligar a un scroll horizontal forzado.
- **Eliminación del Solapamiento Sticky**: Se retiró la propiedad `position: sticky` fija de la columna **ACCIONES**, la cual se montaba encima de **ESTATUS** y la dejaba completamente invisible. Ahora todas las columnas son 100% visibles:
  1. `TIPO` (80px)
  2. `ECO` (50px, centrado)
  3. `N° INCIDENCIA` (110px)
  4. `N° FOLIO` (110px)
  5. `CRONOLOGÍA (INC / FOLIO)` (275px)
  6. `FALLA & DIAGNÓSTICO` (Flexible, min 150px)
  7. `ESTATUS` (120px, centrado con pulse dot institucional)
  8. `ACCIONES` (165px, botones Editar e Historial)

### Textos Cortos y Legibles
- **Fechas en un solo renglón**: Con `white-space: nowrap;`, la fecha y hora (`19/10/2026 • 15:38`) nunca se parten en dos líneas, reduciendo la altura vertical de cada fila.
- **Badges de Tiempo Compactos**:
  - Antes: `Estuvo: Menos de 1 hr` ➔ Ahora: **`Estuvo < 1h`**
  - Antes: `Estuvo: 3 días` ➔ Ahora: **`Estuvo 3d`**
  - Antes: `Lleva: 4 días` ➔ Ahora: **`Lleva 4d`**
  - Sin folio físico: **`Sin folio`**
  - Alineados con `margin-left: auto` para que las fechas y los badges formen columnas perfectamente paralelas.

---

## ✏️ 4. Modal de Edición ("Actualizar Folio y Datos de Registro")

### Nuevas Capacidades de Edición
- **Fecha de Incidencia Editable**: Anteriormente solo se podía editar la fecha del folio. Ahora el modal incluye:
  - Selector de **Fecha de la Incidencia** con `AppleDatePicker`.
  - Selector de **Fecha del Folio Físico** con `AppleDatePicker`.
- **Falla o Diagnóstico Reportado**: Se integró el campo editable de Falla en el modal. Si la unidad arrastraba una falla antigua (como `"LUCES"` en el ECO 005), el usuario ahora puede verla, corregirla, cambiarla o vaciarla si no aplica para el nuevo folio.
- **Corrección Crítica de Sobreescritura**: Se eliminó el código que sobreescribía la fecha de registro con `Carbon::now()` al guardar cambios de incidencia. Ahora se respeta la fecha seleccionada por el usuario o se preserva la original.
- **Trazabilidad y Control Operativo**:
  - Muestra tarjetas duales con los tiempos de estancia y fechas de inicio.
  - Cuadro comparativo: Registro Actual vs Antecedente Inmediato (con botón para restaurar valor previo).
  - Justificación obligatoria en mayúsculas registrada en `bitacora_cambios_unidades` para auditoría total.

---

## 🔍 5. Buscador y Filtros

- **Criterio de búsqueda simplificado**: Se ubicó justo debajo de la barra de búsqueda: `Puedes buscar por: Económico · Incidencia · Folio`.
- **Selector Por Día vs Historial Completo**: Posicionado con botones toggle institucionales y conteos dinámicos.
- **Búsqueda Profunda Integrada**: Al buscar un económico que no tenga registros en el día seleccionado, se despliega una tarjeta de información con el estado de la unidad y acceso a su expediente histórico completo.

---

## 📂 6. Archivos Modificados

| Archivo | Tipo | Cambios Principales |
|---|---|---|
| `frontend/src/pages/Historial/HistorialMantenimiento.jsx` | Frontend (React) | Ajuste de anchos de tabla, selectores duales de fecha en modal, badges compactos, campo de falla editable y corrección de solapamiento visual. |
| `laravel-api/app/Http/Controllers/API/HistorialOperativoController.php` | Backend (Laravel) | Cálculo de tiempos independientes con Carbon, resolución de salida a operación, eliminación de `Carbon::now()` forzado en `actualizarFolioHistorico` y soporte para actualizar `fecha_registro` y `falla_reportada`. |

---

## 🚀 7. Instrucciones para Descargar y Probar

1. **Obtener la rama**:
   ```bash
   git checkout Mantenimiento
   ```
2. **Iniciar servicios locales**:
   ```bash
   ./run-dev.sh
   ```
3. **Acceso**:
   - Abrir en el navegador: `http://localhost:5173/historial/mantenimiento`
   - Recargar con limpieza de caché: **`Cmd + Shift + R`** (Mac) o **`Ctrl + F5`** (Windows).
