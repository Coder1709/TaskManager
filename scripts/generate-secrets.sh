#!/bin/bash

# TaskFlow - Secure Secret Generator
# Generates strong random secrets for your production environment

set -e

GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Generating secure secrets for TaskFlow..."

# Function to generate a random string
generate_secret() {
    openssl rand -base64 32 | tr -d '/+' | cut -c1-32
}

# Generate secrets
DB_PASSWORD=$(generate_secret)
JWT_ACCESS=$(generate_secret)
JWT_REFRESH=$(generate_secret)

echo -e "${GREEN}Secrets generated!${NC}"
echo ""
echo "Here is a template for your .env file with SECURE GENERATED VALUES."
echo "Copy the content below and paste it into your local .env file or on the server."
echo "================================================================================"
echo ""

cat << EOF
# Domain Configuration
DOMAIN_NAME=taskmanagers.in
FRONTEND_URL=https://taskmanagers.in

# Database - SECURELY GENERATED
# Do not share this password
DB_PASSWORD=${DB_PASSWORD}

# JWT Secrets - SECURELY GENERATED
# Do not share these secrets
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}

# Google Gemini API Key
GEMINI_API_KEY=AIzaSyDFX46Dn-aVLGo3HdeghYcbV1leG-4VbzY

# Email Configuration (SendGrid Recommended)
# WARNING: You pasted a Google Key as your SendGrid Key. 
# Please replace this with your real SendGrid key starting with "SG."
SENDGRID_API_KEY=your-sendgrid-api-key-here
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=coderinashell@gmail.com

# Email Configuration (SMTP Backup - Gmail example)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
EOF

echo ""
echo "================================================================================"
echo -e "${GREEN}INSTRUCTIONS:${NC}"
echo "1. Copy the output above."
echo "2. Paste it into your '.env' file."
echo "3. Replace 'your-gemini-api-key-here' and 'your-sendgrid-api-key-here' with your real keys."
echo "4. Save the file."
