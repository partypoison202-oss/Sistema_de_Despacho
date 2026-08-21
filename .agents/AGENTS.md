# Reglas de Infraestructura y Despliegue en Producción

- **Entorno en Producción**: El proyecto ya se encuentra desplegado en un servidor remoto de producción (Rocky Linux 9 con Nginx proxy inverso, HTTPS y base de datos Neon PostgreSQL).
- **Prioridad de Producción**: Cualquier cambio realizado en el código (Frontend React/Vite o Backend Laravel) debe ser totalmente compatible tanto en desarrollo local como en producción.
- **URLs y Endpoints**: Nunca colocar URLs o puertos estáticos (ej. `http://` o `:8000`) en el código cliente. Usar siempre la configuración dinámica basada en `import.meta.env.PROD`.
- **Despliegue Directo**: Toda modificación debe compilar correctamente y ser subida a la rama `main` en Git de forma limpia, garantizando que para actualizar el servidor de producción solo se requiera ejecutar `git pull origin main` (o `./deploy.sh`) sin generar conflictos ni errores.

# Congelamiento de Diseño (Reportes)

- **Diseño Intocable**: Queda estrictamente prohibido modificar la estructura visual, el diseño, la disposición de los elementos o los estilos de los reportes "Resumen de Despacho" (`ResumenDespacho.jsx`), "Centro de Control" (`CentroControl.jsx` / `generarPDFEstadisticasCentro.js`), y los Reportes Generales ("Reporte General de Unidades" y "Reporte General de Rutas") a menos que el usuario lo solicite expresa y detalladamente. Estos módulos ya se encuentran en su estado óptimo aprobado y se debe evitar cualquier refactorización estética para no perder tiempo.

# Cuidado Crítico con las Migraciones de Base de Datos

- **No Alterar Tablas Existentes Destructivamente**: Queda estrictamente prohibido alterar o eliminar columnas en las tablas existentes de la base de datos de producción (como `conductores`, `unidades`, `usuarios`) de manera que se rompa la compatibilidad con los datos activos. Cualquier cambio en las tablas debe ser aditivo o compatible con las estructuras existentes.
- **Evitar Duplicidad en Migraciones**: Las migraciones locales deben estar unificadas e integradas de forma limpia en el esquema general. No se deben crear archivos de migración duplicados o redundantes que puedan generar errores de tipo `Duplicate table` o `relation already exists` al ejecutarse en producción.
- **Prueba Previa Obligatoria**: Antes de subir cualquier cambio a producción que involucre base de datos, se debe validar en el entorno de desarrollo local que las migraciones corran limpiamente (`php artisan migrate:fresh --seed`) sin lanzar advertencias de tipos de datos o excepciones de claves foráneas.
