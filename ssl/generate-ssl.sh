#!/bin/bash

# SSL Certificate Generation Script for DICOM Viewer
# Supports both self-signed certificates for development and production certificates

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR"
DOMAIN="${1:-localhost}"
ENVIRONMENT="${2:-development}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v openssl &> /dev/null; then
        error "OpenSSL is not installed"
    fi
    
    success "Prerequisites check passed"
}

# Generate CA certificate
generate_ca() {
    log "Generating Certificate Authority (CA)..."
    
    # Generate CA private key
    openssl genrsa -out ca-key.pem 4096
    
    # Generate CA certificate
    openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem -subj "/C=US/ST=CA/L=San Francisco/O=DICOM Viewer/OU=IT Department/CN=DICOM Viewer CA"
    
    success "CA certificate generated"
}

# Generate server certificate
generate_server_cert() {
    log "Generating server certificate for domain: $DOMAIN"
    
    # Generate server private key
    openssl genrsa -out server-key.pem 4096
    
    # Generate certificate signing request
    openssl req -subj "/CN=$DOMAIN" -sha256 -new -key server-key.pem -out server.csr
    
    # Create extensions file
    cat > server-extfile.cnf <<EOF
subjectAltName = DNS:$DOMAIN,DNS:www.$DOMAIN,DNS:localhost,IP:127.0.0.1,IP:0.0.0.0
extendedKeyUsage = serverAuth
keyUsage = keyEncipherment, dataEncipherment
EOF
    
    # Generate server certificate
    openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -out server-cert.pem -extfile server-extfile.cnf -CAcreateserial
    
    # Clean up
    rm server.csr server-extfile.cnf
    
    success "Server certificate generated for $DOMAIN"
}

# Generate self-signed certificate (for development)
generate_self_signed() {
    log "Generating self-signed certificate for development..."
    
    # Create configuration file
    cat > openssl.cnf <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=CA
L=San Francisco
O=DICOM Viewer Development
OU=IT Department
CN=$DOMAIN

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = localhost
DNS.3 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
    
    # Generate private key and certificate
    openssl req -x509 -newkey rsa:2048 -keyout nginx-selfsigned.key -out nginx-selfsigned.crt -days 365 -nodes -config openssl.cnf -extensions v3_req
    
    # Clean up
    rm openssl.cnf
    
    success "Self-signed certificate generated"
}

# Generate DH parameters
generate_dhparam() {
    log "Generating Diffie-Hellman parameters (this may take a while)..."
    
    openssl dhparam -out dhparam.pem 2048
    
    success "DH parameters generated"
}

# Set proper permissions
set_permissions() {
    log "Setting proper file permissions..."
    
    # Set restrictive permissions on private keys
    chmod 600 *.key *.pem 2>/dev/null || true
    
    # Set readable permissions on certificates
    chmod 644 *.crt 2>/dev/null || true
    
    success "File permissions set"
}

# Verify certificates
verify_certificates() {
    log "Verifying certificates..."
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        # Verify self-signed certificate
        if [[ -f "nginx-selfsigned.crt" ]]; then
            openssl x509 -in nginx-selfsigned.crt -text -noout | grep -E "(Subject:|DNS:|IP Address:)"
            success "Self-signed certificate verified"
        fi
    else
        # Verify CA-signed certificate
        if [[ -f "server-cert.pem" && -f "ca.pem" ]]; then
            openssl verify -CAfile ca.pem server-cert.pem
            openssl x509 -in server-cert.pem -text -noout | grep -E "(Subject:|DNS:|IP Address:)"
            success "Server certificate verified"
        fi
    fi
}

# Create nginx SSL configuration snippet
create_nginx_config() {
    log "Creating Nginx SSL configuration snippet..."
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        cat > ssl-params.conf <<EOF
# SSL Configuration for Development
ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

# SSL Settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_ecdh_curve secp384r1;
ssl_session_timeout 10m;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
EOF
    else
        cat > ssl-params.conf <<EOF
# SSL Configuration for Production
ssl_certificate /etc/ssl/certs/server-cert.pem;
ssl_certificate_key /etc/ssl/private/server-key.pem;
ssl_trusted_certificate /etc/ssl/certs/ca.pem;

# SSL Settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_ecdh_curve secp384r1;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
ssl_dhparam /etc/ssl/certs/dhparam.pem;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
EOF
    fi
    
    success "Nginx SSL configuration created"
}

# Show usage
usage() {
    echo "Usage: $0 [DOMAIN] [ENVIRONMENT]"
    echo ""
    echo "Arguments:"
    echo "  DOMAIN       Domain name for the certificate (default: localhost)"
    echo "  ENVIRONMENT  Environment type: development or production (default: development)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Generate self-signed cert for localhost"
    echo "  $0 dicom-viewer.com development       # Generate self-signed cert for domain"
    echo "  $0 dicom-viewer.com production        # Generate CA-signed cert for production"
}

# Main execution
main() {
    if [[ "${1:-}" == "help" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
        usage
        exit 0
    fi
    
    log "Starting SSL certificate generation"
    log "Domain: $DOMAIN"
    log "Environment: $ENVIRONMENT"
    
    check_prerequisites
    
    # Create certificate directory
    mkdir -p "$CERT_DIR"
    cd "$CERT_DIR"
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        generate_self_signed
    else
        generate_ca
        generate_server_cert
        generate_dhparam
    fi
    
    set_permissions
    verify_certificates
    create_nginx_config
    
    success "SSL certificate generation completed"
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        warning "Self-signed certificates are not trusted by browsers by default"
        warning "You may need to add security exceptions or install the CA certificate"
    else
        log "For production, ensure you:"
        log "1. Keep private keys secure and backed up"
        log "2. Set up certificate renewal before expiration"
        log "3. Configure proper firewall rules"
        log "4. Test SSL configuration with SSL Labs or similar tools"
    fi
}

# Run main function
main "$@"