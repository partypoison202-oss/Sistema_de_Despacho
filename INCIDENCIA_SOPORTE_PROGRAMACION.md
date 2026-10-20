# 📋 Bitácora de Soporte: Corrección de Borrado Involuntario en Programación (Día Siguiente / Día Operativo)

**Fecha:** 20 de Octubre de 2026  
**Módulo:** Programación y Logística (`CargaExcel.jsx` / `DespachoController.php`)  
**Caso testigo reportado:** Unidad 233 (al guardar en "Día Siguiente", se borraban todos sus datos de ruta, conductor, horarios y corridas).

---

## 📌 1. Descripción de la Incidencia

El usuario reportó que al cargar la programación operativa de **"Día Siguiente"** (o editarla en la tabla) y presionar el botón **"Guardar"**:
- El sistema guardaba correctamente la gran mayoría de las unidades.
- Sin embargo, en una unidad específica (en este caso la **Unidad 233**), al hacer clic en **Guardar**, el sistema vaciaba o borraba por completo todos sus datos operativos (Ruta, Conductor, Corridas, Hora de Acople y Hora de Salida).

---

## 🔍 2. Diagnóstico Técnico y Causas Raíz

Al analizar a profundidad tanto el Backend Laravel como el Frontend React, se identificaron **4 causas interconectadas**:

### ⚠️ Causa 1: Lógica destructiva de estatus en el Backend (`DespachoController.php`)
En los controladores de guardado (`actualizarManana`, `actualizar` y `actualizarEspecifico`):
```php
// CÓDIGO ANTERIOR:
if ($tieneServicioAsignado && ($estatusReq === '' || $estatusReq === 'reserva')) {
    $data['estatus'] = 'operacion';
} elseif (!empty($estatusReq)) {
    $data['estatus'] = $estatusReq;
} else {
    $data['estatus'] = $tieneServicioAsignado ? 'operacion' : 'reserva';
}

if (strtolower($data['estatus']) === 'reserva') {
    $data['ruta'] = '';
    $data['numero_tarjeton'] = '';
    // ... vaciaba datos ...
} elseif (in_array(strtolower($data['estatus']), ['mantenimiento', 'percance'])) {
    $data['ruta'] = '';
    $data['numero_tarjeton'] = '';
    // ... vaciaba datos ...
}
```
**El fallo:**  
Si en la base de datos la unidad venía con estatus previo `'mantenimiento'`, `'percance'` o `'no_programada'`, la condición `($estatusReq === '' || $estatusReq === 'reserva')` era **FALSA**. El backend preservaba `$data['estatus'] = 'mantenimiento'`, e inmediatamente después entraba al bloque `elseif (in_array(..., ['mantenimiento', 'percance']))` que **limpiaba forzadamente** la ruta, conductor, acople, horario y corridas. Como resultado, cualquier unidad que tuviera servicio asignado pero estatus previo de taller/percance veía borrada toda su programación al guardar.

### ⚠️ Causa 2: Ausencia de cambio automático de estatus a `'operacion'` en Frontend (`CargaExcel.jsx`)
En `handleUpdateRecord`, cuando el usuario asignaba ruta, tarjetón, horario o corridas a una unidad en la tabla, el campo `ESTATUS` de esa fila permanecía intacto en `'mantenimiento'` o `'reserva'`. Al presionar Guardar, el frontend enviaba dicho estatus obsoleto al backend, activando el borrado descrito en la Causa 1.

### ⚠️ Causa 3: Desvinculación colateral silenciosa de conductores
En `handleUpdateRecord`:
```javascript
// CÓDIGO ANTERIOR:
for (let i = 0; i < updatedData.length; i++) {
  if (i !== index && normalizeTarjeton(updatedData[i]['TARJETON']) === normVal) {
    updatedData[i] = { ...updatedData[i], TARJETON: '', NOMBRE_CONDUCTOR: '' };
  }
}
```
Si el usuario asignaba un conductor que previamente estaba asignado a la Unidad 233 a otra unidad, la Unidad 233 perdía su conductor de forma automática y silenciosa sin que el usuario se enterara.

### ⚠️ Causa 4: Diferencias de formato de Económicos entre Bases de Datos Distintas
En entornos con bases de datos distintas (Desarrollo vs Producción / Neon Postgres), el número económico puede almacenarse como entero o texto con/sin padding de ceros (ej. `"233"` vs `"0233"`).  
Al comparar las modificaciones en el frontend:
```javascript
const base = baseline.get(String(row.ECONOMICO));
```
Si la clave en `baselineRef` no coincidía exactamente en caracteres con la de `frescos` o `previewData`, el sistema no encontraba el registro base o fusionaba datos de manera inconsistente.

---

## 🛠️ 3. Soluciones Implementadas

### A. Backend (`DespachoController.php`)
Se corrigieron los 3 métodos de guardado (`actualizarManana`, `actualizar` y `actualizarEspecifico`):
```php
$estatusReq = strtolower(trim((string) ($fila['ESTATUS'] ?? '')));
$tieneServicioAsignado = ($data['ruta'] !== '' || $data['numero_tarjeton'] !== '' || !empty($data['corridas']) || $data['relevo_tarjeton'] !== '');

if ($tieneServicioAsignado) {
    // Si la unidad tiene asignada una ruta, conductor o corrida,
    // su estatus operativo DEBE ser 'operacion', sin importar si previamente
    // venía marcada como 'reserva', 'mantenimiento' o 'percance'.
    $data['estatus'] = 'operacion';
} elseif (!empty($estatusReq)) {
    $data['estatus'] = $estatusReq;
} else {
    $data['estatus'] = 'reserva';
}
```
**Efecto:** Cualquier unidad con servicio programado (como la 233) se consolida inmediatamente como `operacion`, impidiendo que el backend limpie sus campos. Solo si la unidad carece de servicio se vacían los campos operativos y se respeta el estatus de reserva o mantenimiento.

### B. Frontend (`CargaExcel.jsx`)
1. **Promoción automática a `'operacion'`:** En `handleUpdateRecord`, al asignar `TARJETON`, `RELEVO_TARJETON`, `RUTA`, `CORRIDAS` o `HORA_DE_ACOPLE`, si la unidad estaba inactiva (`reserva`, `mantenimiento`, `percance`, `no_programada`), su estatus cambia de inmediato a `'operacion'`.
2. **Eliminación del borrado silencioso de conductores:** Ya no se borran conductores colateralmente en otras filas. Si se asigna el mismo operador a dos unidades, la validación visual existente (`duplicados.length > 0`) le muestra una alerta SweetAlert al usuario antes de guardar para que él decida conscientemente si corregir o guardar.
3. **Normalización unificada de Económicos:** Se creó la función `normalizeEcoKey(eco)` y se indexaron los mapas de `baselineRef` y `frescos` por duplicado (clave cruda y clave sin ceros a la izquierda), asegurando compatibilidad 100% entre cualquier base de datos.
4. **Mejora en normalización de titulares:** `normalizarFilaServidor` ahora recupera el tarjetón titular incluso si el campo `TARJETON` crudo viene vacío pero `TARJETON_TITULAR` existe.

---

## 🛡️ 4. Guía de Verificación Rápida para Futuros Casos

Si en el futuro una unidad reporta que "no guarda" o "se borran sus datos":
1. **Verificar si tiene asignada Ruta o Conductor:** Si tiene servicio asignado, el estatus en la tabla debe decir `Operación` (fondo blanco/verde), no `Mantenimiento` ni `Reserva`.
2. **Revisar el formato del Económico:** Comprobar si en la tabla `unidades` el `numero_eco` tiene ceros a la izquierda (ej. `001`, `0233`). Gracias a `normalizeEcoKey`, el sistema maneja ambos formatos sin problemas.
3. **Validar duplicidad de conductor:** Si el conductor está asignado a otra unidad en operación, el diálogo de confirmación de duplicados aparecerá antes de guardar.
