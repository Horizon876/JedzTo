# syntax=docker/dockerfile:1
#
# Root Dockerfile for Railway (monorepo). Builds only jedzto-local-api.
# Context = repository root.

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY jedzto-local-api/package.json jedzto-local-api/package-lock.json ./
RUN npm ci --omit=dev

COPY jedzto-local-api/ .

RUN mkdir -p uploads && chown -R node:node uploads

USER node

EXPOSE 8001

CMD ["node", "server.js"]
