# ================================
# STAGE 1: Build
# ================================
FROM node:20.11-alpine AS builder

WORKDIR /app

# Copiar archivos base
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalar todas las dependencias (incluye dev)
RUN npm install --prefer-offline --no-audit

# Copiar código fuente
COPY src ./src

# Compilar NestJS → dist/
RUN npm run build

# ================================
# STAGE 2: Production
# ================================
FROM node:20.11-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Copiar package.json para prod
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --production --prefer-offline --no-audit

# Copiar dist desde el builder
COPY --from=builder /app/dist ./dist

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

# Comando explícito para producción
CMD ["npm", "run", "start:prod"]
