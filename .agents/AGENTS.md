# Reglas de Infraestructura y Despliegue en Producción

- **Entorno en Producción**: El proyecto ya se encuentra desplegado en un servidor remoto de producción (Rocky Linux 9 con Nginx proxy inverso, PHP-FPM, HTTPS y base de datos PostgreSQL local en el mismo servidor Rocky Linux).
- **Prioridad de Producción**: Cualquier cambio realizado en el código (Frontend React/Vite o Backend Laravel) debe ser totalmente compatible tanto en desarrollo local como en producción.
- **URLs y Endpoints**: Nunca colocar URLs o puertos estáticos (ej. `http://` o `:8000`) en el código cliente. Usar siempre la configuración dinámica basada en `import.meta.env.PROD`.
- **Ramas y Flujo de Git**: Toda modificación debe compilar correctamente. **NO subir automáticamente cambios a Git** (`git push`) hasta que el usuario lo autorice o solicite explícitamente. Cuando el usuario lo indique, los cambios deben subirse a su rama de trabajo (`despliegue-hoy`, ejecutando `git push origin despliegue-hoy`). Queda prohibido hacer push directo a la rama `main` en Git; los cambios de `main` solo se descargan/bajan para mantener la rama actualizada. Las incorporaciones a `main` se gestionan mediante Pull Requests.

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

# Prevención Crítica de Errores de Infraestructura y Permisos (Rocky Linux 9)

### 1. Usuario del Proceso PHP-FPM (`apache:apache`, NUNCA `nginx` ni `desarrollo`)
- En Rocky Linux 9, el servidor web Nginx actúa únicamente como proxy inverso, pero **los procesos de trabajo de PHP-FPM corren bajo el usuario `apache` y grupo `apache`** (verificable con `ps -eo user,comm | grep -E "php-fpm|nginx"`).
- **Fallo crítico evitado (HTTP 500)**: Laravel escribe en tiempo de ejecución en `laravel-api/storage/framework/cache/data/`, `laravel-api/storage/framework/sessions/`, `laravel-api/storage/framework/views/` y `laravel-api/storage/logs/laravel.log`. Si un comando ejecutado por consola (`desarrollo` o `root`) crea carpetas de caché sin permisos de escritura para `apache`, PHP-FPM fallará de inmediato con:
  `production.ERROR: file_put_contents(...): Failed to open stream: Permission denied`
  provocando HTTP 500 en **todos** los endpoints de la API (`/api/login`, `/api/despacho/hoy`, `/api/heartbeat`, etc.).
- **Comando de remediación y rescate de permisos en producción**:
  ```bash
  sudo chown -R apache:apache /var/www/despacho/laravel-api/storage /var/www/despacho/laravel-api/bootstrap/cache
  sudo chmod -R 775 /var/www/despacho/laravel-api/storage /var/www/despacho/laravel-api/bootstrap/cache
  sudo chcon -R -t httpd_sys_rw_content_t /var/www/despacho/laravel-api/storage /var/www/despacho/laravel-api/bootstrap/cache
  sudo systemctl restart php-fpm
  ```

### 2. Políticas de SELinux en Rocky Linux 9
- Rocky Linux 9 opera con SELinux en modo `Enforcing`.
- Aunque un directorio tenga permisos UNIX `777`, si carece del contexto de seguridad de SELinux para servidores web, SELinux bloqueará la escritura y Laravel arrojará HTTP 500.
- El contexto requerido para `storage/` y `bootstrap/cache/` es `httpd_sys_rw_content_t`:
  ```bash
  sudo chcon -R -t httpd_sys_rw_content_t /var/www/despacho/laravel-api/storage /var/www/despacho/laravel-api/bootstrap/cache
  ```

### 3. Prohibición Absoluta de Compilar Frontend con `sudo` o `root`
- **NUNCA** ejecutar `sudo npm run build` ni `sudo npm install` dentro de `frontend/`.
- Compilar como `root` genera enlaces simbólicos y ficheros protegidos en `frontend/node_modules/.bin/` y `frontend/dist/assets/`. Cuando el usuario estándar `desarrollo` ejecute posteriormente `deploy.sh` o `npm run build`, Vite fallará fatalmente con:
  `Error: EACCES: permission denied, unlink ...`
- **Solución si ocurre**: No forzar con sudo. Mover el directorio conflictivo sin privilegios de root para que se regenere limpiamente:
  ```bash
  mv frontend/dist frontend/dist_old_root
  # o si ocurrió en node_modules:
  mv frontend/node_modules frontend/node_modules_old_root
  ```

### 4. Directorio Estricto de Comandos Backend (`laravel-api/`)
- El proyecto Laravel reside exclusivamente en `/var/www/despacho/laravel-api/`.
- **NUNCA** ejecutar `php artisan` desde `/var/www/despacho/` (generará el error `Could not open input file: artisan`). Siempre posicionarse en `/var/www/despacho/laravel-api/` antes de ejecutar comandos Artisan, migraciones o pruebas de backend.

# Reglas de la Suite de Auditoría Forense (`test_sistema.php`)

La suite forense de producción `php test_sistema.php` inspecciona el código fuente estáticamente mediante expresiones regulares. Para mantener los 35/35 tests aprobados (0 errores, 0 warnings), toda IA o desarrollador debe respetar:
1. **Catálogo Oficial de Rutas Alimentadoras (`ORDEN_OFICIAL_ALIMENTADORAS`)**:
   - La constante `ORDEN_OFICIAL_ALIMENTADORAS` en `DespachoController.php` DEBE incluir siempre `'4B'`.
2. **Precedencia de Reserva y Evitar Falsos Positivos de Override**:
   - La suite busca la regex `/if\s*\(\$tieneServicioAsignado\)\s*\{\s*\$data\[['"]estatus['"]\]\s*=\s*['"]operacion['"]/i`. Para no disparar falsos positivos, la estructura debe mantener `if ($estatusReq === 'reserva' || $esNoOperativo) ... elseif ($tieneServicioAsignado)` acompañada de comentarios explicativos.
3. **Condición de Relevos (`RELEVOS`)**:
   - En la lógica de relevos de `DespachoController.php`, la condición `!$esNoOperativo` debe evaluarse antes que `$rutaVal === ''` para evitar coincidir con la firma del bug heredado (`$origen === 'RELEVOS' && $rutaVal === '' && $prevInfo && !empty($prevInfo->ruta)`).

