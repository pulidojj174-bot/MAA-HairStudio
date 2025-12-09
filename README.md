<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Crear orden desde carrito
POST /api/v1/orders/from-cart
{
  "shippingAddressId": "uuid-opcional",
  "notes": "Entrega en horario de mañana"
}

# Ver mis órdenes
GET /api/v1/orders/my-orders?page=1&limit=10

# Ver orden específica
GET /api/v1/orders/:orderId

# Admin: Ver todas las órdenes
GET /api/v1/orders/all?page=1&limit=20&status=pending

# Admin: Estadísticas
GET /api/v1/orders/admin/statistics

# Admin: Buscar por número
GET /api/v1/orders/search/MAA-2410-0001

# Admin: Actualizar estado
PATCH /api/v1/orders/:orderId/status
{
  "status": "shipped",
  "notes": "Enviado por Servientrega"
}

# 🎨 MAA Hair Studio

Sistema completo de gestión para salón de belleza con backend en **NestJS** y frontend en **Angular 20 con Server-Side Rendering (SSR)**.

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="80" alt="NestJS Logo" />
  <img src="https://angular.io/assets/images/logos/angular/angular.svg" width="80" alt="Angular Logo" />
  <img src="https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png" width="80" alt="Docker Logo" />
</p>

## 📋 Características

- ✅ **Backend**: API REST con NestJS + TypeORM + PostgreSQL
- ✅ **Frontend**: Angular 20 con SSR para mejor SEO y performance
- ✅ **Docker**: Completamente dockerizado con Docker Compose
- ✅ **Hot-reload**: Desarrollo con recarga automática
- ✅ **Multi-stage builds**: Imágenes optimizadas para producción
- ✅ **Health checks**: Monitoreo automático de servicios
- ✅ **Networking**: Comunicación segura entre contenedores

## 📁 Estructura del Proyecto

```
MAA-HairStudio/
├── MAA-HairStdio_Backend/      # API REST con NestJS
│   ├── src/                    # Código fuente del backend
│   ├── Dockerfile              # Imagen de producción
│   ├── Dockerfile.dev          # Imagen de desarrollo
│   └── .env                    # Variables de entorno
├── MAA-HairStdio_Frontend/     # App web con Angular 20 SSR
│   ├── src/                    # Código fuente del frontend
│   ├── Dockerfile              # Imagen de producción con SSR
│   ├── Dockerfile.dev          # Imagen de desarrollo
│   └── angular.json            # Configuración de Angular
├── docker-compose.yml          # Orquestación producción
├── docker-compose.dev.yml      # Orquestación desarrollo
└── README.md                   # Este archivo
```

## 🚀 Inicio Rápido

### Requisitos Previos

- **Docker** 20.10 o superior
- **Docker Compose** v2.0 o superior (comando `docker compose` sin guion)
- **Git** para clonar el repositorio

### 🔧 Instalación

```bash
# 1. Clonar repositorio con submodules
git clone --recurse-submodules https://github.com/tu-usuario/MAA-HairStudio.git
cd MAA-HairStudio

# 2. Configurar variables de entorno del backend
cp MAA-HairStdio_Backend/.env.example MAA-HairStdio_Backend/.env

# 3. Editar .env con tus credenciales (base de datos, JWT, etc.)
nano MAA-HairStdio_Backend/.env
```

### 🔨 Desarrollo (con hot-reload)

```bash
# Levantar servicios de desarrollo
docker compose -f docker-compose.dev.yml up -d

# Ver logs en tiempo real
docker compose -f docker-compose.dev.yml logs -f

# Acceder a las aplicaciones:
# - Frontend: http://localhost:4200 (sin SSR, con hot-reload)
# - Backend:  http://localhost:3000/api/v1
# - API Docs: http://localhost:3000/api/docs (Swagger)
# - Health:   http://localhost:3000/api/health
```

### 🚢 Producción (con SSR)

```bash
# Construir y levantar servicios
docker compose up -d --build

# Ver logs
docker compose logs -f

# Acceder a las aplicaciones:
# - Frontend: http://localhost (con SSR optimizado)
# - Backend:  http://localhost:3000/api/v1
```

## 📦 Comandos Útiles

### Gestión de Servicios

```bash
# Ver estado de contenedores
docker compose ps

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend

# Reiniciar un servicio
docker compose restart backend

# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes
docker compose down -v
```

### Desarrollo

```bash
# Reconstruir después de cambios en package.json
docker compose -f docker-compose.dev.yml up -d --build

# Entrar al contenedor del backend
docker compose -f docker-compose.dev.yml exec backend-dev sh

# Ejecutar migraciones
docker compose -f docker-compose.dev.yml exec backend-dev npm run migration:run

# Ejecutar tests del frontend
docker compose -f docker-compose.dev.yml exec frontend-dev npm run test

# Ver logs con timestamps
docker compose -f docker-compose.dev.yml logs -t backend-dev
```

### Producción

```bash
# Reconstruir imágenes sin caché
docker compose build --no-cache

# Escalar servicios (si es necesario)
docker compose up -d --scale backend=2

# Ver uso de recursos
docker stats

# Backup de base de datos (si usas volumen local)
docker compose exec backend pg_dump -U usuario -d basedatos > backup.sql
```

### Limpieza

```bash
# Detener servicios de desarrollo
docker compose -f docker-compose.dev.yml down

# Detener servicios de producción
docker compose down

# Eliminar imágenes del proyecto
docker rmi maa-backend:prod maa-frontend:prod

# Limpieza completa del sistema Docker
docker system prune -a --volumes -f
```

## 🏗️ Arquitectura

### Backend (NestJS)

- **Framework**: NestJS con TypeScript
- **Base de datos**: PostgreSQL (Neon)
- **ORM**: TypeORM
- **Puerto**: 3000
- **Endpoints principales**:
  - `GET /api/health` - Health check
  - `GET /api/docs` - Documentación Swagger
  - `POST /api/v1/auth/login` - Autenticación
  - `GET /api/v1/products` - Listado de productos
  - `POST /api/v1/orders/from-cart` - Crear orden

### Frontend (Angular 20 SSR)

- **Framework**: Angular 20
- **SSR**: Server-Side Rendering con `@angular/ssr`
- **Servidor**: Express.js
- **Puerto**: 4200 (dev) / 80 (prod)
- **Features**:
  - Renderizado del lado del servidor para mejor SEO
  - Hot-reload en desarrollo
  - Build optimizado para producción

### Networking

Los servicios se comunican a través de redes Docker:

- **Desarrollo**: `maa-network-dev`
- **Producción**: `maa-network`

El frontend puede acceder al backend usando el nombre del servicio:
```typescript
// Ejemplo en el frontend
const API_URL = 'http://backend:3000/api/v1';
```

## 🔐 Variables de Entorno

### Backend (.env)

```bash
# Base de datos PostgreSQL (Neon)
PGHOST=tu-host.neon.tech
PGUSER=usuario
PGDATABASE=basedatos
PGPASSWORD=tu_password

# JWT
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES=3h

# Email
CORREO_PRUEBA=tu-email@gmail.com
CODIGO_VERIFICACION=tu_codigo_app

# Shippo API (envíos)
SHIPPO_API_KEY=shippo_test_...
```

### Frontend (configurado en docker-compose.yml)

```yaml
environment:
  - NODE_ENV=production
  - PORT=4200
  - API_URL=http://backend:3000/api/v1
```

## 📊 Monitoreo y Health Checks

Los servicios incluyen health checks automáticos:

```bash
# Ver estado de health checks
docker compose ps

# Deberías ver "healthy" en ambos servicios:
# maa-backend    ... Up (healthy)
# maa-frontend   ... Up (healthy)
```

Si un servicio no está "healthy", revisa los logs:

```bash
docker compose logs backend
```

## 🐛 Troubleshooting

### El backend no inicia

```bash
# Ver logs detallados
docker compose logs backend

# Verificar variables de entorno
docker compose exec backend env | grep PG

# Probar conexión a base de datos
docker compose exec backend sh
# Dentro del contenedor:
npm run migration:run
```

### El frontend no conecta con el backend

```bash
# Verificar red Docker
docker network inspect maa-network

# Verificar que el backend responde
docker compose exec frontend sh
# Dentro del contenedor:
wget -O- http://backend:3000/api/health
```

### Hot-reload no funciona en desarrollo

```bash
# Verificar que el volumen está montado
docker compose -f docker-compose.dev.yml ps

# Debería mostrar algo como:
# ./MAA-HairStdio_Frontend/src:/app/src:delegated

# Reconstruir si es necesario
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build
```

### Puerto en uso

Si el puerto 3000 o 4200 ya está en uso:

```yaml
# Editar docker-compose.yml
ports:
  - "3001:3000"  # Backend en puerto 3001
  - "8080:4200"  # Frontend en puerto 8080
```

### Error de permisos en volúmenes

```bash
# En Linux, dar permisos a los directorios
sudo chown -R $USER:$USER MAA-HairStdio_Backend/src
sudo chown -R $USER:$USER MAA-HairStdio_Frontend/src
```

## 🚢 Deployment en Producción

### Consideraciones

1. **Cambiar credenciales**: Usa credenciales seguras en `.env`
2. **HTTPS**: Configura un reverse proxy (Nginx/Traefik)
3. **Base de datos**: Usa una instancia dedicada de PostgreSQL
4. **Logs**: Implementa logging centralizado
5. **Backups**: Configura backups automáticos

### Ejemplo con Nginx como reverse proxy

```nginx
# nginx.conf
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:80;  # Frontend
    }

    location /api {
        proxy_pass http://localhost:3000;  # Backend
    }
}
```

## 📚 Documentación Adicional

- [Documentación de NestJS](https://docs.nestjs.com)
- [Documentación de Angular SSR](https://angular.io/guide/ssr)
- [Documentación de Docker Compose](https://docs.docker.com/compose/)

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 👨‍💻 Autor

**Jhon Puli**
- Email: pulidojj174@gmail.com
- GitHub: [@jhon-puli](https://github.com/tu-usuario)

## 🙏 Agradecimientos

- [NestJS](https://nestjs.com/) - Framework backend
- [Angular](https://angular.io/) - Framework frontend
- [Docker](https://www.docker.com/) - Containerización
- [Neon](https://neon.tech/) - PostgreSQL serverless

---

⭐ Si este proyecto te ayudó, considera darle una estrella en GitHub