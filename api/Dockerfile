# Stage 1: Build
FROM node:20 AS builder

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of your application code
COPY . .

# Stage 2: Production
FROM node:20

WORKDIR /usr/src/app

# Copy node_modules and Prisma client from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/dist ./dist

# Copy generated Prisma client
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Start the application
CMD ["node", "dist/index.js"]
