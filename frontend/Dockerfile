# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime (Nginx)
FROM nginx:alpine

# Non-root setup for Nginx
RUN addgroup -g 101 -S nginxuser && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginxuser -g nginxuser nginxuser && \
    chown -R nginxuser:nginxuser /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown -R nginxuser:nginxuser /var/run/nginx.pid

USER nginxuser

COPY --from=builder /app/dist /usr/share/nginx/html
# Note: The actual reverse proxy handles routing; this is just the static asset server

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
