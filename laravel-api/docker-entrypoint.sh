#!/bin/sh
set -e

echo "⏳ Esperando a que la base de datos PostgreSQL esté lista..."
until nc -z -v -w30 db 5432; do
  echo "Esperando conexión con el contenedor 'db' en el puerto 5432..."
  sleep 2
done

echo "✅ Base de datos lista."

# Generar APP_KEY si no está configurada
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "SomeRandomString32CharsLongExactly" ]; then
  echo "🔑 Generando APP_KEY para Laravel..."
  php artisan key:generate --force || true
fi

echo "🔄 Ejecutando migraciones de la base de datos..."
php artisan migrate --force

echo "🌱 Sembrando datos base (Seeders)..."
php artisan db:seed --force

echo "🔗 Creando acceso directo de almacenamiento (storage:link)..."
php artisan storage:link --force || true

echo "🚀 Iniciando servidor de API Laravel en 0.0.0.0:8000..."
exec php artisan serve --host=0.0.0.0 --port=8000
