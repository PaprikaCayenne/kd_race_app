# File: frontend/Dockerfile
# Version: v1.4.1 — Clean single-stage builder for frontend_build extraction

FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy frontend package and lockfiles
COPY frontend/package.json ./frontend/
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .

# Install frontend-only dependencies
RUN pnpm install --filter ./frontend...

# Copy frontend source code
COPY frontend ./frontend

# Build static files to /app/frontend/dist
WORKDIR /app/frontend
RUN pnpm run build

# ✅ No final image — output will be extracted by external script
