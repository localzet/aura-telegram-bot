FROM node:22-alpine

WORKDIR /opt/app

RUN npm install pm2 -g

COPY package*.json .

COPY tsconfig*.json ./

RUN npm ci

COPY ./prisma ./prisma

RUN npx prisma generate

COPY . .

RUN npm run build

RUN npm cache clean --force

RUN npm prune --omit=dev

CMD [ "/bin/sh", "docker-entrypoint.sh" ]