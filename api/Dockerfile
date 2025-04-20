# KD_API: Node.js backend for races
FROM node:20

# 📁 Set working directory
WORKDIR /usr/src/app

# 📦 Copy only package files first (to optimize layer caching)
COPY package*.json ./

# 🌍 Set environment variable
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# ✅ Install Prisma CLI and client in separate steps
# This prevents the @prisma/engines module not found error
RUN npm install --save-dev prisma
RUN npm install @prisma/client

# 📦 Install other dependencies
RUN if [ "$NODE_ENV" = "development" ]; then \
      npm install; \
    else \
      npm install --omit=dev; \
    fi

# 🧬 Copy schema before generating the Prisma client
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# 📂 Copy the rest of your application last
COPY . .

# 🚪 Expose port for API + WebSockets
EXPOSE 4000

# ▶️ Start the server
CMD ["node", "index.js"]
