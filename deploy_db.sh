#!/bin/bash
# ════════════════════════════════════════════════════════════════
# SCRIPT DE ACTUALIZACIÓN DE DATOS - PRODUCCIÓN (ROCKY LINUX 9)
# Sistema de Despacho y Gestión de Flota - SITMAH
# ════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}⚠️  ATENCIÓN: MODO DE ACTUALIZACIÓN DE BASE DE DATOS ACTIVADO ⚠️${NC}"
echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Este script alterará la información viva en la base de datos de producción.${NC}"
echo ""

# Buscar PHP
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

echo -e "¿Qué información deseas actualizar/inyectar en la base de datos?"
echo -e "  ${BLUE}[1]${NC} Matriz de Usuarios y Permisos (Seguro: Actualiza y agrega roles sin borrar)"
echo -e "  ${BLUE}[2]${NC} Conductores desde Plantilla JSON (${RED}PELIGRO:${NC} Borra toda la tabla de conductores e historial)"
echo -e "  ${BLUE}[3]${NC} Ambos"
echo -e "  ${BLUE}[0]${NC} Cancelar y salir"
echo ""

read -p "Elige una opción [0-3]: " opcion

cd laravel-api

case $opcion in
    1)
        echo -e "\n${BLUE}🔄 Actualizando Matriz de Usuarios...${NC}"
        "$PHP_BIN" artisan db:seed --class=RbacMatrizSeeder
        echo -e "${GREEN}✔ Usuarios y permisos actualizados correctamente.${NC}"
        ;;
    2)
        echo -e "\n${RED}⚠️  ADVERTENCIA CRÍTICA ⚠️${NC}"
        read -p "¿Estás completamente seguro de borrar la tabla de conductores para recargarla? (escribe 'si' para confirmar): " confirmacion
        if [ "$confirmacion" = "si" ]; then
            echo -e "${BLUE}🔄 Recargando Conductores desde plantilla...${NC}"
            "$PHP_BIN" artisan db:seed --class=ImportarConductoresPlantillaSeeder
            echo -e "${GREEN}✔ Conductores importados correctamente.${NC}"
        else
            echo -e "${YELLOW}Operación cancelada.${NC}"
        fi
        ;;
    3)
        echo -e "\n${RED}⚠️  ADVERTENCIA CRÍTICA ⚠️${NC}"
        read -p "¿Estás completamente seguro de borrar conductores y actualizar usuarios? (escribe 'si' para confirmar): " confirmacion
        if [ "$confirmacion" = "si" ]; then
            echo -e "${BLUE}🔄 1/2 Actualizando Matriz de Usuarios...${NC}"
            "$PHP_BIN" artisan db:seed --class=RbacMatrizSeeder
            echo -e "${BLUE}🔄 2/2 Recargando Conductores desde plantilla...${NC}"
            "$PHP_BIN" artisan db:seed --class=ImportarConductoresPlantillaSeeder
            echo -e "${GREEN}✔ Ambas bases actualizadas correctamente.${NC}"
        else
            echo -e "${YELLOW}Operación cancelada.${NC}"
        fi
        ;;
    0)
        echo -e "${GREEN}Saliendo sin hacer cambios...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Opción no válida. Saliendo...${NC}"
        exit 1
        ;;
esac

cd ..
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 PROCESO FINALIZADO${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
