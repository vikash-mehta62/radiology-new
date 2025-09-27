# DICOM Viewer Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment Process](#deployment-process)
5. [Monitoring and Maintenance](#monitoring-and-maintenance)
6. [Troubleshooting](#troubleshooting)
7. [Security Considerations](#security-considerations)
8. [Backup and Recovery](#backup-and-recovery)

## Overview

This guide provides comprehensive instructions for deploying the DICOM Viewer application in production environments. The application consists of:

- **Frontend**: React-based DICOM viewer with advanced medical imaging capabilities
- **Backend**: Node.js API server with DICOM processing
- **Database**: PostgreSQL for metadata and user management
- **Cache**: Redis for session management and caching
- **Monitoring**: Prometheus and Grafana for observability

## Prerequisites

### System Requirements

**Minimum Hardware:**
- CPU: 4 cores, 2.4 GHz
- RAM: 8 GB
- Storage: 100 GB SSD
- Network: 1 Gbps

**Recommended Hardware:**
- CPU: 8 cores, 3.0 GHz
- RAM: 16 GB
- Storage: 500 GB NVMe SSD
- Network: 10 Gbps

### Software Requirements

- **Operating System**: Ubuntu 20.04 LTS or CentOS 8+
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: Version 2.25+
- **OpenSSL**: Version 1.1.1+

### Network Requirements

- **Ports**: 80 (HTTP), 443 (HTTPS), 3001 (API), 5432 (PostgreSQL), 6379 (Redis)
- **Firewall**: Configure to allow necessary traffic
- **DNS**: Proper domain configuration for SSL certificates

## Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git unzip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply group changes
```

### 2. Application Setup

```bash
# Clone the repository
git clone https://github.com/your-org/dicom-viewer.git
cd dicom-viewer

# Create necessary directories
sudo mkdir -p /opt/backups/dicom-viewer
sudo mkdir -p /var/log/dicom-viewer
sudo chown -R $USER:$USER /opt/backups/dicom-viewer
sudo chown -R $USER:$USER /var/log/dicom-viewer

# Set up environment files
cp .env.production.example .env.production
# Edit .env.production with your specific configuration
```

### 3. SSL Certificate Setup

```bash
# For development (self-signed)
cd ssl
chmod +x generate-ssl.sh
./generate-ssl.sh localhost development

# For production (with proper domain)
./generate-ssl.sh your-domain.com production
```

## Deployment Process

### 1. Initial Deployment

```bash
# Make deployment script executable
chmod +x deploy-production.sh

# Run initial deployment
./deploy-production.sh deploy
```

### 2. Verify Deployment

```bash
# Check service status
docker-compose ps

# Verify health endpoints
curl -f http://localhost/health
curl -f http://localhost:3001/api/health

# Check logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 3. Post-Deployment Configuration

```bash
# Set up log rotation
sudo cp scripts/logrotate.conf /etc/logrotate.d/dicom-viewer

# Configure monitoring alerts
# Edit monitoring/prometheus.yml for your notification channels

# Set up backup cron job
sudo crontab -e
# Add: 0 2 * * * /opt/dicom-viewer/deploy-production.sh backup
```

## Monitoring and Maintenance

### Monitoring Stack

The application includes comprehensive monitoring:

- **Prometheus**: Metrics collection (http://localhost:9090)
- **Grafana**: Visualization and alerting (http://localhost:3000)
- **Health Checks**: Built-in endpoints for service monitoring

### Key Metrics to Monitor

1. **Application Metrics**:
   - Request rate and response times
   - Error rates and status codes
   - Memory and CPU usage
   - Active user sessions

2. **Infrastructure Metrics**:
   - Docker container health
   - Database connections and performance
   - Redis cache hit rates
   - Disk usage and I/O

3. **Business Metrics**:
   - DICOM studies processed
   - User activity and engagement
   - Feature usage statistics

### Maintenance Tasks

#### Daily
- Check application logs for errors
- Verify backup completion
- Monitor resource usage

#### Weekly
- Review security logs
- Update system packages
- Check SSL certificate expiration

#### Monthly
- Performance optimization review
- Security vulnerability assessment
- Capacity planning review

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check container logs
docker-compose logs [service-name]

# Verify configuration
docker-compose config

# Check port conflicts
sudo netstat -tulpn | grep :80
```

#### 2. Database Connection Issues

```bash
# Check database container
docker-compose exec database pg_isready -U dicom_user

# Check database logs
docker-compose logs database

# Test connection manually
docker-compose exec database psql -U dicom_user -d dicom_viewer
```

#### 3. High Memory Usage

```bash
# Check container resource usage
docker stats

# Analyze memory usage
docker-compose exec backend node --inspect=0.0.0.0:9229 server.js

# Adjust memory limits in docker-compose.yml
```

#### 4. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in ssl/nginx-selfsigned.crt -text -noout

# Test SSL configuration
openssl s_client -connect localhost:443 -servername localhost

# Regenerate certificates if needed
cd ssl && ./generate-ssl.sh your-domain.com production
```

### Log Analysis

```bash
# Application logs
docker-compose logs -f --tail=100 backend

# Nginx access logs
docker-compose exec frontend tail -f /var/log/nginx/access.log

# Database logs
docker-compose logs database | grep ERROR

# System logs
sudo journalctl -u docker -f
```

## Security Considerations

### 1. Network Security

- Configure firewall rules to restrict access
- Use VPN for administrative access
- Implement rate limiting and DDoS protection
- Regular security updates

### 2. Application Security

- Strong authentication and authorization
- Input validation and sanitization
- Secure session management
- Regular dependency updates

### 3. Data Security

- Encrypt data at rest and in transit
- Implement proper backup encryption
- Access logging and audit trails
- HIPAA compliance for medical data

### 4. Container Security

- Use minimal base images
- Regular image updates
- Container resource limits
- Network segmentation

## Backup and Recovery

### Backup Strategy

The deployment script includes automated backup functionality:

```bash
# Manual backup
./deploy-production.sh backup

# Automated backups (configured in cron)
0 2 * * * /opt/dicom-viewer/deploy-production.sh backup
```

### Backup Components

1. **Database**: PostgreSQL dump
2. **Uploaded Files**: DICOM studies and user uploads
3. **Configuration**: Environment files and certificates
4. **Application Code**: Git repository state

### Recovery Procedures

#### 1. Full System Recovery

```bash
# Stop current services
docker-compose down

# Restore from backup
./deploy-production.sh rollback

# Verify recovery
./deploy-production.sh health
```

#### 2. Database Recovery

```bash
# Stop application
docker-compose stop backend frontend

# Restore database
docker-compose exec -T database psql -U dicom_user -d dicom_viewer < backup/database.sql

# Restart services
docker-compose start backend frontend
```

#### 3. File Recovery

```bash
# Restore uploaded files
cp -r backup/uploads/* server/uploads/

# Fix permissions
sudo chown -R 1001:1001 server/uploads
```

### Disaster Recovery

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 24 hours
3. **Backup Retention**: 30 days
4. **Off-site Backup**: Configure cloud storage for critical backups

## Performance Optimization

### 1. Database Optimization

```sql
-- Regular maintenance
VACUUM ANALYZE;
REINDEX DATABASE dicom_viewer;

-- Monitor slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### 2. Cache Optimization

```bash
# Monitor Redis performance
docker-compose exec redis redis-cli info stats

# Optimize cache configuration
# Edit redis.conf for memory and eviction policies
```

### 3. Application Optimization

- Enable gzip compression
- Optimize image delivery
- Implement CDN for static assets
- Use connection pooling

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Nginx or HAProxy
2. **Multiple Backend Instances**: Docker Swarm or Kubernetes
3. **Database Clustering**: PostgreSQL streaming replication
4. **Shared Storage**: NFS or cloud storage for uploads

### Vertical Scaling

1. **Resource Limits**: Adjust Docker memory and CPU limits
2. **Database Tuning**: Optimize PostgreSQL configuration
3. **Cache Sizing**: Increase Redis memory allocation

## Support and Maintenance

### Contact Information

- **Development Team**: dev-team@your-org.com
- **Operations Team**: ops-team@your-org.com
- **Emergency Contact**: +1-555-0123

### Documentation Updates

This guide should be updated whenever:
- New features are deployed
- Configuration changes are made
- Security procedures are modified
- Performance optimizations are implemented

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial deployment guide |
| 1.1.0 | 2024-02-01 | Added monitoring section |
| 1.2.0 | 2024-03-01 | Enhanced security procedures |

---

For additional support or questions, please refer to the project documentation or contact the development team.