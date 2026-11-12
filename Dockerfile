FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY app.js server.js ./
COPY index.html about.html labs.html contacts.html account.html ./
COPY css ./css
COPY images ./images
COPY js ./js

RUN mkdir -p /app/data && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000
ENV COOKIE_SECURE=false
ENV DB_PATH=/app/data/side-b.db

USER node
EXPOSE 3000

CMD ["node", "server.js"]
