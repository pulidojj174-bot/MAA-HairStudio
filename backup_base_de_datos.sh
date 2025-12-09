#!/bin/bash
# filepath: /home/jhon-puli/Documentos/portafolios/MAA-HairStudio/backup_base_de_datos.sh

#==========================================
# Script de Backup de Base de Datos
# MAA Hair Studio - PostgreSQL (Neon)
#==========================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cargar variables de entorno desde .env
ENV_FILE="./MAA-HairStdio_Backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Archivo .env no encontrado en $ENV_FILE${NC}"
    exit 1
fi

# Cargar variables de entorno
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Verificar que las variables estén cargadas
if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ] || [ -z "$PGPASSWORD" ]; then
    echo -e "${RED}Error: Variables de entorno no cargadas correctamente${NC}"
    echo "Verifica que tu .env contenga: PGHOST, PGUSER, PGDATABASE, PGPASSWORD"
    exit 1
fi

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="maa_hairstudio_backup_${TIMESTAMP}.dump"
BACKUP_SQL="maa_hairstudio_backup_${TIMESTAMP}.sql"
LOG_FILE="./logs/backup_${TIMESTAMP}.log"

# Crear directorios si no existen
mkdir -p "$BACKUP_DIR"
mkdir -p "./logs"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Backup de Base de Datos${NC}"
echo -e "${YELLOW}  MAA Hair Studio${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Función para logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para verificar si pg_dump está instalado
check_pgdump() {
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${RED}Error: pg_dump no está instalado${NC}"
        echo "Instala PostgreSQL client:"
        echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
        echo "  MacOS: brew install postgresql"
        echo "  Alpine: apk add postgresql-client"
        exit 1
    fi
}

# Función para realizar backup en formato custom (comprimido)
backup_custom() {
    log "Iniciando backup en formato custom..."
    log "Conectando a: $PGHOST"
    log "Base de datos: $PGDATABASE"
    log "Usuario: $PGUSER"
    
    PGPASSWORD="$PGPASSWORD" pg_dump \
        --host="$PGHOST" \
        --username="$PGUSER" \
        --dbname="$PGDATABASE" \
        --no-owner \
        --no-privileges \
        --format=custom \
        --compress=9 \
        --file="$BACKUP_DIR/$BACKUP_FILE" \
        --verbose 2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ] && [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
        log "✓ Backup custom completado: $BACKUP_FILE"
        echo -e "${GREEN}✓ Backup completado exitosamente${NC}"
        return 0
    else
        log "✗ Error al crear backup custom o archivo vacío"
        echo -e "${RED}✗ Error al crear backup${NC}"
        return 1
    fi
}

# Función para realizar backup en formato SQL (texto plano)
backup_sql() {
    log "Iniciando backup en formato SQL..."
    
    PGPASSWORD="$PGPASSWORD" pg_dump \
        --host="$PGHOST" \
        --username="$PGUSER" \
        --dbname="$PGDATABASE" \
        --no-owner \
        --no-privileges \
        --file="$BACKUP_DIR/$BACKUP_SQL" \
        --verbose 2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ] && [ -s "$BACKUP_DIR/$BACKUP_SQL" ]; then
        log "✓ Backup SQL completado: $BACKUP_SQL"
        echo -e "${GREEN}✓ Backup SQL completado exitosamente${NC}"
        return 0
    else
        log "✗ Error al crear backup SQL o archivo vacío"
        echo -e "${RED}✗ Error al crear backup SQL${NC}"
        return 1
    fi
}

# Función para comprimir backup SQL con gzip
compress_sql() {
    if [ -f "$BACKUP_DIR/$BACKUP_SQL" ] && [ -s "$BACKUP_DIR/$BACKUP_SQL" ]; then
        log "Comprimiendo backup SQL..."
        gzip -9 "$BACKUP_DIR/$BACKUP_SQL"
        log "✓ Backup comprimido: ${BACKUP_SQL}.gz"
        echo -e "${GREEN}✓ Backup comprimido exitosamente${NC}"
    else
        log "✗ Archivo SQL no encontrado o vacío, saltando compresión"
    fi
}

# Función para mostrar información del backup
show_backup_info() {
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Información del Backup${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Archivo custom:${NC} $BACKUP_FILE"
        echo -e "${GREEN}  Tamaño:${NC} $SIZE"
        echo -e "${GREEN}  Ubicación:${NC} $BACKUP_DIR/$BACKUP_FILE"
    else
        echo -e "${RED}✗ Archivo custom no generado o vacío${NC}"
    fi
    
    if [ -f "$BACKUP_DIR/${BACKUP_SQL}.gz" ] && [ -s "$BACKUP_DIR/${BACKUP_SQL}.gz" ]; then
        SIZE=$(du -h "$BACKUP_DIR/${BACKUP_SQL}.gz" | cut -f1)
        echo -e "${GREEN}✓ Archivo SQL:${NC} ${BACKUP_SQL}.gz"
        echo -e "${GREEN}  Tamaño:${NC} $SIZE"
        echo -e "${GREEN}  Ubicación:${NC} $BACKUP_DIR/${BACKUP_SQL}.gz"
    else
        echo -e "${RED}✗ Archivo SQL no generado o vacío${NC}"
    fi
    
    echo -e "${GREEN}Log:${NC} $LOG_FILE"
    echo ""
}

# Función para limpiar backups antiguos (mantener últimos 7)
cleanup_old_backups() {
    echo -e "${YELLOW}Limpiando backups antiguos...${NC}"
    
    # Mantener solo los últimos 7 backups válidos (no vacíos)
    cd "$BACKUP_DIR"
    
    # Eliminar backups vacíos primero
    find . -name "maa_hairstudio_backup_*.dump" -size 0 -delete
    find . -name "maa_hairstudio_backup_*.sql.gz" -size 0 -delete
    
    # Mantener últimos 7 backups
    ls -t maa_hairstudio_backup_*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f
    ls -t maa_hairstudio_backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
    
    cd - > /dev/null
    
    log "✓ Backups antiguos eliminados (manteniendo últimos 7)"
    echo -e "${GREEN}✓ Limpieza completada${NC}"
}

# Función principal
main() {
    log "=== Iniciando proceso de backup ==="
    log "Base de datos: $PGDATABASE"
    log "Host: $PGHOST"
    log "Usuario: $PGUSER"
    
    # Verificar instalación
    check_pgdump
    
    # Realizar backups
    if backup_custom; then
        backup_sql
        compress_sql
    else
        echo -e "${RED}Error crítico: No se pudo generar el backup${NC}"
        exit 1
    fi
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    # Mostrar información
    show_backup_info
    
    log "=== Proceso de backup completado ==="
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Backup completado exitosamente${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Ejecutar función principal
main