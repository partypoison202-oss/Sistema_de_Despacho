# Reglas de Infraestructura y Permisos en Rocky Linux 9 (Prevención de Error 500)

## 1. Identidad del Proceso PHP-FPM
- En Rocky Linux 9, el servicio web Nginx funciona como reverse proxy, pero el intérprete PHP se ejecuta mediante **PHP-FPM con el usuario y grupo `apache:apache`**.
- El usuario `nginx` NO ejecuta PHP.
- El usuario `desarrollo` NO ejecuta PHP en producción.
- **Regla Estricta**: Las carpetas `storage/` y `bootstrap/cache/` de Laravel DEBEN tener propietario `apache:apache` y permisos `775` o `777`. De lo contrario, cualquier petición que intente escribir sesión o caché (como `/api/login`, `/api/heartbeat`, `/api/despacho/hoy`) arrojará **HTTP 500: Failed to open stream: Permission denied**.

## 2. Comando de Rescate y Restablecimiento de Permisos
Si ocurre un Error 500 en producción tras un despliegue o borrado manual de caché, ejecutar inmediatamente:
```bash
cd /var/www/despacho/laravel-api
sudo chown -R apache:apache storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo chcon -R -t httpd_sys_rw_content_t storage bootstrap/cache
sudo systemctl restart php-fpm
```

## 3. SELinux en Rocky Linux 9
- Rocky Linux 9 utiliza SELinux en modo `Enforcing`.
- Todo archivo o directorio dentro de `storage/` y `bootstrap/cache/` debe poseer la etiqueta de contexto `httpd_sys_rw_content_t`. Sin este contexto, el kernel bloqueará la escritura sin importar los permisos UNIX 777.

## 4. Prohibición de Compilar Frontend con sudo / root
- **NUNCA** ejecutar `sudo npm run build` o `sudo npm install` dentro de `frontend/`.
- Hacerlo deja enlaces y ficheros con dueño `root` en `node_modules/.bin/` y `frontend/dist/`, bloqueando despliegues posteriores del usuario `desarrollo` con `EACCES: permission denied, unlink`.
- Si esto sucede, se debe mover la carpeta sin sudo:
  ```bash
  mv frontend/dist frontend/dist_old_root
  # o si fue en node_modules:
  mv frontend/node_modules frontend/node_modules_old_root
  ```

## 5. Directorio de Ejecución de Comandos Laravel
- Laravel reside en `/var/www/despacho/laravel-api/`.
- No ejecutar `php artisan` desde `/var/www/despacho/`. Siempre ingresar primero con `cd /var/www/despacho/laravel-api`.
