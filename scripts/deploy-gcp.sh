#!/bin/bash
# TaskFlow - Google Cloud Deployment Script
# This script sets up and deploys the application to Google Cloud

set -e

# Configuration - Update these values
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
DB_INSTANCE_NAME="taskflow-db"
DB_NAME="taskflow"
DB_USER="taskflow"
BACKEND_SERVICE="taskflow-backend"
FRONTEND_SERVICE="taskflow-frontend"
REPO_NAME="taskflow"

echo "========================================"
echo "TaskFlow - Google Cloud Deployment"
echo "========================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed"
    echo "Download from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1; then
    echo "Please login to Google Cloud:"
    gcloud auth login
fi

# Set project
echo "Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo ""
echo "Enabling required APIs..."
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    --quiet

echo "APIs enabled successfully"

# Create Artifact Registry repository
echo ""
echo "Creating Artifact Registry repository..."
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION &> /dev/null; then
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="TaskFlow container images"
    echo "Repository created"
else
    echo "Repository already exists"
fi

# Create Cloud SQL instance (if not exists)
echo ""
echo "Setting up Cloud SQL..."
if ! gcloud sql instances describe $DB_INSTANCE_NAME &> /dev/null; then
    echo "Creating Cloud SQL instance (this may take several minutes)..."
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-auto-increase \
        --backup-start-time=03:00

    # Create database
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

    # Generate random password
    DB_PASSWORD=$(openssl rand -base64 24)
    
    # Create user
    gcloud sql users create $DB_USER \
        --instance=$DB_INSTANCE_NAME \
        --password=$DB_PASSWORD

    echo "Cloud SQL instance created"
    echo "IMPORTANT: Save this database password securely: $DB_PASSWORD"
else
    echo "Cloud SQL instance already exists"
    echo "If you need the connection details, get them from Cloud Console"
fi

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)")
echo "Connection name: $CONNECTION_NAME"

# Create secrets (if not exist)
echo ""
echo "Setting up Secret Manager..."

# Function to create or update secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if ! gcloud secrets describe $secret_name &> /dev/null; then
        echo "$secret_value" | gcloud secrets create $secret_name --data-file=-
        echo "Created secret: $secret_name"
    else
        echo "Secret $secret_name already exists (skipping)"
    fi
}

# Prompt for secrets if not set
if [ -z "$JWT_ACCESS_SECRET" ]; then
    JWT_ACCESS_SECRET=$(openssl rand -base64 32)
fi
if [ -z "$JWT_REFRESH_SECRET" ]; then
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
fi

create_secret "taskflow-jwt-access" "$JWT_ACCESS_SECRET"
create_secret "taskflow-jwt-refresh" "$JWT_REFRESH_SECRET"

# Create Gemini API key secret
if [ ! -z "$GEMINI_API_KEY" ]; then
    create_secret "taskflow-gemini-key" "$GEMINI_API_KEY"
fi

# Create DB URL secret
if [ ! -z "$DB_PASSWORD" ]; then
    DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
    create_secret "taskflow-db-url" "$DB_URL"
fi

# Build and push backend image
echo ""
echo "Building and pushing backend image..."
cd backend

# Configure Docker for Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${BACKEND_SERVICE}:latest .

# Push image
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${BACKEND_SERVICE}:latest

cd ..

# Build and push frontend image
echo ""
echo "Building and pushing frontend image..."
cd frontend

docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${FRONTEND_SERVICE}:latest .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${FRONTEND_SERVICE}:latest

cd ..

# Deploy backend to Cloud Run
echo ""
echo "Deploying backend to Cloud Run..."
gcloud run deploy $BACKEND_SERVICE \
    --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${BACKEND_SERVICE}:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --add-cloudsql-instances $CONNECTION_NAME \
    --set-env-vars "NODE_ENV=production" \
    --set-secrets "DATABASE_URL=taskflow-db-url:latest,JWT_ACCESS_SECRET=taskflow-jwt-access:latest,JWT_REFRESH_SECRET=taskflow-jwt-refresh:latest,GEMINI_API_KEY=taskflow-gemini-key:latest" \
    --memory 512Mi \
    --min-instances 0 \
    --max-instances 10

# Get backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")
echo "Backend deployed: $BACKEND_URL"

# Deploy frontend to Cloud Run
echo ""
echo "Deploying frontend to Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE \
    --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${FRONTEND_SERVICE}:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "VITE_API_URL=${BACKEND_URL}/api" \
    --memory 256Mi \
    --min-instances 0 \
    --max-instances 5

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)")

echo ""
echo "========================================"
echo "DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL:  $BACKEND_URL"
echo "API Docs:     ${BACKEND_URL}/api-docs"
echo ""
echo "Next steps:"
echo "1. Visit your frontend URL to access TaskFlow"
echo "2. Configure custom domain (optional):"
echo "   gcloud run domain-mappings create --service=$FRONTEND_SERVICE --domain=your-domain.com --region=$REGION"
echo ""
