# 🐳 Docker Setup - MAA Hair Studio Backend

Documentación completa para dockerizar y ejecutar el proyecto NestJS de forma independiente.

> **Nota**: Los archivos de orquestación (`docker-compose.yml`) se crearán en la raíz del proyecto cuando se integre con el frontend.

## 📋 Requisitos Previos

- Docker 20.10 o superior
- Archivo `.env` configurado (ver `.env.example`)

## 🚀 Inicio Rápido

### Desarrollo (Hot-reload)

```bash
# 1. Construir imagen de desarrollo
docker build -f Dockerfile.dev -t maa-backend:dev .

# 2. Ejecutar contenedor (con hot-reload)
docker run -d \
  --name maa-backend-dev \
  -p 3000:3000 \
  -v $(pwd)/src:/app/src \
  --env-file .env \
  maa-backend:dev

# 3. Ver logs en tiempo real
docker logs -f maa-backend-dev

# 4. Detener contenedor
docker stop maa-backend-dev

# 5. Eliminar contenedor
docker rm maa-backend-dev
```

### Producción

```bash
# 1. Construir imagen de producción
docker build -t maa-backend:prod .

# 2. Ejecutar contenedor
docker run -d \
  --name maa-backend \
  -p 3000:3000 \
  --env-file .env \
  maa-backend:prod

# 3. Ver logs
docker logs -f maa-backend

# 4. Detener contenedor
docker stop maa-backend

# 5. Eliminar contenedor
docker rm maa-backend
```

## 📦 Comandos Útiles

### Gestión de Contenedores

```bash
# Ver contenedores en ejecución
docker ps

# Ver todos los contenedores (incluyendo detenidos)
docker ps -a

# Entrar al contenedor (producción)
docker exec -it maa-backend sh

# Entrar al contenedor (desarrollo)
docker exec -it maa-backend-dev sh

# Ver logs en tiempo real
docker logs -f maa-backend        # Producción
docker logs -f maa-backend-dev    # Desarrollo

# Reiniciar contenedor
docker restart maa-backend

# Detener y eliminar contenedor
docker rm -f maa-backend
docker rm -f maa-backend-dev
```

### Construcción y Reconstrucción

```bash
# Reconstruir imagen desde cero (sin caché)
docker build --no-cache -t maa-backend:prod .
docker build --no-cache -f Dockerfile.dev -t maa-backend:dev .

# Reconstruir tras cambios en package.json
docker rm -f maa-backend-dev
docker build -f Dockerfile.dev -t maa-backend:dev .
docker run -d --name maa-backend-dev -p 3000:3000 -v $(pwd)/src:/app/src --env-file .env maa-backend:dev
```

### Limpieza de Docker

```bash
# Eliminar contenedores detenidos
docker container prune -f

# Eliminar imágenes sin usar
docker image prune -f

# Eliminar imágenes del proyecto
docker rmi maa-backend:prod maa-backend:dev

# Limpiar todo (contenedores, imágenes, volúmenes, redes)
docker system prune -a --volumes -f
```

## 🔧 Configuración

### Variables de Entorno

1. Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales reales:
```env
PGHOST=tu-host-neon.neon.tech
PGUSER=tu_usuario
PGPASSWORD=tu_password
JWT_SECRET=tu_secret_muy_seguro
...
```

### Puertos

- **Backend API**: `http://localhost:3000` o `http://localhost:3000/api/v1`
- **Debug Port**: `9229` (solo disponible en desarrollo)

### Health Check

El contenedor de producción incluye un health check automático:
```bash
# Verificar estado de salud
docker inspect --format='{{.State.Health.Status}}' maa-backend

# Ver detalles del health check
docker inspect maa-backend | grep -A 10 Health
```

### Volúmenes en Desarrollo

El contenedor de desarrollo monta el código fuente para hot-reload:
```bash
-v $(pwd)/src:/app/src    # Linux/Mac
-v %cd%/src:/app/src      # Windows CMD
-v ${PWD}/src:/app/src    # Windows PowerShell
```ASSWORD=tu_password
JWT_SECRET=tu_secret_muy_seguro
...
```

### Puertos
## 🌐 Integración con Frontend (Futuro)

Cuando tengas el frontend dockerizado, crea un `docker-compose.yml` en la **raíz del proyecto** (fuera de backend/frontend):

```
MAA-HairStudio/
├── MAA-HairStdio_Backend/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── ...
├── MAA-HairStdio_Frontend/
│   ├── Dockerfile
│   └── ...
├── docker-compose.yml          ← AQUÍ
└── docker-compose.dev.yml      ← AQUÍ
```

### Ejemplo de docker-compose.yml (Raíz)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./MAA-HairStdio_Backend
      dockerfile: Dockerfile
    container_name: maa-backend
    ports:
      - "3000:3000"
    env_file:
      - ./MAA-HairStdio_Backend/.env
    networks:
      - maa-network

  frontend:
    build:
      context: ./MAA-HairStdio_Frontend
      dockerfile: Dockerfile
    container_name: maa-frontend
    ports:
      - "80:80"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000/api/v1
    depends_on:
      - backend
    networks:
      - maa-network

networks:
  maa-network:
    driver: bridge
```

### Ejecutar Stack Completo (Futuro)
## 📊 Monitoreo

### Logs

```bash
# Ver logs en tiempo real
docker logs -f maa-backend        # Producción
docker logs -f maa-backend-dev    # Desarrollo

# Últimas 100 líneas
docker logs --tail=100 maa-backend

# Logs con timestamps
docker logs -t maa-backend

# Logs desde hace 10 minutos
docker logs --since 10m maa-backend
```

### Métricas

```bash
# Uso de CPU, memoria, red en tiempo real
docker stats maa-backend

# Información detallada del contenedor
docker inspect maa-backend

## 🐛 Troubleshooting

### Problema: El contenedor no inicia

```bash
# Ver logs completos
docker logs maa-backend

# Ver logs desde el inicio
docker logs --since 1970-01-01 maa-backend

# Reconstruir desde cero
docker rm -f maa-backend
docker rmi maa-backend:prod
docker build --no-cache -t maa-backend:prod .
docker run -d --name maa-backend -p 3000:3000 --env-file .env maa-backend:prod
```

### Problema: Error "nest: not found" al construir

Esto sucede cuando faltan devDependencies en la construcción. **Ya está solucionado** en el Dockerfile actual que usa `npm ci` (sin `--only=production`) en la etapa de build.

```bash
# Verificar que el Dockerfile tenga:
RUN npm ci && npm cache clean --force  # ✅ Correcto (instala devDependencies)
# NO usar:
# RUN npm ci --only=production         # ❌ Incorrecto (falta @nestjs/cli)
```

### Problema: No conecta a la base de datos

1. Verifica las variables de entorno:
```bash
docker exec -it maa-backend env | grep PG
```

2. Verifica conectividad (requiere instalar ping):
```bash
docker exec -it maa-backend sh
apk add --no-cache iputils
ping $PGHOST
```

3. Prueba conexión directa:
```bash
docker exec -it maa-backend node -e "console.log(process.env.PGHOST)"
```

### Problema: Puerto 3000 en uso

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3000
# o
sudo netstat -tulpn | grep 3000

# Usar otro puerto al ejecutar
docker run -d --name maa-backend -p 3001:3000 --env-file .env maa-backend:prod
```

### Problema: Cambios en código no se reflejan (desarrollo)

1. Verifica que el volumen esté montado:
```bash
docker inspect maa-backend-dev | grep -A 10 Mounts
```

2. Reinicia el contenedor:
```bash
docker restart maa-backend-dev
```

3. Si persiste, reconstruye:
```bash
docker rm -f maa-backend-dev
docker build -f Dockerfile.dev -t maa-backend:dev .
## 🚀 Scripts Rápidos

### Script de inicio rápido (Linux/Mac)

Crea un archivo `start-docker.sh`:

```bash
#!/bin/bash

# Desarrollo
dev() {
    docker rm -f maa-backend-dev 2>/dev/null
    docker build -f Dockerfile.dev -t maa-backend:dev .
    docker run -d --name maa-backend-dev -p 3000:3000 -v $(pwd)/src:/app/src --env-file .env maa-backend:dev
    docker logs -f maa-backend-dev
}

# Producción
prod() {
    docker rm -f maa-backend 2>/dev/null
    docker build -t maa-backend:prod .
    docker run -d --name maa-backend -p 3000:3000 --env-file .env maa-backend:prod
    docker logs -f maa-backend
}

case "$1" in
    dev) dev ;;
    prod) prod ;;
    *) echo "Uso: ./start-docker.sh [dev|prod]" ;;
esac
```

Ejecutar:
```bash
chmod +x start-docker.sh
./start-docker.sh dev   # Desarrollo
./start-docker.sh prod  # Producción
```

## 🤝 Integración CI/CD

### GitHub Actions Example

```yaml
name: Build Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t maa-backend:latest .
      
      - name: Test image
        run: |
          docker run -d --name test-backend -p 3000:3000 --env-file .env.test maa-backend:latest
          sleep 10
          curl -f http://localhost:3000/api/v1 || exit 1
          docker stop test-backend
```Verifica las variables de entorno:
```bash
docker exec -it maa-backend env | grep PG
```

2. Verifica conectividad:
```bash
docker exec -it maa-backend sh
ping $PGHOST
```

### Problema: Puerto 3000 en uso

Cambia el puerto en `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Usar puerto 3001 en el host
```

### Problema: Cambios en código no se reflejan (dev)

Asegúrate de usar el docker-compose de desarrollo:
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build
```

## 🔒 Seguridad

### Buenas Prácticas

1. **No commitear archivos sensibles:**
   - `.env` está en `.gitignore`
   - Usar `.env.example` como plantilla

2. **Usuario no-root:**
   - El contenedor de producción ejecuta como usuario `nestjs`

3. **Secrets en producción:**
   ```bash
   # Usar Docker secrets en lugar de .env
   echo "tu_jwt_secret" | docker secret create jwt_secret -
   ```

4. **Actualizaciones:**
   ```bash
   # Actualizar imagen base
   docker pull node:20-alpine
   docker-compose build --no-cache
   ```

## 📚 Recursos Adicionales

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Best Practices](https://docs.nestjs.com/recipes/docker)

## 🤝 Integración CI/CD

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t maa-backend:latest .
      
      - name: Run tests
        run: docker run maa-backend:latest npm test
```

## 📞 Soporte

Si encuentras problemas, revisa:
1. Los logs del contenedor
2. La configuración de variables de entorno
3. La conectividad de red
4. Los permisos de archivos

Para más ayuda, consulta el README principal del proyecto.
