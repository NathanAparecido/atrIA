# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage — servir com Nginx leve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração do Nginx para SPA (rotas do React)
# Usa resolver do Docker (127.0.0.11) para resolver DNS em runtime,
# evitando crash do nginx quando o backend estiver temporariamente fora.
RUN echo 'server { \
    listen 3001; \
    root /usr/share/nginx/html; \
    index index.html; \
    resolver 127.0.0.11 valid=10s ipv6=off; \
    set $backend http://corpai-backend:8080; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass $backend; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_buffering off; \
        proxy_cache off; \
        proxy_read_timeout 300s; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
