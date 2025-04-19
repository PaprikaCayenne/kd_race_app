# frontend/Dockerfile

# Use lightweight Node.js image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests and install them
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Optionally switch to non-root user for security (commented out for volume compatibility)
# USER node

# Start the Vite development server
CMD ["npm", "run", "dev"]

