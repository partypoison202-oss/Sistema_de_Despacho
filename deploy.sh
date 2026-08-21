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
composer install --no-interaction --prefer-dist --optimize-autoloader

# Paso 4: Limpieza de caché de Laravel
echo -e "${BLUE}🧹 4. Limpiando caché de Laravel...${NC}"
php artisan optimize:clear

# Paso 5: Asignación de permisos en storage y bootstrap/cache ANTES de ejecutar artisan
echo -e "${BLUE}🔐 5. Asignando permisos críticos a storage y bootstrap/cache...${NC}"
chmod -R 775 storage bootstrap/cache

# Paso 6: Ejecución de migraciones (solo estructura, CERO inserts)
echo -e "${BLUE}🗄️ 6. Ejecutando migraciones de base de datos (solo nuevas tablas/cambios)...${NC}"
php artisan migrate --force

cd ..

# Paso 7: Reinicio del servicio web Nginx
echo -e "${BLUE}🔄 7. Reiniciando servicio web Nginx...${NC}"
systemctl restart nginx || sudo systemctl restart nginx
systemctl restart php-fpm || sudo systemctl restart php-fpm || true

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE EN PRODUCCIÓN${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
