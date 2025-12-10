FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Set production API URL
ENV VITE_API_URL=https://taskflow-backend-vodxyq4gwa-uc.a.run.app/api

# Build
RUN npm run build

# Production image with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run uses port 8080 by default
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
