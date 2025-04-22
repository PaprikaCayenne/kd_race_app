########################
# 🏗️ Stage 1: Frontend Build (Vite)
########################
FROM node:20 AS frontend_builder

WORKDIR /app/frontend

# Install frontend dependencies and generate package-lock.json
COPY ./frontend/package*.json ./
RUN npm install --omit=optional  # This will also generate package-lock.json

# Copy and build frontend
COPY ./frontend ./
RUN npm run build

########################
# 🧪 Stage 2: Backend Build (Node.js + Prisma)
########################
FROM node:20 AS backend_builder

WORKDIR /app/backend

# Install backend dependencies
COPY ./api/package*.json ./
RUN npm install --omit=optional  # This will generate package-lock.json for backend if needed

# Copy source and built frontend
COPY ./api ./
COPY --from=frontend_builder /app/frontend/dist ./public

# Generate Prisma client
COPY ./api/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

########################
# 🖥️ Stage 3: Final App + Nginx Runtime
########################
FROM node:20

WORKDIR /usr/src/app

# Copy backend output and built frontend
COPY --from=backend_builder /app/backend ./

# Install production-only dependencies
RUN npm install --omit=dev && npm cache clean --force

# Add nginx
RUN apt-get update && \
    apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/*

# Configure nginx
COPY ./nginx/kd.conf /etc/nginx/sites-available/default
RUN mkdir -p /var/www/html && \
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# Copy frontend build to nginx root
RUN cp -r ./public/* /var/www/html/

# Expose ports
EXPOSE 4000 80

# Start Node.js API and Nginx
CMD ["sh", "-c", "node index.js & nginx -g 'daemon off;'"]
