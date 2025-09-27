# Multi-stage build for production DICOM viewer
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with production optimizations
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment configuration
ARG REACT_APP_API_URL
ARG REACT_APP_DICOM_WEB_URL
ARG REACT_APP_ORTHANC_URL
ARG REACT_APP_PACS_URL
ARG REACT_APP_ENVIRONMENT=production
ARG REACT_APP_VERSION
ARG REACT_APP_BUILD_DATE

# Set environment variables
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_DICOM_WEB_URL=$REACT_APP_DICOM_WEB_URL
ENV REACT_APP_ORTHANC_URL=$REACT_APP_ORTHANC_URL
ENV REACT_APP_PACS_URL=$REACT_APP_PACS_URL
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT
ENV REACT_APP_VERSION=$REACT_APP_VERSION
ENV REACT_APP_BUILD_DATE=$REACT_APP_BUILD_DATE

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Create directories for logs and cache
RUN mkdir -p /var/log/nginx /var/cache/nginx/client_temp && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Labels for metadata
LABEL maintainer="DICOM Viewer Team" \
      version="1.0.0" \
      description="Production DICOM Viewer with Cornerstone3D and VTK.js" \
      org.opencontainers.image.title="DICOM Viewer" \
      org.opencontainers.image.description="Advanced medical imaging viewer" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="Medical Imaging Solutions" \
      org.opencontainers.image.licenses="MIT"

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]