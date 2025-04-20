# Dockerfile for kd_api (Node.js + Prisma)
FROM node:20 AS builder

WORKDIR /usr/src/app

# Install deps (no prisma runs yet)
COPY package*.json ./
RUN npm install

# Copy schema and generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy rest of source
COPY . .

# --- Production Image ---
FROM node:20
WORKDIR /usr/src/app

# Copy built deps and files
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/*.js ./
COPY --from=builder /usr/src/app/routes ./routes
COPY --from=builder /usr/src/app/lib ./lib
COPY --from=builder /usr/src/app/sockets ./sockets

EXPOSE 4000

CMD ["node", "index.js"]
