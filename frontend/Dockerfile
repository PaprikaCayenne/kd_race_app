# Use official Node.js image for frontend
FROM node:20

# Create a non-root user (e.g., media-apps) and set it as the working user
RUN useradd -m media-apps
USER media-apps

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to install dependencies
COPY --chown=media-apps:media-apps package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend code, ensuring correct ownership
COPY --chown=media-apps:media-apps . .

# Run the React build
RUN npm run build

# Copy the build files to the output directory for Nginx to serve
RUN cp -r build/* /usr/share/nginx/html/  # Copy files to the Nginx served folder

# Expose port for React app (default React port)
EXPOSE 3000

# Run the React app
CMD ["npm", "start"]
