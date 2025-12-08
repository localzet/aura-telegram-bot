FROM node:22-alpine

LABEL org.opencontainers.image.source="https://github.com/localzet/aura-telegram-bot"

WORKDIR /opt/app

RUN npm install pm2 -g

# Install backend dependencies
COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY ./prisma ./prisma

RUN npx prisma generate

# Copy backend source (excluding admin-frontend)
COPY src ./src
COPY docker-entrypoint.sh ./
COPY ecosystem.config.js ./

# Build backend
RUN npm run build

# Build admin frontend
WORKDIR /opt/app/admin-frontend

COPY admin-frontend/package*.json ./

RUN npm install

COPY admin-frontend .

RUN npm run build

# Keep admin-frontend for serving on separate port in production
# Don't copy to backend dist - it will be served separately via vite preview
WORKDIR /opt/app

# Install production dependencies for backend
RUN npm ci --omit=dev

# Keep admin-frontend node_modules for vite preview
RUN npm cache clean --force

WORKDIR /opt/app

RUN npm ci --omit=dev

RUN npm cache clean --force

CMD [ "/bin/sh", "docker-entrypoint.sh" ]