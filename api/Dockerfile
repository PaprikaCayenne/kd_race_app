# File: api/Dockerfile
FROM node:20

WORKDIR /app

# Install dependencies including devDependencies for tsx
COPY ./package*.json ./
RUN npm install

# Copy all source code and Prisma schema
COPY . .
COPY ./prisma ./prisma

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 4000
CMD ["node", "index.js"]
