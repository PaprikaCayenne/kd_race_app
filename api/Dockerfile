# -------------------------------
# KD_API: Node.js backend for races
# -------------------------------

# Use official Node.js 20 image
FROM node:20

# Set working directory inside container
WORKDIR /usr/src/app

# Copy only package files first for caching
COPY package*.json ./

# Set environment
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Install Prisma CLI + client
RUN npm install prisma --save-dev @prisma/client

# Install app dependencies
RUN if [ "$NODE_ENV" = "development" ]; then \
      npm install; \
    else \
      npm install --omit=dev; \
    fi

# Copy Prisma schema separately for cache efficiency
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy rest of app files
COPY . .

# Expose API port
EXPOSE 4000

# Start app
CMD ["node", "index.js"]
