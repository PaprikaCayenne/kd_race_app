# Use official Node.js 20 image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for caching
COPY package*.json ./

# Set environment
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Install Prisma + client before app deps
RUN npm install prisma --save-dev @prisma/client

# Install app dependencies conditionally
RUN if [ "$NODE_ENV" = "development" ]; then \
      npm install; \
    else \
      npm install --omit=dev; \
    fi

# Copy full prisma folder
COPY prisma ./prisma

# Copy the rest of the backend app
COPY db.js ./
COPY index.js ./
COPY nodemon.json ./
COPY routes ./routes
COPY sockets ./sockets
COPY src ./src

# Generate Prisma client
RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# Expose API port
EXPOSE 4000

# Start server
CMD ["node", "index.js"]
