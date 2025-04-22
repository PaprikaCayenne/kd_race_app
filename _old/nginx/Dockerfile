# 🌐 Dockerfile for kd_nginx – serves frontend and proxies API/WebSocket traffic
# Version: v1.0.0 – Uses custom nginx.conf to avoid pid write errors

# 🐳 Base image: official Nginx on Alpine (small, fast, reliable)
FROM nginx:alpine

# 📁 Default directory where Nginx will serve static files
WORKDIR /usr/share/nginx/html

# 🛠️ Create required temp directories for buffering (safe even if unused)
RUN mkdir -p \
      /var/cache/nginx/client_temp \
      /var/cache/nginx/proxy_temp \
      /var/cache/nginx/fastcgi_temp \
      /var/cache/nginx/uwsgi_temp \
      /var/cache/nginx/scgi_temp && \
    chmod -R 755 /var/cache/nginx

# ⚙️ Use custom base config that omits 'user' and 'pid' directives
COPY ./nginx.conf /etc/nginx/nginx.conf

# ⚙️ Use your existing proxy config with upstream + fallback
COPY ./kd.conf /etc/nginx/conf.d/default.conf

# 🌐 Expose port 80 for HTTP traffic
EXPOSE 80

# ✅ No need to switch user manually – base config omits the 'user' directive

# 🚀 Run Nginx in foreground to keep container alive
CMD ["nginx", "-g", "daemon off;"]
