# Dockerfile for kd_web – Unified Node.js API + Vite frontend + Nginx
# Version: v1.0.0 – Consolidated build for standalone deployment

##############################
# Stage 1: Build Frontend    #
##############################
FROM node:20 AS frontend_builder

WORKDIR /app/frontend

COPY ./frontend/package*.json ./
RUN npm install --omit=optional

COPY ./frontend .
RUN npm run build

##############################
# Stage 2: Build Backend     #
##############################
FROM node:20 AS backend_builder

WORKDIR /app/backend

COPY ./api/package*.json ./
RUN npm install --omit=optional

COPY ./api .
COPY --from=frontend_builder /app/frontend/dist ./public

COPY ./api/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

########################################
# Stage 3: Runtime with API + Nginx    #
########################################
FROM node:20

WORKDIR /usr/src/app

# Install runtime deps and Nginx
RUN apt-get update && \
    apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/*

# Copy app files from builder
COPY --from=backend_builder /app/backend .
RUN npm install --omit=dev && npm cache clean --force

# Setup Nginx
COPY ./nginx/kd.conf /etc/nginx/sites-available/default
RUN mkdir -p /var/www/html && \
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/ && \
    cp -r ./public/* /var/www/html/

EXPOSE 4000 8086
CMD ["sh", "-c", "node index.js & nginx -g 'daemon off;'"]
