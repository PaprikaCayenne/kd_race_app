# Use official Node.js 20 image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy only package files first (for caching)
COPY package*.json ./

# Install all deps (prod/dev depends on build arg)
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

RUN if [ "$NODE_ENV" = "development" ]; then \
      npm install; \
    else \
      npm install --omit=dev; \
    fi

# Copy app source
COPY . .

# Expose port
EXPOSE 4000

# Default command: overridden by Compose
CMD ["node", "index.js"]
