FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Create startup script that runs migrations then starts app
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'npx prisma migrate deploy || echo "Migration skipped"' >> /app/start.sh && \
    echo 'node dist/app.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs && \
    chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 3000

CMD ["/bin/sh", "/app/start.sh"]
