# Multi-stage build for Node.js backend
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dicom -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
USER dicom
EXPOSE 3001
CMD ["dumb-init", "node", "server.js"]

# Production dependencies stage
FROM base AS deps
ENV NODE_ENV=production
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy production dependencies
COPY --from=deps --chown=dicom:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=dicom:nodejs . .

# Create necessary directories
RUN mkdir -p uploads cache data logs && \
    chown -R dicom:nodejs uploads cache data logs

# Security: Remove unnecessary files
RUN rm -rf .git .gitignore README.md *.md

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Switch to non-root user
USER dicom

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Metadata
LABEL maintainer="DICOM Viewer Team"
LABEL version="1.0.0"
LABEL description="DICOM Viewer Backend API Server"
LABEL org.opencontainers.image.source="https://github.com/your-org/dicom-viewer"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/dicom-viewer/blob/main/README.md"
LABEL org.opencontainers.image.licenses="MIT"