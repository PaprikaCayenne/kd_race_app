# Use official Nginx image
FROM nginx:alpine

# Ensure Nginx directories have proper permissions
RUN mkdir -p /var/cache/nginx/client_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Copy custom Nginx config
COPY ./kd.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for Nginx
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
