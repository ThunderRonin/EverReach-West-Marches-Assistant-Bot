# ==============================================================================
# Multi-stage Dockerfile for EverReach West Marches Assistant Bot
# ==============================================================================

# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies needed for native modules and Prisma
RUN apk add --no-cache openssl

# Install dependencies using yarn frozen lockfile
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Generate Prisma Client
COPY prisma ./prisma/
RUN yarn prisma:generate

# Copy source code and build NestJS application
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN yarn build

# Prune devDependencies to keep image lean
RUN rm -rf node_modules && \
    yarn install --frozen-lockfile --production --ignore-scripts --prefer-offline && \
    yarn prisma:generate

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# OpenSSL needed by Prisma engine in alpine
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Security: run application as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S everreach -u 1001

# Copy compiled artifacts and production dependencies
COPY --from=builder --chown=everreach:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=everreach:nodejs /app/dist ./dist
COPY --from=builder --chown=everreach:nodejs /app/prisma ./prisma
COPY --from=builder --chown=everreach:nodejs /app/package.json ./package.json

USER everreach

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
