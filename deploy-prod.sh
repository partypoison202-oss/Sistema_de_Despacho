#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Deploy to Production - Sistema de Despacho SITMAH
# Uso: ./deploy-prod.sh "mensaje del cambio"
# ══════════════════════════════════════════════════════════════

# ── CONFIGURACIÓN (Ajusta estos valores) ──
SERVER_USER="root"                    # Usuario SSH del servidor
SERVER_IP="10.16.17.78"               # IP del servidor Rocky Linux
SERVER_PROJECT_DIR="/root/Sistema_de_Despacho"  # Ruta del proyecto en el servidor
BRANCH="main"

# ── COLORES ──
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ── MENSAJE DEL COMMIT ──
COMMIT_MSG="${1:-Actualización de producción $(date '+%Y-%m-%d %H:%M')}"

echo -e "${YELLOW}══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  🚀 Deploy a Producción - SITMAH${NC}"
echo -e "${YELLOW}══════════════════════════════════════════${NC}"

# Paso 1: Guardar cambios locales
echo -e "\n${GREEN}[1/4]${NC} Guardando cambios locales..."
git add -A
git commit -m "$COMMIT_MSG" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "  ✅ Cambios guardados: ${COMMIT_MSG}"
else
    echo -e "  ℹ️  No hay cambios nuevos para guardar"
fi

# Paso 2: Subir a GitHub
echo -e "\n${GREEN}[2/4]${NC} Subiendo a GitHub (rama ${BRANCH})..."
git push origin "$BRANCH"
if [ $? -ne 0 ]; then
    echo -e "  ${RED}❌ Error al subir a GitHub${NC}"
    exit 1
fi
echo -e "  ✅ Código subido exitosamente"

# Paso 3: Conectar al servidor y desplegar
echo -e "\n${GREEN}[3/4]${NC} Conectando al servidor y desplegando..."
ssh "${SERVER_USER}@${SERVER_IP}" << 'REMOTE_COMMANDS'
    cd /root/Sistema_de_Despacho || exit 1

    echo "  🔄 Bajando cambios de GitHub..."
    git pull origin main

    echo "  🔨 Reconstruyendo contenedores con cambios..."
    docker compose up -d --build

    echo "  🧹 Limpiando imágenes anteriores..."
    docker image prune -f

    echo "  📊 Estado de los contenedores:"
    docker compose ps
REMOTE_COMMANDS

if [ $? -ne 0 ]; then
    echo -e "  ${RED}❌ Error al conectar con el servidor${NC}"
    exit 1
fi

# Paso 4: Listo
echo -e "\n${GREEN}[4/4]${NC} ¡Despliegue completado! 🎉"
echo -e "${YELLOW}══════════════════════════════════════════${NC}"
echo -e "  🌐 Tu sistema ya está actualizado en producción"
echo -e "  📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${YELLOW}══════════════════════════════════════════${NC}"
