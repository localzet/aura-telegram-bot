FROM node:22-alpine

LABEL org.opencontainers.image.source = "https://github.com/localzet/aura-telegram-bot"

WORKDIR /opt/app

RUN npm install pm2 -g

# Install backend dependencies
COPY package*.json .

COPY tsconfig*.json ./

RUN npm ci

COPY ./prisma ./prisma

RUN npx prisma generate

# Build backend
COPY . .

RUN npm run build

# Build admin frontend
WORKDIR /opt/app/admin-frontend

COPY admin-frontend/package*.json ./

RUN npm ci

COPY admin-frontend .

RUN npm run build

# Move admin build to backend dist
WORKDIR /opt/app

RUN cp -r admin-frontend/dist admin

# Cleanup
RUN rm -rf admin-frontend node_modules

WORKDIR /opt/app

RUN npm ci --omit=dev

RUN npm cache clean --force

CMD [ "/bin/sh", "docker-entrypoint.sh" ]