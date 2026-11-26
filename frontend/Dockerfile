# Stage 1: Build static React + TypeScript + Deck.gl bundle
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
ARG VITE_BASE_PATH=/
ARG VITE_API_BASE_URL=""
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Stage 2: Hardened non-root Nginx runtime (UID 101)
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
USER 101
CMD ["nginx", "-g", "daemon off;"]
