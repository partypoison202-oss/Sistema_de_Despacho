#!/bin/bash
# ════════════════════════════════════════════════════════════════
# SCRIPT DE DESPLIEGUE ESTANDARIZADO PARA PRODUCCIÓN (ROCKY LINUX 9)
# Sistema de Despacho y Gestión de Flota - SITMAH
# ════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 INICIANDO DESPLIEGUE ESTANDARIZADO EN PRODUCCIÓN${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# ── Detectar rutas de composer y php ──────────────────────────────────────────
COMPOSER_BIN=""
for candidate in \
    "$(which composer 2>/dev/null)" \
    "/usr/local/bin/composer" \
    "/usr/bin/composer" \
    "$HOME/.local/bin/composer" \
    "$HOME/.composer/vendor/bin/composer" \
    "/opt/homebrew/bin/composer"; do
    if [ -x "$candidate" ]; then
        COMPOSER_BIN="$candidate"
        break
    fi
done

if [ -z "$COMPOSER_BIN" ]; then
    echo -e "${RED}❌ No se encontró 'composer'. Instálalo con:${NC}"
    echo -e "${YELLOW}   curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer${NC}"
    exit 1
fi

echo -e "${GREEN}✔ Usando composer: ${COMPOSER_BIN}${NC}"

PHP_BIN=""
for candidate in \
    "$(which php 2>/dev/null)" \
    "/usr/bin/php" \
    "/usr/local/bin/php"; do
    if [ -x "$candidate" ]; then
        PHP_BIN="$candidate"
        break
    fi
done

if [ -z "$PHP_BIN" ]; then
    echo -e "${RED}❌ No se encontró 'php'.${NC}"
    exit 1
fi
echo -e "${GREEN}✔ Usando php: ${PHP_BIN}${NC}"

# Paso 1: Actualizar código desde Git
echo -e "${BLUE}📥 1. Actualizando repositorio (git pull origin main)...${NC}"
git pull origin main

# Paso 2: Instalación de dependencias del frontend y compilación con Vite
echo -e "${BLUE}📦 2. Instalando dependencias y compilando Frontend (Vite)...${NC}"
cd frontend
npm ci --ignore-scripts
npm run build
cd ..

# Paso 3: Instalación de dependencias del backend optimizadas para producción
echo -e "${BLUE}🐘 3. Instalando dependencias de Laravel (Composer)...${NC}"
cd laravel-api
"$COMPOSER_BIN" install --no-interaction --prefer-dist --optimize-autoloader

# Paso 4: Limpieza de caché de Laravel
echo -e "${BLUE}🧹 4. Limpiando caché de Laravel...${NC}"
"$PHP_BIN" artisan optimize:clear

# Paso 5: Asignación de permisos en storage y bootstrap/cache ANTES de ejecutar artisan
echo -e "${BLUE}🔐 5. Asignando permisos críticos a storage y bootstrap/cache...${NC}"
chmod -R 775 storage bootstrap/cache

# Paso 6: Ejecución de migraciones (solo estructura, CERO inserts)
echo -e "${BLUE}🗄️ 6. Ejecutando migraciones de base de datos (solo nuevas tablas/cambios)...${NC}"
"$PHP_BIN" artisan migrate --force

cd ..

# Paso 7: Reinicio del servicio web Nginx
echo -e "${BLUE}🔄 7. Reiniciando servicio web Nginx...${NC}"
systemctl restart nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || true
systemctl restart php-fpm 2>/dev/null || sudo systemctl restart php-fpm 2>/dev/null || true

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE EN PRODUCCIÓN${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
