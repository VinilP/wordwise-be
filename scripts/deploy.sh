#!/bin/bash

# Book Review Platform Backend Deployment Script
# This script builds and deploys the backend application to AWS ECS

set -e

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="book-review-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is valid
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be one of: dev, staging, prod"
    exit 1
fi

log_info "Starting deployment for environment: $ENVIRONMENT"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd ../../backend/infrastructure/backend
    
    # Initialize Terraform if not already done
    if [ ! -d ".terraform" ]; then
        log_info "Initializing Terraform..."
        terraform init
    fi
    
    # Plan infrastructure changes
    log_info "Planning infrastructure changes..."
    terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="tfplan"
    
    # Ask for confirmation
    read -p "Do you want to apply these changes? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Deployment cancelled by user"
        rm -f tfplan
        exit 0
    fi
    
    # Apply infrastructure changes
    log_info "Applying infrastructure changes..."
    terraform apply tfplan
    rm -f tfplan
    
    # Get outputs
    ECR_REPOSITORY_URL=$(terraform output -raw ecr_repository_url)
    ECS_CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
    ECS_SERVICE_NAME=$(terraform output -raw ecs_service_name)
    
    cd ../../backend
    
    log_info "Infrastructure deployment completed"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    # Get ECR login token
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URL
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t ${PROJECT_NAME}-${ENVIRONMENT} .
    
    # Tag image for ECR
    IMAGE_TAG="latest"
    if [ "$ENVIRONMENT" != "dev" ]; then
        IMAGE_TAG="${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"
    fi
    
    docker tag ${PROJECT_NAME}-${ENVIRONMENT}:latest $ECR_REPOSITORY_URL:$IMAGE_TAG
    docker tag ${PROJECT_NAME}-${ENVIRONMENT}:latest $ECR_REPOSITORY_URL:latest
    
    # Push image to ECR
    log_info "Pushing image to ECR..."
    docker push $ECR_REPOSITORY_URL:$IMAGE_TAG
    docker push $ECR_REPOSITORY_URL:latest
    
    log_info "Docker image pushed successfully"
}

# Update ECS service
update_ecs_service() {
    log_info "Updating ECS service..."
    
    # Force new deployment to pick up the new image
    aws ecs update-service \
        --cluster $ECS_CLUSTER_NAME \
        --service $ECS_SERVICE_NAME \
        --force-new-deployment \
        --region $AWS_REGION
    
    log_info "ECS service update initiated"
    
    # Wait for deployment to complete
    log_info "Waiting for deployment to complete..."
    aws ecs wait services-stable \
        --cluster $ECS_CLUSTER_NAME \
        --services $ECS_SERVICE_NAME \
        --region $AWS_REGION
    
    log_info "ECS service deployment completed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Get a running task ARN
    TASK_ARN=$(aws ecs list-tasks \
        --cluster $ECS_CLUSTER_NAME \
        --service-name $ECS_SERVICE_NAME \
        --desired-status RUNNING \
        --query 'taskArns[0]' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
        log_warn "No running tasks found. Skipping migrations."
        return
    fi
    
    # Run migrations using ECS exec
    log_info "Executing migrations on task: $TASK_ARN"
    aws ecs execute-command \
        --cluster $ECS_CLUSTER_NAME \
        --task $TASK_ARN \
        --container ${PROJECT_NAME}-${ENVIRONMENT}-app \
        --interactive \
        --command "npx prisma migrate deploy" \
        --region $AWS_REGION
    
    log_info "Database migrations completed"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Get ALB DNS name
    cd ../../backend/infrastructure/backend
    ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
    cd ../../backend
    
    HEALTH_URL="https://$ALB_DNS_NAME/health"
    
    # Wait for service to be healthy
    for i in {1..30}; do
        if curl -f -s $HEALTH_URL > /dev/null; then
            log_info "Health check passed: $HEALTH_URL"
            return 0
        fi
        log_info "Health check attempt $i/30 failed, retrying in 10 seconds..."
        sleep 10
    done
    
    log_error "Health check failed after 30 attempts"
    return 1
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f ../infrastructure/backend/tfplan
    docker system prune -f
}

# Main deployment flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    deploy_infrastructure
    build_and_push_image
    update_ecs_service
    
    # Run migrations only for non-dev environments or if explicitly requested
    if [ "$ENVIRONMENT" != "dev" ] || [ "$RUN_MIGRATIONS" = "true" ]; then
        run_migrations
    fi
    
    health_check
    
    log_info "Deployment completed successfully!"
    log_info "Application URL: https://$(cd ../infrastructure/backend && terraform output -raw alb_dns_name)"
    log_info "Health Check URL: https://$(cd ../infrastructure/backend && terraform output -raw alb_dns_name)/health"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "ENVIRONMENT: dev, staging, or prod (default: dev)"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION: AWS region (default: us-east-1)"
    echo "  RUN_MIGRATIONS: Set to 'true' to run migrations (default: false for dev)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 staging"
    echo "  AWS_REGION=us-west-2 $0 prod"
    echo "  RUN_MIGRATIONS=true $0 dev"
}

# Handle help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Run main function
main