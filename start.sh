#!/bin/bash

# Script para levantar todos los servicios del Sistema de Despacho

echo "🚀 Iniciando Sistema de Despacho..."
echo ""

# Obtener el directorio raíz del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Crear directorio para logs
mkdir -p "$PROJECT_DIR/logs"

echo "📁 Directorio del proyecto: $PROJECT_DIR"
echo ""

# Función para detener todos los procesos en segundo plano al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo todos los servicios..."
    # Mata todos los procesos hijos iniciados por este script
    kill $(jobs -p) 2>/dev/null
    exit
}

# Captura Ctrl+C (SIGINT), SIGTERM y la salida normal del script para limpiar
trap cleanup SIGINT SIGTERM EXIT

# 1. Iniciar Frontend
echo "📱 Iniciando Frontend (Vite) en puerto 5173..."
cd "$PROJECT_DIR/frontend" && npm run dev > "$PROJECT_DIR/logs/Frontend.log" 2>&1 &

# 2. Iniciar Laravel API
echo "🔗 Iniciando Laravel API en puerto 8000..."
cd "$PROJECT_DIR/laravel-api" && php -d extension=pdo_pgsql -d extension=pgsql artisan serve > "$PROJECT_DIR/logs/Laravel API.log" 2>&1 &

# 3. Iniciar Backend Node
echo "⚙️  Iniciando Backend Node en puerto 4000..."
cd "$PROJECT_DIR/backend" && npm run dev > "$PROJECT_DIR/logs/Backend Node.log" 2>&1 &

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Todos los servicios están corriendo en segundo plano:"
echo "   - Frontend:    http://localhost:5173"
echo "   - Laravel API: http://localhost:8000"
echo "   - Node API:    http://localhost:4000"
echo "════════════════════════════════════════════════════════"
echo "📝 Los logs se están escribiendo en la carpeta: $PROJECT_DIR/logs/"
echo "🛑 Presiona [Ctrl+C] en esta ventana para detener todos los servicios."
echo "════════════════════════════════════════════════════════"

# Mantener el proceso principal activo esperando a los procesos en segundo plano
wait
