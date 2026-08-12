# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# JedzTo Multi-Vendor API — production image
#
# Single-stage, small Node image. There's no build step (plain ESM/JS), so we
# just install production dependencies and copy the source in.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Install dependencies first so Docker can cache this layer between deploys
# unless package*.json actually changed.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Uploads only matter for the local-disk fallback (no Cloudinary configured).
# Render's filesystem is ephemeral, but creating the dir keeps the app from
# crashing if it's ever used before Cloudinary env vars are set.
# chown is required because the process runs as the non-root `node` user.
RUN mkdir -p uploads && chown -R node:node uploads

# Runs as the (already low-privilege) `node` user baked into this base image.
USER node

EXPOSE 8001

# Render (and most PaaS) inject $PORT — server.js honours it via src/config.js.
CMD ["node", "server.js"]
