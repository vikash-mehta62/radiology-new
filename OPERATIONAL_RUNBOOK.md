# DICOM Viewer Operational Runbook

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Service Management](#service-management)
3. [Incident Response](#incident-response)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Performance Tuning](#performance-tuning)
6. [Security Operations](#security-operations)
7. [Backup Operations](#backup-operations)
8. [Monitoring and Alerting](#monitoring-and-alerting)

## Quick Reference

### Emergency Contacts
- **On-Call Engineer**: +1-555-0123
- **Development Lead**: dev-lead@your-org.com
- **Infrastructure Team**: infra@your-org.com
- **Security Team**: security@your-org.com

### Critical Commands
```bash
# Service status
docker-compose ps

# Quick restart
docker-compose restart

# Emergency stop
docker-compose down

# View logs
docker-compose logs -f [service]

# Health check
curl -f http://localhost/health
```

### Service URLs
- **Application**: https://your-domain.com
- **API Health**: https://your-domain.com/api/health
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

## Service Management

### Starting Services

```bash
# Start all services
cd /opt/dicom-viewer
docker-compose up -d

# Start specific service
docker-compose up -d [service-name]

# Verify startup
docker-compose ps
docker-compose logs -f
```

### Stopping Services

```bash
# Graceful shutdown
docker-compose down

# Force stop (emergency)
docker-compose kill

# Stop specific service
docker-compose stop [service-name]
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart [service-name]

# Rolling restart (zero downtime)
docker-compose up -d --force-recreate --no-deps [service-name]
```

### Service Dependencies

**Startup Order:**
1. Database (PostgreSQL)
2. Cache (Redis)
3. Backend (Node.js API)
4. Frontend (Nginx + React)
5. Monitoring (Prometheus, Grafana)

**Dependency Map:**
- Frontend → Backend → Database
- Backend → Redis (for sessions)
- Monitoring → All services

## Incident Response

### Severity Levels

#### P0 - Critical (Response: Immediate)
- Complete service outage
- Data loss or corruption
- Security breach

#### P1 - High (Response: 30 minutes)
- Partial service degradation
- Performance issues affecting users
- Failed backups

#### P2 - Medium (Response: 2 hours)
- Non-critical feature failures
- Monitoring alerts
- Minor performance issues

#### P3 - Low (Response: Next business day)
- Documentation updates
- Enhancement requests
- Non-urgent maintenance

### Incident Response Procedures

#### 1. Service Outage

**Symptoms:**
- HTTP 5xx errors
- Connection timeouts
- Health check failures

**Investigation Steps:**
```bash
# Check service status
docker-compose ps

# Check system resources
df -h
free -m
top

# Check logs for errors
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend
docker-compose logs --tail=100 database

# Check network connectivity
ping database
telnet localhost 5432
telnet localhost 6379
```

**Resolution Steps:**
```bash
# Restart affected services
docker-compose restart [service-name]

# If restart fails, check configuration
docker-compose config

# Check for port conflicts
sudo netstat -tulpn | grep -E ':(80|443|3001|5432|6379)'

# Emergency rollback if needed
./deploy-production.sh rollback
```

#### 2. Database Issues

**Symptoms:**
- Connection errors
- Slow query performance
- Lock timeouts

**Investigation Steps:**
```bash
# Check database status
docker-compose exec database pg_isready -U dicom_user

# Check active connections
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT count(*) FROM pg_stat_activity;"

# Check for long-running queries
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# Check database size
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT pg_size_pretty(pg_database_size('dicom_viewer'));"
```

**Resolution Steps:**
```bash
# Kill long-running queries (if safe)
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes';"

# Restart database (last resort)
docker-compose restart database

# Check for corruption
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT datname, pg_database_size(datname) FROM pg_database;"
```

#### 3. High Memory Usage

**Symptoms:**
- OOM kills
- Slow response times
- Swap usage

**Investigation Steps:**
```bash
# Check container memory usage
docker stats --no-stream

# Check system memory
free -m
cat /proc/meminfo

# Check for memory leaks
docker-compose exec backend node --inspect=0.0.0.0:9229 &
# Use Chrome DevTools to connect and analyze
```

**Resolution Steps:**
```bash
# Restart high-memory containers
docker-compose restart backend

# Adjust memory limits
# Edit docker-compose.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 2G

# Clear caches
docker-compose exec redis redis-cli FLUSHDB
```

#### 4. SSL Certificate Issues

**Symptoms:**
- Certificate expired warnings
- SSL handshake failures
- Browser security errors

**Investigation Steps:**
```bash
# Check certificate expiration
openssl x509 -in ssl/nginx-selfsigned.crt -text -noout | grep "Not After"

# Test SSL connection
openssl s_client -connect localhost:443 -servername your-domain.com

# Check certificate chain
curl -vI https://your-domain.com
```

**Resolution Steps:**
```bash
# Regenerate certificates
cd ssl
./generate-ssl.sh your-domain.com production

# Restart frontend to load new certificates
docker-compose restart frontend

# Verify new certificate
curl -vI https://your-domain.com
```

## Maintenance Procedures

### Daily Maintenance

```bash
#!/bin/bash
# Daily maintenance script

# Check service health
echo "Checking service health..."
curl -f http://localhost/health || echo "Frontend health check failed"
curl -f http://localhost:3001/api/health || echo "Backend health check failed"

# Check disk space
echo "Checking disk space..."
df -h | awk '$5 > 80 {print "WARNING: " $0}'

# Check logs for errors
echo "Checking for errors in logs..."
docker-compose logs --since=24h | grep -i error | tail -10

# Verify backup completion
echo "Checking backup status..."
ls -la /opt/backups/dicom-viewer/ | tail -5

# Check certificate expiration (warn if < 30 days)
echo "Checking SSL certificate..."
openssl x509 -in ssl/nginx-selfsigned.crt -checkend 2592000 || echo "WARNING: Certificate expires within 30 days"
```

### Weekly Maintenance

```bash
#!/bin/bash
# Weekly maintenance script

# Update system packages
sudo apt update && sudo apt list --upgradable

# Clean up old Docker images
docker image prune -f

# Analyze database performance
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats WHERE schemaname='public' ORDER BY n_distinct DESC LIMIT 10;"

# Check log file sizes
find /var/log -name "*.log" -size +100M -exec ls -lh {} \;

# Verify backup integrity
latest_backup=$(ls -t /opt/backups/dicom-viewer/database_*.sql | head -1)
if [ -f "$latest_backup" ]; then
    echo "Testing backup integrity: $latest_backup"
    # Test restore to temporary database
    docker-compose exec database createdb -U dicom_user test_restore
    docker-compose exec -T database psql -U dicom_user -d test_restore < "$latest_backup"
    docker-compose exec database dropdb -U dicom_user test_restore
    echo "Backup integrity check passed"
fi
```

### Monthly Maintenance

```bash
#!/bin/bash
# Monthly maintenance script

# Security updates
sudo apt update && sudo apt upgrade -y

# Docker system cleanup
docker system prune -f

# Database maintenance
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "VACUUM ANALYZE;"
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "REINDEX DATABASE dicom_viewer;"

# Log rotation
sudo logrotate -f /etc/logrotate.d/dicom-viewer

# Performance analysis
echo "Generating performance report..."
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Security scan
echo "Running security scan..."
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image dicom-viewer_backend:latest
```

## Performance Tuning

### Database Optimization

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time, stddev_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Optimize configuration
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

### Redis Optimization

```bash
# Check Redis performance
docker-compose exec redis redis-cli info stats

# Monitor memory usage
docker-compose exec redis redis-cli info memory

# Check slow log
docker-compose exec redis redis-cli slowlog get 10

# Optimize configuration
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
docker-compose exec redis redis-cli config set maxmemory 512mb
```

### Application Performance

```bash
# Monitor Node.js performance
docker-compose exec backend node --inspect=0.0.0.0:9229 server.js &

# Check memory leaks
docker-compose exec backend node --expose-gc server.js

# Profile CPU usage
docker-compose exec backend node --prof server.js
```

## Security Operations

### Security Monitoring

```bash
# Check for failed login attempts
docker-compose logs backend | grep "authentication failed" | tail -20

# Monitor suspicious activity
docker-compose logs nginx | grep -E "(404|403|500)" | tail -20

# Check for unusual traffic patterns
docker-compose exec frontend tail -f /var/log/nginx/access.log | grep -v "200\|304"

# Verify SSL configuration
nmap --script ssl-enum-ciphers -p 443 localhost
```

### Security Incident Response

```bash
# Block suspicious IP
docker-compose exec frontend nginx -s reload

# Check for malware
sudo clamscan -r /opt/dicom-viewer/

# Audit file changes
sudo find /opt/dicom-viewer/ -type f -mtime -1 -ls

# Check for unauthorized access
docker-compose logs | grep -i "unauthorized\|forbidden\|denied"
```

### Security Hardening

```bash
# Update all packages
sudo apt update && sudo apt upgrade -y

# Check for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image dicom-viewer_backend:latest

# Rotate secrets
# Update JWT_SECRET in .env.production
# Restart backend service
docker-compose restart backend

# Review user permissions
docker-compose exec database psql -U dicom_user -d dicom_viewer -c "SELECT usename, usesuper, usecreatedb FROM pg_user;"
```

## Backup Operations

### Manual Backup

```bash
# Full backup
./deploy-production.sh backup

# Database only
docker-compose exec database pg_dump -U dicom_user dicom_viewer > backup_$(date +%Y%m%d_%H%M%S).sql

# Files only
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz server/uploads/
```

### Backup Verification

```bash
# Test database backup
latest_backup=$(ls -t /opt/backups/dicom-viewer/database_*.sql | head -1)
docker-compose exec database createdb -U dicom_user test_restore
docker-compose exec -T database psql -U dicom_user -d test_restore < "$latest_backup"
docker-compose exec database psql -U dicom_user -d test_restore -c "SELECT count(*) FROM users;"
docker-compose exec database dropdb -U dicom_user test_restore
```

### Backup Cleanup

```bash
# Remove backups older than 30 days
find /opt/backups/dicom-viewer/ -name "*.sql" -mtime +30 -delete
find /opt/backups/dicom-viewer/ -name "*.tar.gz" -mtime +30 -delete

# Check backup disk usage
du -sh /opt/backups/dicom-viewer/
```

## Monitoring and Alerting

### Key Metrics Dashboard

Access Grafana at http://localhost:3000 and monitor:

1. **System Metrics**:
   - CPU usage > 80%
   - Memory usage > 85%
   - Disk usage > 90%
   - Network I/O

2. **Application Metrics**:
   - Response time > 2s
   - Error rate > 5%
   - Active users
   - Request rate

3. **Database Metrics**:
   - Connection count
   - Query performance
   - Lock waits
   - Replication lag

### Alert Configuration

```yaml
# prometheus/alerts.yml
groups:
  - name: dicom-viewer
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
```

### Log Analysis

```bash
# Error analysis
docker-compose logs | grep -i error | sort | uniq -c | sort -nr

# Performance analysis
docker-compose logs nginx | awk '{print $9}' | sort | uniq -c | sort -nr

# User activity
docker-compose logs backend | grep "user login" | wc -l
```

---

**Note**: This runbook should be kept up-to-date with any changes to the system architecture or procedures. Regular reviews and updates are essential for maintaining operational effectiveness.