# =========================
# Build stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# --- Variáveis de ambiente de BUILD (Vite) ---
ARG VITE_API_URL
ARG VITE_SELF_HOSTED
ARG VITE_APP_NAME

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SELF_HOSTED=$VITE_SELF_HOSTED
ENV VITE_APP_NAME=$VITE_APP_NAME

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (env já disponível aqui)
RUN npm run build

# =========================
# Production stage
# =========================
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Setup permissions for non-root user
RUN touch /var/run/nginx.pid && \
  chown -R nginx:nginx /var/run/nginx.pid && \
  chown -R nginx:nginx /var/cache/nginx && \
  chown -R nginx:nginx /etc/nginx/conf.d && \
  chown -R nginx:nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port 8080 (standard for non-root)
EXPOSE 8080

# Health check (updated for port 8080)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
