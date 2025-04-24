# Stage 1: build
FROM node:20 AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY frontend/package*.json ./frontend/
RUN cd frontend && pnpm install --frozen-lockfile || pnpm install
COPY frontend ./frontend
RUN cd frontend && pnpm run build

# Stage 2: copy
FROM alpine
COPY --from=builder /app/frontend/dist /app/frontend/dist
