#!/bin/bash

# =========================================
# MAA Hair Studio Backend - Docker Helper
# =========================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones auxiliares
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Verificar si Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado. Por favor instala Docker primero."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose no está instalado. Por favor instala Docker Compose primero."
        exit 1
    fi
    
    print_success "Docker y Docker Compose están instalados"
}

# Verificar archivo .env
check_env() {
    if [ ! -f .env ]; then
        print_warning "Archivo .env no encontrado"
        print_info "Copiando .env.example a .env..."
        cp .env.example .env
        print_warning "Por favor configura las variables en .env antes de continuar"
        exit 1
    fi
    print_success "Archivo .env encontrado"
}

# Desarrollo
dev_start() {
    print_info "Iniciando contenedor de desarrollo..."
    docker-compose -f docker-compose.dev.yml up --build
}

dev_start_detached() {
    print_info "Iniciando contenedor de desarrollo en segundo plano..."
    docker-compose -f docker-compose.dev.yml up --build -d
    print_success "Contenedor iniciado en segundo plano"
    print_info "Ver logs: ./docker.sh dev:logs"
}

dev_stop() {
    print_info "Deteniendo contenedor de desarrollo..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Contenedor detenido"
}

dev_restart() {
    print_info "Reiniciando contenedor de desarrollo..."
    docker-compose -f docker-compose.dev.yml restart
    print_success "Contenedor reiniciado"
}

dev_logs() {
    docker-compose -f docker-compose.dev.yml logs -f backend-dev
}

dev_shell() {
    print_info "Abriendo shell en contenedor de desarrollo..."
    docker exec -it maa-backend-dev sh
}

# Producción
prod_start() {
    print_info "Iniciando contenedor de producción..."
    docker-compose up --build -d
    print_success "Contenedor iniciado"
    print_info "Ver logs: ./docker.sh prod:logs"
}

prod_stop() {
    print_info "Deteniendo contenedor de producción..."
    docker-compose down
    print_success "Contenedor detenido"
}

prod_restart() {
    print_info "Reiniciando contenedor de producción..."
    docker-compose restart
    print_success "Contenedor reiniciado"
}

prod_logs() {
    docker-compose logs -f backend
}

prod_shell() {
    print_info "Abriendo shell en contenedor de producción..."
    docker exec -it maa-backend sh
}

# Construcción
build_dev() {
    print_info "Construyendo imagen de desarrollo..."
    docker-compose -f docker-compose.dev.yml build --no-cache
    print_success "Imagen de desarrollo construida"
}

build_prod() {
    print_info "Construyendo imagen de producción..."
    docker-compose build --no-cache
    print_success "Imagen de producción construida"
}

# Limpieza
clean() {
    print_warning "Esto eliminará todos los contenedores, imágenes y volúmenes del proyecto"
    read -p "¿Estás seguro? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Limpiando recursos de Docker..."
        docker-compose -f docker-compose.dev.yml down -v --rmi all 2>/dev/null || true
        docker-compose down -v --rmi all 2>/dev/null || true
        print_success "Recursos limpiados"
    else
        print_info "Operación cancelada"
    fi
}

# Estado
status() {
    print_info "Estado de contenedores:"
    docker ps -a --filter "name=maa-backend"
    echo ""
    print_info "Uso de recursos:"
    docker stats --no-stream maa-backend maa-backend-dev 2>/dev/null || print_warning "No hay contenedores en ejecución"
}

# Health check
health() {
    print_info "Verificando salud del contenedor..."
    
    # Dev
    if docker ps --filter "name=maa-backend-dev" --format "{{.Names}}" | grep -q "maa-backend-dev"; then
        status=$(docker inspect --format='{{.State.Health.Status}}' maa-backend-dev 2>/dev/null || echo "no-healthcheck")
        if [ "$status" = "healthy" ]; then
            print_success "Backend Dev: Saludable"
        elif [ "$status" = "no-healthcheck" ]; then
            print_info "Backend Dev: Sin health check configurado"
        else
            print_warning "Backend Dev: $status"
        fi
    fi
    
    # Prod
    if docker ps --filter "name=maa-backend" --format "{{.Names}}" | grep -q "^maa-backend$"; then
        status=$(docker inspect --format='{{.State.Health.Status}}' maa-backend 2>/dev/null || echo "no-healthcheck")
        if [ "$status" = "healthy" ]; then
            print_success "Backend Prod: Saludable"
        elif [ "$status" = "no-healthcheck" ]; then
            print_info "Backend Prod: Sin health check configurado"
        else
            print_warning "Backend Prod: $status"
        fi
    fi
}

# Ayuda
show_help() {
    cat << EOF
${BLUE}MAA Hair Studio Backend - Docker Helper${NC}

${YELLOW}Uso:${NC} ./docker.sh [comando]

${YELLOW}Comandos de Desarrollo:${NC}
  dev:start          Iniciar contenedor de desarrollo (con logs)
  dev:start:bg       Iniciar contenedor de desarrollo en segundo plano
  dev:stop           Detener contenedor de desarrollo
  dev:restart        Reiniciar contenedor de desarrollo
  dev:logs           Ver logs de desarrollo
  dev:shell          Abrir shell en contenedor de desarrollo
  dev:build          Reconstruir imagen de desarrollo

${YELLOW}Comandos de Producción:${NC}
  prod:start         Iniciar contenedor de producción
  prod:stop          Detener contenedor de producción
  prod:restart       Reiniciar contenedor de producción
  prod:logs          Ver logs de producción
  prod:shell         Abrir shell en contenedor de producción
  prod:build         Reconstruir imagen de producción

${YELLOW}Comandos Generales:${NC}
  status             Ver estado de contenedores
  health             Verificar salud de contenedores
  clean              Limpiar todos los recursos de Docker
  check              Verificar requisitos
  help               Mostrar esta ayuda

${YELLOW}Ejemplos:${NC}
  ./docker.sh dev:start          # Modo desarrollo con hot-reload
  ./docker.sh prod:start         # Modo producción
  ./docker.sh status             # Ver estado actual
  ./docker.sh dev:logs           # Ver logs en tiempo real

EOF
}

# Main
main() {
    case "${1:-help}" in
        # Desarrollo
        dev:start)
            check_docker
            check_env
            dev_start
            ;;
        dev:start:bg)
            check_docker
            check_env
            dev_start_detached
            ;;
        dev:stop)
            dev_stop
            ;;
        dev:restart)
            dev_restart
            ;;
        dev:logs)
            dev_logs
            ;;
        dev:shell)
            dev_shell
            ;;
        dev:build)
            check_docker
            build_dev
            ;;
        
        # Producción
        prod:start)
            check_docker
            check_env
            prod_start
            ;;
        prod:stop)
            prod_stop
            ;;
        prod:restart)
            prod_restart
            ;;
        prod:logs)
            prod_logs
            ;;
        prod:shell)
            prod_shell
            ;;
        prod:build)
            check_docker
            build_prod
            ;;
        
        # General
        status)
            status
            ;;
        health)
            health
            ;;
        clean)
            clean
            ;;
        check)
            check_docker
            check_env
            print_success "Todos los requisitos están instalados"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Comando desconocido: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
