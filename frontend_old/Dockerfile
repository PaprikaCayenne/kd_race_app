# frontend/Dockerfile

# 🧱 Base image for building the React app
FROM node:20 AS builder

# 👤 Create non-root user for safety
RUN useradd -m media-apps
USER media-apps

# 📁 Set working directory
WORKDIR /usr/src/app

# 📦 Install dependencies first
COPY --chown=media-apps:media-apps package*.json ./
RUN npm install

# 🧠 Copy the full app after installing dependencies
COPY --chown=media-apps:media-apps . .

# ⚙️ Run React build (uses react-app-rewired and config-overrides.js)
RUN npm run build

# 🗂️ Output location will be mounted by docker-compose, so we skip copying to nginx inside this Dockerfile
