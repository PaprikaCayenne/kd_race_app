# 🐴 Dockerfile for kd_api – Node.js + Prisma backend API
# Version: v1.0.0 – Production-ready with correct file permissions and simplified runtime

##########################
# Stage 1: Builder Layer #
##########################
FROM node:20 AS builder

# 🏗️ Set working directory inside container
WORKDIR /usr/src/app

# 📦 Install dependencies early for caching benefits (no optional native deps)
COPY package*.json ./
RUN npm install --omit=optional

# 📄 Copy Prisma schema and generate client
COPY ./prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# 🧼 Fix permissions for generated folders (required when running as non-root later)
RUN chown -R node:node /usr/src/app/node_modules /usr/src/app/prisma

# 📁 Copy source files late for better Docker caching
COPY . .

##############################
# Stage 2: Final Runtime App #
##############################
FROM node:20

# 📁 Set working directory
WORKDIR /usr/src/app

# 👤 Use non-root user "node" (UID 1000+) to avoid host file issues
USER node

# 📦 Copy only needed build output with correct ownership
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/prisma ./prisma
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/*.js ./
COPY --chown=node:node --from=builder /usr/src/app/routes ./routes
COPY --chown=node:node --from=builder /usr/src/app/lib ./lib
COPY --chown=node:node --from=builder /usr/src/app/sockets ./sockets

# 🌐 Expose REST/WebSocket API port
EXPOSE 4000

# 🚀 Start production server (no dev-only tools like nodemon)
CMD ["node", "index.js"]
