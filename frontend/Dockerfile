# frontend/Dockerfile
FROM node:20 AS builder

WORKDIR /app/frontend

# Prevent native Rollup crash (Vite 5+)
ENV ROLLUP_NO_NATIVE=true

# Install pnpm & deps
RUN npm install -g pnpm
COPY ./frontend/package*.json ./
RUN pnpm install --frozen-lockfile || pnpm install

# Build the frontend
COPY ./frontend ./
RUN pnpm run build

# Final stage just exits (build artifacts are in /app/frontend/dist)
CMD ["true"]
