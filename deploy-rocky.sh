#!/bin/bash
# ════════════════════════════════════════════════════════════════
# SCRIPT DE DESPLIEGUE AUTOMÁTICO PARA ROCKY LINUX
# Sistema de Despacho y Gestión de Flota - SITMAH
# ════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 INICIANDO DESPLIEGUE EN ROCKY LINUX - SITMAH${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# 1. Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}📦 Docker no detectado. Instalando Docker y Docker Compose en Rocky Linux...${NC}"
    sudo dnf install -y dnf-utils
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker instalado e iniciado correctamente.${NC}"
fi

# 2. Configurar variables de entorno si no existe .env
if [ ! -f .env ]; then
    echo -e "${BLUE}⚙️ Preparando archivo de variables .env...${NC}"
    cp .env.docker .env
fi

# 3. Construir y levantar contenedores en segundo plano
echo -e "${BLUE}🏗️ Construyendo imágenes e iniciando contenedores con Docker Compose...${NC}"
docker compose --env-file .env up -d --build

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📊 Estado de los contenedores:${NC}"
docker compose ps

echo ""
echo -e "${BLUE}🌐 Acceso al sistema:${NC}"
echo -e "   Frontend React (Nginx): https://$(hostname -I | awk '{print $1}')"
echo -e "   API Laravel:           https://$(hostname -I | awk '{print $1}'):8000"
echo -e "   Microservicio Node:    https://$(hostname -I | awk '{print $1}'):4000"
echo ""
