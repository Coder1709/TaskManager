 
 #!/bin/bash
set -e

# Configuration
ZONE="us-central1-a"
VM_NAME="taskflow-vm"
REPO_URL="https://github.com/Coder1709/TaskManager.git"
DIR_NAME="TaskManager-jeera"

echo "Deploying updates to $VM_NAME..."

# Execute remote commands
gcloud compute ssh $VM_NAME --zone=$ZONE --command "
    if [ ! -d '$DIR_NAME' ]; then
        echo 'Cloning repository...'
        git clone $REPO_URL $DIR_NAME
    fi
    
    cd $DIR_NAME && \
    echo 'Fetching latest changes...' && \
    git fetch origin && \
    git reset --hard origin/main && \
    
    # Check for .env
    if [ ! -f .env ]; then
        echo 'WARNING: .env file not found. Copying example...'
        cp .env.example .env
        echo 'PLEASE EDIT .env ON SERVER WITH CORRECT SECRETS!'
    fi
    
    echo 'Stopping old containers...' && \
    sudo docker rm -f taskflow-db taskflow-backend taskflow-frontend taskflow-nginx taskflow-certbot || true && \
    echo 'Rebuilding containers...' && \
    sudo docker compose -f docker-compose.prod.yml up -d --build && \
    echo 'Running SSL setup...' && \
    chmod +x scripts/setup-ssl.sh && \
    sudo ./scripts/setup-ssl.sh
"

echo "Deployment complete!"
