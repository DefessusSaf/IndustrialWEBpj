FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY app.js server.js ./
COPY index.html about.html labs.html contacts.html ./
COPY css ./css
COPY images ./images
COPY js ./js

ENV NODE_ENV=production
ENV PORT=3000
ENV CONTAINERIZED=true

USER node
EXPOSE 3000

CMD ["node", "server.js"]
