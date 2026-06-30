#!/bin/bash

# Script para levantar todos los servicios de Sistema de Despacho en paralelo
# Uso: ./run-dev.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_DIR/logs"

# Crear directorio de logs
mkdir -p "$LOGS_DIR"

echo "════════════════════════════════════════════════════════════════"
echo "🚀 Iniciando Sistema de Despacho..."
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Trap para limpiar procesos al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}⛔ Deteniendo servicios...${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    kill $(jobs -p) 2>/dev/null || true
    wait $(jobs -p) 2>/dev/null || true
    echo -e "${YELLOW}✅ Servicios detenidos${NC}"
}

trap cleanup EXIT INT TERM

# Función para iniciar un servicio
start_service() {
    local name="$1"
    local dir="$2"
    local command="$3"
    local port="$4"
    local log_file="$LOGS_DIR/${name}.log"
    
    echo -e "${BLUE}📦 Iniciando $name en $dir...${NC}"
    
    cd "$dir"
    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    
    echo -e "${GREEN}✅ $name iniciado (PID: $pid)${NC}"
    echo -e "${GREEN}   Puerto: $port${NC}"
    echo -e "${GREEN}   Log: $log_file${NC}"
}

echo ""
echo -e "${BLUE}Iniciando servicios en modo desarrollo...${NC}"
echo ""

# Iniciar Frontend
start_service "Frontend" \
    "$PROJECT_DIR/frontend" \
    "npm run dev" \
    "5173"

sleep 2

# Iniciar Laravel API
start_service "Laravel API" \
    "$PROJECT_DIR/laravel-api" \
    "php -d extension=pdo_pgsql -d extension=pgsql artisan serve" \
    "8000"

sleep 2

# Iniciar Backend Node (opcional)
start_service "Backend Node" \
    "$PROJECT_DIR/backend" \
    "npm run dev" \
    "4000"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Todos los servicios iniciados${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}🌐 Accede a la aplicación en:${NC}"
echo -e "${YELLOW}   Frontend:    http://localhost:5173${NC}"
echo -e "${YELLOW}   Laravel API: http://localhost:8000${NC}"
echo -e "${YELLOW}   Backend:     http://localhost:4000 (opcional)${NC}"
echo ""
echo -e "${YELLOW}📋 Ver logs:${NC}"
echo -e "${YELLOW}   Frontend:    tail -f $LOGS_DIR/Frontend.log${NC}"
echo -e "${YELLOW}   Laravel:     tail -f $LOGS_DIR/Laravel\ API.log${NC}"
echo -e "${YELLOW}   Backend:     tail -f $LOGS_DIR/Backend\ Node.log${NC}"
echo ""
echo -e "${YELLOW}⛔ Para detener: Presiona Ctrl+C${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Mantener el script activo
wait
