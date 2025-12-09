FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

ENV INSTALL_PATH /app
RUN mkdir -p $INSTALL_PATH
WORKDIR $INSTALL_PATH
COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./
RUN apk add --update --no-cache python3 make g++
RUN npm install
COPY . $INSTALL_PATH
RUN npm run build

FROM node:20-alpine AS runner

ENV NODE_ENV production
ENV PORT 3000

ENV INSTALL_PATH /app
RUN mkdir -p $INSTALL_PATH
WORKDIR $INSTALL_PATH
# COPY --from=builder $INSTALL_PATH/package.json $INSTALL_PATH/package-lock.json $INSTALL_PATH/
# RUN npm install --production
COPY --from=builder $INSTALL_PATH/dist $INSTALL_PATH/dist

EXPOSE 3000

CMD ["npm", "run", "serve:ssr:MAA-HairStudio"]