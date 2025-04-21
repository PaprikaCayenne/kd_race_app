# 🐴 Dockerfile for kd_api – Node.js + Prisma backend API
# Version: v1.1.1 – Safe volume mount support + non-root runtime + correct file ownership

##########################
# Stage 1: Builder Layer #
##########################
FROM node:20 AS builder

# 📁 App directory
WORKDIR /usr/src/app

# 📦 Install dependencies without optional native modules
COPY package*.json ./
RUN npm install --omit=optional

# 🧬 Generate Prisma client
COPY ./prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# 🧼 Fix ownership to non-root user (node = UID 1000)
RUN chown -R node:node /usr/src/app

# 📁 Copy full source late for build cache benefits
COPY . .

##############################
# Stage 2: Final Runtime App #
##############################
FROM node:20

# 🏠 App dir in final image
WORKDIR /usr/src/app

# 👤 Run as safe user (matches LXC bind volumes)
USER node

# 📦 Copy necessary build output
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/prisma ./prisma
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/*.js ./
COPY --chown=node:node --from=builder /usr/src/app/routes ./routes
COPY --chown=node:node --from=builder /usr/src/app/lib ./lib
COPY --chown=node:node --from=builder /usr/src/app/sockets ./sockets

# 🌐 API + WebSocket port
EXPOSE 4000

# 🚀 Launch app (non-dev)
CMD ["node", "index.js"]
