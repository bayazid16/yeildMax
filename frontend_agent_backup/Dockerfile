# Multi-stage Dockerfile for YieldMax Frontend (React / Create React App)
# Stage 1: Build the production static bundle
# Stage 2: Serve it with Nginx (tiny, no Node runtime needed)

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for cached layer
COPY package*.json ./
RUN npm install --silent

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime Stage: Nginx serves the static bundle ----
FROM nginx:1.25-alpine AS runtime

# Copy the built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy our custom Nginx config (proxies /api/ to backend)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
