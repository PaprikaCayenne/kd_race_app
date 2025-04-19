# Use official Nginx base image (Alpine = small footprint)
FROM nginx:alpine

# Set working directory for clarity (optional)
WORKDIR /usr/share/nginx/html

# Create and fix permissions for temp directories (good practice)
RUN mkdir -p /var/cache/nginx/client_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Copy custom Nginx site config
COPY ./kd.conf /etc/nginx/conf.d/default.conf

# Optionally copy built frontend (dist) if bundling in image
# COPY ./frontend/dist/ . 

# Expose port for reverse proxy
EXPOSE 80

# Keep Nginx running in foreground
CMD ["nginx", "-g", "daemon off;"]
