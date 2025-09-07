#!/bin/bash

# Book Review Platform Backend Infrastructure Destruction Script
# This script safely destroys the AWS infrastructure

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

log_warn "WARNING: This will destroy ALL infrastructure for environment: $ENVIRONMENT"

# Safety check for production
if [ "$ENVIRONMENT" = "prod" ]; then
    log_error "Production environment destruction requires additional confirmation"
    echo "Type 'DELETE PRODUCTION' to confirm:"
    read -r confirmation
    if [ "$confirmation" != "DELETE PRODUCTION" ]; then
        log_error "Confirmation failed. Aborting."
        exit 1
    fi
fi

# Final confirmation
echo "Are you absolutely sure you want to destroy the $ENVIRONMENT environment? (type 'yes' to confirm):"
read -r final_confirmation
if [ "$final_confirmation" != "yes" ]; then
    log_error "Confirmation failed. Aborting."
    exit 1
fi

log_info "Starting infrastructure destruction for environment: $ENVIRONMENT"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
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

# Clean up ECR images
cleanup_ecr() {
    log_info "Cleaning up ECR repository..."
    
    cd ../../backend/infrastructure/backend
    
    # Get ECR repository name if it exists
    if terraform output ecr_repository_url &> /dev/null; then
        ECR_REPOSITORY_URL=$(terraform output -raw ecr_repository_url)
        REPOSITORY_NAME=$(echo $ECR_REPOSITORY_URL | cut -d'/' -f2)
        
        log_info "Deleting all images from ECR repository: $REPOSITORY_NAME"
        
        # List and delete all images
        IMAGE_TAGS=$(aws ecr list-images --repository-name $REPOSITORY_NAME --query 'imageIds[*].imageTag' --output text 2>/dev/null || echo "")
        
        if [ -n "$IMAGE_TAGS" ] && [ "$IMAGE_TAGS" != "None" ]; then
            for tag in $IMAGE_TAGS; do
                log_info "Deleting image with tag: $tag"
                aws ecr batch-delete-image --repository-name $REPOSITORY_NAME --image-ids imageTag=$tag || true
            done
        fi
        
        # Delete untagged images
        UNTAGGED_IMAGES=$(aws ecr list-images --repository-name $REPOSITORY_NAME --filter tagStatus=UNTAGGED --query 'imageIds[*].imageDigest' --output text 2>/dev/null || echo "")
        
        if [ -n "$UNTAGGED_IMAGES" ] && [ "$UNTAGGED_IMAGES" != "None" ]; then
            for digest in $UNTAGGED_IMAGES; do
                log_info "Deleting untagged image with digest: $digest"
                aws ecr batch-delete-image --repository-name $REPOSITORY_NAME --image-ids imageDigest=$digest || true
            done
        fi
    fi
    
    cd ../../backend
}

# Empty S3 buckets
empty_s3_buckets() {
    log_info "Emptying S3 buckets..."
    
    cd ../../backend/infrastructure/backend
    
    # Empty assets bucket
    if terraform output s3_bucket_name &> /dev/null; then
        ASSETS_BUCKET=$(terraform output -raw s3_bucket_name)
        log_info "Emptying S3 bucket: $ASSETS_BUCKET"
        aws s3 rm s3://$ASSETS_BUCKET --recursive || true
    fi
    
    # Empty ALB logs bucket (this is created with a random suffix)
    ALB_LOGS_BUCKETS=$(aws s3api list-buckets --query "Buckets[?contains(Name, '${PROJECT_NAME}-${ENVIRONMENT}-alb-logs')].Name" --output text 2>/dev/null || echo "")
    
    if [ -n "$ALB_LOGS_BUCKETS" ]; then
        for bucket in $ALB_LOGS_BUCKETS; do
            log_info "Emptying ALB logs bucket: $bucket"
            aws s3 rm s3://$bucket --recursive || true
        done
    fi
    
    cd ../../backend
}

# Destroy infrastructure with Terraform
destroy_infrastructure() {
    log_info "Destroying infrastructure with Terraform..."
    
    cd ../../backend/infrastructure/backend
    
    # Initialize Terraform if not already done
    if [ ! -d ".terraform" ]; then
        log_info "Initializing Terraform..."
        terraform init
    fi
    
    # Plan destruction
    log_info "Planning infrastructure destruction..."
    terraform plan -destroy -var-file="environments/${ENVIRONMENT}.tfvars" -out="destroy-plan"
    
    # Apply destruction
    log_info "Destroying infrastructure..."
    terraform apply destroy-plan
    rm -f destroy-plan
    
    cd ../../backend
    
    log_info "Infrastructure destruction completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f ../infrastructure/backend/destroy-plan
}

# Main destruction flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    cleanup_ecr
    empty_s3_buckets
    destroy_infrastructure
    
    log_info "Infrastructure destruction completed successfully!"
    log_warn "All resources for environment '$ENVIRONMENT' have been destroyed."
}

# Show usage information
show_usage() {
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "ENVIRONMENT: dev, staging, or prod (default: dev)"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION: AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 staging"
    echo "  AWS_REGION=us-west-2 $0 prod"
    echo ""
    echo "WARNING: This script will permanently destroy all infrastructure!"
    echo "Make sure you have backups of any important data before running."
}

# Handle help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Run main function
main