# File: frontend/Dockerfile
# Version: v1.8 – Final fix for root context and stable copy

FROM node:20 AS builder

WORKDIR /app/frontend

ENV ROLLUP_NO_NATIVE=true

RUN npm install -g pnpm

COPY frontend/package*.json ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY frontend/. ./
RUN pnpm run build && echo "✅ Build finished. Contents of dist:" && ls -l dist

CMD ["true"]
