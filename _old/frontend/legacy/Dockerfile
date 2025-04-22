# Stage 1: Build the Vite app
FROM node:18-alpine AS builder
WORKDIR /app

# ✅ Create a matching media-apps user (UID 1007) instead of 1000
RUN addgroup -g 1007 media-apps && adduser -D -G media-apps -u 1007 media-apps

# 📦 Install deps
COPY package.json package-lock.json* ./
RUN npm install

# 📁 Copy source and build
COPY . .
RUN npm run build

# ✅ Fix ownership of dist
RUN chown -R media-apps:media-apps /app/dist

# Stage 2: Serve with nginx
FROM nginx:alpine

# ✅ Add same user (UID 1007)
RUN addgroup -g 1007 media-apps && adduser -D -G media-apps -u 1007 media-apps

# ⚙️ Copy built files with correct ownership
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R media-apps:media-apps /usr/share/nginx/html

# 🔒 (Optional) Run as media-apps user
# USER media-apps
