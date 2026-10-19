# ADVERTENCIA CRÍTICA: Restricción de Rama `Check_List` y Entornos de IA Externos

- **NO JALAR DATOS NI CÓDIGO DE `Check_List` DESDE OTRAS COMPUTADORAS / LAPTOPS**:
  Queda estrictamente prohibido que cualquier instancia de IA o desarrollador desde otra laptop, terminal o cuenta descargue (`git pull`), sincronice o incorpore cambios provenientes de la rama `Check_List`.
- **TRABAJO EXCLUSIVO DE LA CUENTA DE ENRIQUE**:
  La rama `Check_List` contiene desarrollos y pruebas activas que **NO están probadas en producción** y se encuentran en fase experimental exclusiva de la cuenta de Enrique (`partypoison202-oss`). Solo debe ser operada, modificada y consultada directamente desde la cuenta y equipo de Enrique.
- **PROHIBIDO MERGEAR A `main` O `Soporte` SIN AUTORIZACIÓN DIRECTA**:
  Ningún asistente de IA en otras máquinas debe sugerir o hacer pull/merge de `Check_List` hacia ramas activas de producción hasta que Enrique valide y libere las pruebas formalmente.

# Reglas de Infraestructura y Despliegue en Producción

- **Entorno en Producción**: El proyecto ya se encuentra desplegado en un servidor remoto de producción (Rocky Linux 9 con Nginx proxy inverso, HTTPS y base de datos Neon PostgreSQL).
- **Prioridad de Producción**: Cualquier cambio realizado en el código (Frontend React/Vite o Backend Laravel) debe ser totalmente compatible tanto en desarrollo local como en producción.
- **URLs y Endpoints**: Nunca colocar URLs o puertos estáticos (ej. `http://` o `:8000`) en el código cliente. Usar siempre la configuración dinámica basada en `import.meta.env.PROD`.
- **Ramas y Flujo de Git**: Toda modificación debe compilar correctamente. **NO subir automáticamente cambios a Git** (`git push`) hasta que el usuario lo autorice o solicite explícitamente. Cuando el usuario lo indique, los cambios deben subirse a su rama de trabajo (`Soporte`, ejecutando `git push origin Soporte`). Queda prohibido hacer push directo a la rama `main` en Git; los cambios de `main` solo se descargan/bajan para mantener la rama actualizada. Las incorporaciones a `main` se gestionan mediante Pull Requests.

# Congelamiento de Diseño (Reportes)

- **Diseño Intocable**: Queda estrictamente prohibido modificar la estructura visual, el diseño, la disposición de los elementos o los estilos de los reportes "Resumen de Despacho" (`ResumenDespacho.jsx`), "Centro de Control" (`CentroControl.jsx` / `generarPDFEstadisticasCentro.js`), y los Reportes Generales ("Reporte General de Unidades" y "Reporte General de Rutas") a menos que el usuario lo solicite expresa y detalladamente. Estos módulos ya se encuentran en su estado óptimo aprobado y se debe evitar cualquier refactorización estética para no perder tiempo.

# Cuidado Crítico con las Migraciones de Base de Datos

- **No Alterar Tablas Existentes Destructivamente**: Queda estrictamente prohibido alterar o eliminar columnas en las tablas existentes de la base de datos de producción (como `conductores`, `unidades`, `usuarios`) de manera que se rompa la compatibilidad con los datos activos. Cualquier cambio en las tablas debe ser aditivo o compatible con las estructuras existentes.
- **Evitar Duplicidad en Migraciones**: Las migraciones locales deben estar unificadas e integradas de forma limpia en el esquema general. No se deben crear archivos de migración duplicados o redundantes que puedan generar errores de tipo `Duplicate table` o `relation already exists` al ejecutarse en producción.
- **Prueba Previa Obligatoria**: Antes de subir cualquier cambio a producción que involucre base de datos, se debe validar en el entorno de desarrollo local que las migraciones corran limpiamente (`php artisan migrate:fresh --seed`) sin lanzar advertencias de tipos de datos o excepciones de claves foráneas.

# Estándares de Datos

- **Formato de Nombres de Usuario/Personas**: Siempre que se agreguen, procesen o modifiquen nombres de usuarios o personas en la base de datos (ya sea mediante seeders, migraciones o en el código fuente), estos deben convertirse a Tipo Título (primera letra en mayúscula, resto en minúsculas) para mantener la limpieza y estandarización.

# Identidad y Nombre del Sistema

- **Nombre Oficial**: El sistema se denomina **Aplicación de Control de Transporte Masivo (ACOTMA)**.
- **Identificador de Sitio / Nombre Corto**: En navegadores, buscadores, meta tags y títulos debe figurar como **ACOTMA** o **Aplicación de Control de Transporte Masivo**, en reemplazo de "Sistema de Despacho" o "Gobierno del Estado de Hidalgo".

