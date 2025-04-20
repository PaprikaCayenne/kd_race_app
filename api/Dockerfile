# Dockerfile for kd_api (Node.js + Prisma)
FROM node:20 AS builder

WORKDIR /usr/src/app

# Install deps early
COPY package*.json ./
RUN npm install --omit=optional

# Copy schema and generate Prisma client
COPY ./prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy the rest of the app
COPY . .

# Production image
FROM node:20
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/*.js ./
COPY --from=builder /usr/src/app/routes ./routes
COPY --from=builder /usr/src/app/lib ./lib
COPY --from=builder /usr/src/app/sockets ./sockets

EXPOSE 4000

CMD ["npm", "run", "dev"]
