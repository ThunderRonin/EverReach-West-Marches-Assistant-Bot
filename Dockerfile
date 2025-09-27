# Use Node.js 20 LTS as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client and build the application
RUN npm run prisma:generate && \
    npm run build

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Set proper permissions for data directory
RUN chmod 755 /app/data

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S everreach -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R everreach:nodejs /app
USER everreach

# Expose port (though this is a Discord bot, not HTTP server)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
