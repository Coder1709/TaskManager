FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npx prisma generate

# Copy built app
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

EXPOSE 3000

CMD ["node", "dist/app.js"]
