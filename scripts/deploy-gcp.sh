#!/bin/bash
# TaskFlow - Google Cloud Compute Engine Deployment Script
# This script creates a VM, reserves a static IP, and prepares for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TaskFlow GCP Compute Engine Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Configuration - UPDATE THESE VALUES
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
VM_NAME="taskflow-vm"
MACHINE_TYPE="e2-small"
IP_NAME="taskflow-ip"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if project ID is set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}GCP Project ID not set. Detecting from gcloud...${NC}"
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: No project ID found. Please set GCP_PROJECT_ID or run 'gcloud config set project YOUR_PROJECT_ID'${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Using Project: ${PROJECT_ID}${NC}"
echo -e "${GREEN}Region: ${REGION}${NC}"
echo -e "${GREEN}Zone: ${ZONE}${NC}"

# Set the project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo -e "\n${YELLOW}Enabling required APIs...${NC}"
gcloud services enable compute.googleapis.com --quiet

# Check if static IP already exists
echo -e "\n${YELLOW}Checking for existing static IP...${NC}"
if gcloud compute addresses describe "$IP_NAME" --region="$REGION" &> /dev/null; then
    echo -e "${GREEN}Static IP '$IP_NAME' already exists${NC}"
else
    echo -e "${YELLOW}Creating static IP address...${NC}"
    gcloud compute addresses create "$IP_NAME" --region="$REGION"
fi

# Get the static IP
STATIC_IP=$(gcloud compute addresses describe "$IP_NAME" --region="$REGION" --format="get(address)")
echo -e "${GREEN}Static IP: ${STATIC_IP}${NC}"

# Create firewall rules if they don't exist
echo -e "\n${YELLOW}Configuring firewall rules...${NC}"
if ! gcloud compute firewall-rules describe allow-http &> /dev/null; then
    gcloud compute firewall-rules create allow-http \
        --allow tcp:80 \
        --target-tags http-server \
        --description "Allow HTTP traffic" \
        --quiet
    echo -e "${GREEN}Created HTTP firewall rule${NC}"
else
    echo -e "${GREEN}HTTP firewall rule already exists${NC}"
fi

if ! gcloud compute firewall-rules describe allow-https &> /dev/null; then
    gcloud compute firewall-rules create allow-https \
        --allow tcp:443 \
        --target-tags https-server \
        --description "Allow HTTPS traffic" \
        --quiet
    echo -e "${GREEN}Created HTTPS firewall rule${NC}"
else
    echo -e "${GREEN}HTTPS firewall rule already exists${NC}"
fi

# Check if VM already exists
echo -e "\n${YELLOW}Checking for existing VM...${NC}"
if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" &> /dev/null; then
    echo -e "${YELLOW}VM '$VM_NAME' already exists. Skipping creation.${NC}"
else
    echo -e "${YELLOW}Creating Compute Engine VM...${NC}"
    gcloud compute instances create "$VM_NAME" \
        --zone="$ZONE" \
        --machine-type="$MACHINE_TYPE" \
        --image-family=ubuntu-2204-lts \
        --image-project=ubuntu-os-cloud \
        --boot-disk-size=30GB \
        --address="$STATIC_IP" \
        --tags=http-server,https-server \
        --metadata=startup-script='#!/bin/bash
# Update system
apt-get update
apt-get upgrade -y

# Install Docker
apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker
systemctl enable docker
systemctl start docker

# Add default user to docker group
usermod -aG docker ubuntu

echo "Docker installation complete!"
'
    echo -e "${GREEN}VM created successfully!${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Static IP Address: ${STATIC_IP}${NC}"
echo -e "${YELLOW}Use this IP in your GoDaddy DNS settings${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Wait 2-3 minutes for Docker to install on the VM"
echo ""
echo "2. SSH into the VM:"
echo -e "   ${YELLOW}gcloud compute ssh ${VM_NAME} --zone=${ZONE}${NC}"
echo ""
echo "3. Once connected, clone your repository:"
echo -e "   ${YELLOW}git clone <your-repo-url>${NC}"
echo -e "   ${YELLOW}cd TaskManager-jeera${NC}"
echo ""
echo "4. Create the .env file:"
echo -e "   ${YELLOW}cp .env.example .env${NC}"
echo -e "   ${YELLOW}nano .env  # Edit with your values${NC}"
echo ""
echo "5. Start the application:"
echo -e "   ${YELLOW}sudo docker compose -f docker-compose.prod.yml up -d --build${NC}"
echo ""
echo "6. Access your app at: http://${STATIC_IP}"
echo ""
echo -e "${GREEN}GoDaddy DNS Configuration:${NC}"
echo "Add these DNS records in GoDaddy:"
echo "  Type: A    Name: @    Value: ${STATIC_IP}    TTL: 600"
echo "  Type: A    Name: www  Value: ${STATIC_IP}    TTL: 600"
echo ""
