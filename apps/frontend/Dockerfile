# syntax=docker/dockerfile:1

FROM node:22.23.3-alpine3.23 AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace=@azure-weather/frontend --include-workspace-root=false

COPY apps/frontend apps/frontend
ARG VITE_ENTRA_CLIENT_ID
ARG VITE_ENTRA_AUTHORITY
ARG VITE_ENTRA_KNOWN_AUTHORITY
ARG VITE_ENTRA_API_SCOPE
ENV VITE_API_BASE_URL=/api
ENV VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID
ENV VITE_ENTRA_AUTHORITY=$VITE_ENTRA_AUTHORITY
ENV VITE_ENTRA_KNOWN_AUTHORITY=$VITE_ENTRA_KNOWN_AUTHORITY
ENV VITE_ENTRA_API_SCOPE=$VITE_ENTRA_API_SCOPE
RUN npm run build --workspace=@azure-weather/frontend

FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24 AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/frontend/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 \
  CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1
