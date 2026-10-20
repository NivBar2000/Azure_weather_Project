# syntax=docker/dockerfile:1

FROM node:22.23.3-alpine3.23 AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace=@azure-weather/backend --include-workspace-root=false

COPY apps/backend apps/backend
RUN npm run build --workspace=@azure-weather/backend

FROM node:22.23.3-alpine3.23 AS runtime
ENV NODE_ENV=production
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --omit=dev --workspace=@azure-weather/backend --include-workspace-root=false \
    && npm cache clean --force

COPY --from=build --chown=node:node /workspace/apps/backend/dist apps/backend/dist

USER node
EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]
