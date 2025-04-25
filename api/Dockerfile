# File: api/Dockerfile
# Version: v0.8.0 – Add TypeScript and tsx runtime support

FROM node:20

# Set working directory
WORKDIR /app

# Install dependencies (includes tsx for TypeScript runtime)
COPY ./package*.json ./
RUN npm install

# Copy all source files and Prisma schema
COPY . .
COPY ./prisma ./prisma

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Expose API port
EXPOSE 4000

# Run with tsx so we can execute TypeScript files directly
CMD ["npx", "tsx", "index.ts"]
