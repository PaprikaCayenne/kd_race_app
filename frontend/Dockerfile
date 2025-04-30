# File: frontend/Dockerfile
# Version: v0.2.0 — Install pako, build React app cleanly

# Stage 1: builder
FROM node:20 AS builder
WORKDIR /app

# Install global tools
RUN npm install -g pnpm

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && pnpm install --frozen-lockfile || pnpm install

# Copy frontend code
COPY frontend ./frontend

# Build frontend
RUN cd frontend && pnpm run build

# Stage 2: final minimal image
FROM alpine
WORKDIR /app

# Only copy built static files
COPY --from=builder /app/frontend/dist /app/frontend/dist

# Expose the dist folder
CMD ["sh", "-c", "echo 'Frontend built. Serve /app/frontend/dist with Nginx or a static server.' && sleep infinity"]
