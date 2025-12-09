# 🐳 Docker Setup - MAA Hair Studio Frontend

Documentación completa para dockerizar y ejecutar el proyecto Angular 20 SSR.

## 📋 Requisitos Previos

- Docker 20.10 o superior
- Node.js 20 (solo para desarrollo local)

## 🚀 Inicio Rápido

### Desarrollo (Hot-reload)

```bash
# 1. Construir imagen de desarrollo
docker build -f Dockerfile.dev -t maa-frontend:dev .

# 2. Ejecutar contenedor (con hot-reload)
docker run -d \
  --name maa-frontend-dev \
  -p 4200:4200 \
  -v $(pwd)/src:/app/src \
  maa-frontend:dev

# 3. Acceder a la aplicación
http://localhost:4200

# 4. Ver logs en tiempo real
docker logs -f maa-frontend-dev

# 5. Detener contenedor
docker stop maa-frontend-dev && docker rm maa-frontend-dev
```

### Producción

```bash
# 1. Construir imagen de producción
docker build -t maa-frontend:prod .

# 2. Ejecutar contenedor
docker run -d \
  --name maa-frontend \
  -p 80:4200 \
  -e PORT=4200 \
  maa-frontend:prod

# 3. Acceder a la aplicación
http://localhost

# 4. Ver logs
docker logs -f maa-frontend

# 5. Detener contenedor
docker stop maa-frontend && docker rm maa-frontend
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

### Conectar con Backend

Para conectar el frontend con el backend dockerizado:

```bash
# Producción (con networking de Docker)
docker run -d \
  --name maa-frontend \
  --network maa-network \
  -p 80:4200 \
  -e NEXT_PUBLIC_API_URL=http://maa-backend:3000/api/v1 \
  maa-frontend:prod
```

## 📦 Comandos Útiles

### Gestión de Contenedores

```bash
# Ver contenedores en ejecución
docker ps

# Ver todos los contenedores
docker ps -a

# Entrar al contenedor
docker exec -it maa-frontend sh

# Ver logs con timestamps
docker logs -t maa-frontend

# Reiniciar contenedor
docker restart maa-frontend

# Detener y eliminar
docker rm -f maa-frontend
docker rm -f maa-frontend-dev
```

### Construcción y Reconstrucción

```bash
# Reconstruir desde cero (sin caché)
docker build --no-cache -t maa-frontend:prod .
docker build --no-cache -f Dockerfile.dev -t maa-frontend:dev .

# Reconstruir tras cambios en package.json
docker rm -f maa-frontend-dev
docker build -f Dockerfile.dev -t maa-frontend:dev .
docker run -d --name maa-frontend-dev -p 4200:4200 -v $(pwd)/src:/app/src maa-frontend:dev
```

### Limpieza

```bash
# Eliminar contenedores detenidos
docker container prune -f

# Eliminar imágenes sin usar
docker image prune -f

# Eliminar imágenes del proyecto
docker rmi maa-frontend:prod maa-frontend:dev

# Limpieza completa
docker system prune -a --volumes -f
```

## 🐛 Troubleshooting

### Error: "Cannot find module 'express'"

```bash
# Reconstruir con npm ci
docker build --no-cache -t maa-frontend:prod .
```

### Puerto 4200 ya en uso

```bash
# Cambiar puerto de host
docker run -d --name maa-frontend -p 8080:4200 maa-frontend:prod
```

### Hot-reload no funciona en desarrollo

```bash
# Asegúrate de montar el volumen correctamente
docker run -d \
  --name maa-frontend-dev \
  -p 4200:4200 \
  -v $(pwd)/src:/app/src:delegated \
  maa-frontend:dev
```

### Build falla por falta de memoria

```bash
# Aumentar memoria de Docker
# Docker Desktop → Settings → Resources → Memory → 4GB+

# O usar build con límite de memoria
docker build --memory=4g -t maa-frontend:prod .
```

## 📊 Tamaños de Imagen

- **Imagen de desarrollo**: ~800MB (incluye node_modules completo)
- **Imagen de producción**: ~200MB (multi-stage build optimizado)

## 🔗 Integración con Backend

El frontend está preparado para conectarse con el backend NestJS:

```typescript
// src/environments/environment.ts
export const environment = {
  production: true,
  apiUrl: process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000/api/v1'
};
```

## 📝 Notas

- El frontend usa **Angular 20 con SSR** (`@angular/ssr`)
- El servidor SSR se ejecuta en el puerto **4200** por defecto
- En producción, el build genera `dist/MAA-HairStudio/server/server.mjs`
- El Dockerfile usa **multi-stage build** para optimizar el tamaño

## 🚀 Próximos Pasos

Una vez que ambos proyectos (backend y frontend) estén dockerizados, crearás un `docker-compose.yml` en la raíz del proyecto para orquestar ambos servicios.