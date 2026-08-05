# Reglas de Infraestructura y Despliegue en Producción

- **Entorno en Producción**: El proyecto ya se encuentra desplegado en un servidor remoto de producción (Rocky Linux 9 con Nginx proxy inverso, HTTPS y base de datos Neon PostgreSQL).
- **Prioridad de Producción**: Cualquier cambio realizado en el código (Frontend React/Vite o Backend Laravel) debe ser totalmente compatible tanto en desarrollo local como en producción.
- **URLs y Endpoints**: Nunca colocar URLs o puertos estáticos (ej. `http://` o `:8000`) en el código cliente. Usar siempre la configuración dinámica basada en `import.meta.env.PROD`.
- **Despliegue Directo**: Toda modificación debe compilar correctamente y ser subida a la rama `main` en Git de forma limpia, garantizando que para actualizar el servidor de producción solo se requiera ejecutar `git pull origin main` (o `./deploy.sh`) sin generar conflictos ni errores.
