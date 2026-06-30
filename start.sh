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

# Función para mostrar instrucciones
show_instructions() {
    echo "════════════════════════════════════════════════════════"
    echo "✅ Sistema de Despacho listo para levantar"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "Abre 3 terminales y ejecuta los siguientes comandos:"
    echo ""
    echo "📱 Terminal 1 - Frontend (Puerto 5173):"
    echo "   cd \"$PROJECT_DIR/frontend\" && npm run dev"
    echo ""
    echo "🔗 Terminal 2 - Laravel API (Puerto 8000):"
    echo "   cd \"$PROJECT_DIR/laravel-api\" && php -d extension=pdo_pgsql -d extension=pgsql artisan serve"
    echo ""
    echo "⚙️  Terminal 3 - Backend Node (Puerto 4000) [Opcional]:"
    echo "   cd \"$PROJECT_DIR/backend\" && npm run dev"
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "🌐 Accede a la aplicación en:"
    echo "   http://localhost:5173"
    echo "════════════════════════════════════════════════════════"
}

show_instructions
