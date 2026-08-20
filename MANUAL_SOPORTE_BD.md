# 📖 Manual de Soporte de Base de Datos y Despliegue (STM-SITMAH)

Este manual está diseñado para administradores de sistemas o personal no técnico/desarrollador que necesite solucionar problemas con la base de datos o desplegar cambios en el servidor Rocky Linux 9.

---

## 🚀 1. Procedimiento de Despliegue Estándar

El despliegue está automatizado para que requiera el menor número de comandos posibles.

### Si el servidor usa Docker (Recomendado)
Para actualizar todo el sistema (Frontend, Backend y Base de Datos) a la última versión, ejecuta en la terminal del servidor:
```bash
cd /root/Sistema_de_Despacho
git pull origin main
docker compose up -d --build
```
> **Nota:** El contenedor de Laravel está configurado para ejecutar automáticamente todas las nuevas migraciones y los cargadores de datos (Seeders) al iniciar. **No necesitas ejecutar comandos de BD manuales.**

### Si el servidor no usa Docker (Despliegue Tradicional)
Ejecuta el script de despliegue estandarizado:
```bash
cd /root/Sistema_de_Despacho
bash deploy.sh
```

---

## 🗄️ 2. Comandos Manuales de Emergencia (Base de Datos)

Si necesitas forzar o corregir algo de la base de datos manualmente, ejecuta estos comandos desde la carpeta raíz del proyecto en el servidor:

### A. Ejecutar Migraciones (Si se crearon tablas nuevas o modificaciones)
```bash
docker compose exec -it laravel-api php artisan migrate --force
```

### B. Cargar Datos Base / Sembrar Datos (Roles, Administrador y Catálogos)
Si la base de datos fue borrada o está vacía, puedes restaurar los roles y crear el usuario administrador inicial ejecutando:
```bash
docker compose exec -it laravel-api php artisan db:seed --force
```
* **Usuario Creado:** `Admin`
* **Contraseña Temporal:** `password`
* **Rol:** `ADMINISTRADOR` (activo y con correo `admin@sitmah.gob.mx`).

### C. Reconstruir la Base de Datos desde Cero (⚠️ ¡BORRA TODOS LOS DATOS!)
Si la base de datos local está corrupta y quieres limpiarla por completo y volver a crearla vacía con los datos de inicio:
```bash
docker compose exec -it laravel-api php artisan migrate:fresh --seed --force
```

---

## 🛠️ 3. Resolución de Errores Comunes

### ❌ Error: "Connection refused" o "Could not connect to database"
* **Causa:** El contenedor de Laravel no puede comunicarse con la base de datos PostgreSQL.
* **Solución (Si la base de datos es local en Docker):**
  1. Verifica que el contenedor de la base de datos esté corriendo y saludable:
     ```bash
     docker compose ps
     ```
  2. Si el contenedor `despacho-db` está caído, reinícialo:
     ```bash
     docker compose restart db
     ```
* **Solución (Si la base de datos es externa/Neon PostgreSQL):**
  1. Abre el archivo `.env` en la raíz de `laravel-api/`:
     ```bash
     nano laravel-api/.env
     ```
  2. Asegúrate de que las credenciales (`DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) coincidan exactamente con tu consola de Neon.
  3. Limpia la caché para aplicar los cambios de credenciales:
     ```bash
     docker compose exec -it laravel-api php artisan config:clear
     ```

### ❌ Error: "column [nombre] does not exist" o "relation [tabla] does not exist"
* **Causa:** La estructura de la base de datos está desactualizada (faltan tablas o columnas que el código nuevo necesita).
* **Solución:** Fuerza la ejecución de migraciones pendientes:
  ```bash
  docker compose exec -it laravel-api php artisan migrate --force
  ```

### ❌ Error: El usuario administrador "Admin" no puede iniciar sesión
* **Causa:** La contraseña fue modificada/olvidada o el usuario fue desactivado.
* **Solución:** Ejecuta el seeder específico para restablecer o crear el usuario Admin:
  ```bash
  docker compose exec -it laravel-api php artisan db:seed --class=AdminUserSeeder --force
  ```
  *(Esto creará al usuario o lo reactivará, restableciendo su contraseña a `password` en caso de que haya sido borrado, pero mantendrá la contraseña actual si el usuario ya existe para evitar sobrescrituras accidentales).*

### ❌ Error: Pantalla en blanco en la web / Error 500
* **Causa:** Caché corrupta de Laravel tras actualizar el código.
* **Solución:** Ejecuta la limpieza de caché optimizada de producción:
  ```bash
  docker compose exec -it laravel-api php artisan optimize:clear
  ```

---
*Manual elaborado para el proyecto Sistema de Despacho y Gestión de Flota - SITMAH.*
