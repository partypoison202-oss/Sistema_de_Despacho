#!/bin/bash
# ════════════════════════════════════════════════════════════════
# SCRIPT DE DESPLIEGUE ESTANDARIZADO PARA PRODUCCIÓN (ROCKY LINUX 9)
# Sistema de Despacho y Gestión de Flota - ACOTMA / SITMAH
# ════════════════════════════════════════════════════════════════

set -e

# ── Colores para la interfaz de consola ────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

BRANCH="${1:-main}"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}🔍 VERIFICACIÓN Y DIAGNÓSTICO PREVIO AL DESPLIEGUE (ACOTMA)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# ── 1. Consultar estado remoto sin alterar archivos locales ───
echo -e "${CYAN}📡 Consultando actualizaciones en GitHub (origin/${BRANCH})...${NC}"
git fetch origin "$BRANCH" --quiet

CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "desconocido")
REMOTE_COMMIT=$(git rev-parse --short "origin/$BRANCH" 2>/dev/null || echo "desconocido")
COMMITS_COUNT=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo "0")

echo -e "   • Rama de destino:  ${BOLD}${BRANCH}${NC}"
echo -e "   • Commit local:     ${BOLD}${CURRENT_COMMIT}${NC}"
echo -e "   • Commit en GitHub: ${BOLD}${REMOTE_COMMIT}${NC}"

if [ "$COMMITS_COUNT" -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}ℹ️  El servidor ya se encuentra al día con origin/${BRANCH}.${NC}"
    echo -e "${YELLOW}   No hay commits nuevos pendientes por descargar.${NC}"
    echo ""
    # Leer confirmación (compatible con sudo /dev/tty)
    if [ -t 0 ]; then
        read -r -p "¿Deseas forzar la re-compilación y mantenimiento de caché de todos modos? [s/N]: " FORZAR
    else
        read -r -p "¿Deseas forzar la re-compilación y mantenimiento de caché de todos modos? [s/N]: " FORZAR </dev/tty || FORZAR="n"
    fi

    if [[ ! "$FORZAR" =~ ^[sS]$ ]]; then
        echo -e "\n${GREEN}✔ Operación finalizada sin cambios. El servidor sigue activo.${NC}\n"
        exit 0
    fi
else
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}📋 RESUMEN DETALLADO DE ACTUALIZACIONES PENDIENTES (${COMMITS_COUNT} commits)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

    # Mostrar commits con autor, fecha relativa y descripción completa
    git log "HEAD..origin/$BRANCH" --format="format:%n  🔹 %C(bold)%s%C(reset)%n     %C(cyan)Autor:%C(reset) %an (%cr)%n%n     %C(yellow)Descripción:%C(reset)%n%b" | sed 's/^/   /'
    echo ""

    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}${BOLD}📁 ARCHIVOS MODIFICADOS:${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    git diff --stat "HEAD..origin/$BRANCH" | sed 's/^/   /'

    # Detección inteligente de módulos de negocio impactados
    DIFF_FILES=$(git diff --name-only "HEAD..origin/$BRANCH")

    echo ""
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    echo -e "${YELLOW}${BOLD}🛠️  DIAGNÓSTICO DE IMPACTO EN EL SISTEMA:${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"

    if echo "$DIFF_FILES" | grep -qE "database/migrations"; then
        echo -e "   ${RED}⚠️  [Base de Datos]:${NC} Detectadas NUEVAS migraciones (se ejecutarán con migrate --force)."
    else
        echo -e "   ${GREEN}✔  [Base de Datos]:${NC} Sin cambios estructurales (cero riesgo en base de datos)."
    fi

    if echo "$DIFF_FILES" | grep -qE "Historial|Bitacora"; then
        echo -e "   ${GREEN}✔  [Mantenimiento y Taller]:${NC} Actualizaciones en historial operativo, bitácora o reportes."
    fi

    if echo "$DIFF_FILES" | grep -qE "DespachoController|despacho"; then
        echo -e "   ${GREEN}✔  [Despacho y Flota]:${NC} Ajustes en corte operativo, asignaciones o relevos."
    fi

    if echo "$DIFF_FILES" | grep -qE "^frontend/"; then
        echo -e "   ${CYAN}✔  [Frontend React/Vite]:${NC} Cambios en interfaz detectados (se compilará el bundle)."
    else
        echo -e "   ${BLUE}ℹ️  [Frontend React/Vite]:${NC} Sin modificaciones en la interfaz."
    fi

    if echo "$DIFF_FILES" | grep -qE "composer\.json|composer\.lock"; then
        echo -e "   ${YELLOW}✔  [Backend Composer]:${NC} Nuevas librerías PHP detectadas (composer install requerido)."
    fi

    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    
    # Pregunta de confirmación obligatoria
    if [ -t 0 ]; then
        read -r -p "¿Deseas proceder con el despliegue a Producción? [s/N]: " CONFIRMAR
    else
        read -r -p "¿Deseas proceder con el despliegue a Producción? [s/N]: " CONFIRMAR </dev/tty || CONFIRMAR="n"
    fi

    if [[ ! "$CONFIRMAR" =~ ^[sS]$ ]]; then
        echo ""
        echo -e "${RED}❌ Despliegue cancelado por el usuario.${NC}"
        echo -e "${YELLOW}ℹ️  No se descargó ningún commit ni se reinició ningún servicio.${NC}\n"
        exit 0
    fi
fi

echo ""
echo -e "${GREEN}🚀 PROCEDIENDO CON EL DESPLIEGUE EN PRODUCCIÓN...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# ── Detectar rutas de composer y php ───────────────────────────
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
echo -e "\n${BLUE}📥 1. Descargando cambios desde Git (git pull origin ${BRANCH})...${NC}"
git pull origin "$BRANCH"

# Paso 2: Instalación de dependencias del frontend y compilación con Vite
echo -e "\n${BLUE}📦 2. Instalando dependencias y compilando Frontend (Vite)...${NC}"
cd frontend
npm ci --ignore-scripts
npm run build
cd ..

# Paso 3: Instalación de dependencias del backend optimizadas para producción
echo -e "\n${BLUE}🐘 3. Instalando dependencias de Laravel (Composer)...${NC}"
cd laravel-api
"$COMPOSER_BIN" install --no-interaction --prefer-dist --optimize-autoloader

# Paso 4: Limpieza y optimización de caché de Laravel
echo -e "\n${BLUE}🧹 4. Limpiando y optimizando caché de Laravel...${NC}"
"$PHP_BIN" artisan optimize:clear

# Paso 5: Asignación de permisos en storage y bootstrap/cache ANTES de ejecutar artisan
echo -e "\n${BLUE}🔐 5. Asignando permisos críticos a storage y bootstrap/cache...${NC}"
chmod -R 777 storage bootstrap/cache

# Paso 5.5: Corregir permisos estructurales y columnas de mantenimiento
echo -e "\n${BLUE}🛠️ 5.5. Ejecutando reparador interno de base de datos...${NC}"
"$PHP_BIN" artisan db:arreglar-permisos || true

# Paso 6: Ejecución de migraciones (solo estructura, CERO inserts)
echo -e "\n${BLUE}🗄️ 6. Ejecutando migraciones de base de datos (solo nuevas tablas/cambios)...${NC}"
"$PHP_BIN" artisan migrate --force

# Paso 6.5: Garantizar permisos y propiedad post-artisan en storage y logs
echo -e "\n${BLUE}🔐 6.5. Asegurando permisos post-artisan en storage y logs...${NC}"
mkdir -p storage/logs
touch storage/logs/laravel.log
chmod -R 777 storage bootstrap/cache
chmod 666 storage/logs/laravel.log 2>/dev/null || chmod 777 storage/logs/laravel.log 2>/dev/null || true
chown -R nginx:nginx storage bootstrap/cache 2>/dev/null || chown -R apache:apache storage bootstrap/cache 2>/dev/null || chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

cd ..

# Paso 7: Reinicio del servicio web Nginx y PHP-FPM
echo -e "\n${BLUE}🔄 7. Reiniciando servicio web Nginx y PHP-FPM...${NC}"
systemctl restart nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || true
systemctl restart php-fpm 2>/dev/null || sudo systemctl restart php-fpm 2>/dev/null || true

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE EN PRODUCCIÓN${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}\n"
