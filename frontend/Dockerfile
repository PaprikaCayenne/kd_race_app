# Stage 1: Build the Vite app
FROM node:18-alpine AS builder
WORKDIR /app

# Create media-apps user/group to match host (UID/GID 1000)
RUN addgroup -g 1000 media-apps && adduser -D -G media-apps -u 1000 media-apps

# Install deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Set ownership on build output so root doesn't own it later
RUN chown -R media-apps:media-apps /app

# Stage 2: Serve with nginx
FROM nginx:alpine

# Create the same user here if needed
RUN addgroup -g 1000 media-apps && adduser -D -G media-apps -u 1000 media-apps

# Copy built files with correct ownership
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R media-apps:media-apps /usr/share/nginx/html

# (Optional) run as media-apps instead of root:
# USER media-apps
