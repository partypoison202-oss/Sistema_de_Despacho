#!/bin/sh
set -e

DB_HOST_TO_CHECK=${DB_HOST:-db}
DB_PORT_TO_CHECK=${DB_PORT:-5432}
echo "⏳ Esperando a que la base de datos PostgreSQL ($DB_HOST_TO_CHECK:$DB_PORT_TO_CHECK) esté lista..."
until nc -z -v -w30 "$DB_HOST_TO_CHECK" "$DB_PORT_TO_CHECK"; do
  echo "Esperando conexión con la base de datos en $DB_HOST_TO_CHECK:$DB_PORT_TO_CHECK..."
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
