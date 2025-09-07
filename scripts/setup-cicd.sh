#!/bin/bash

# CI/CD Pipeline Setup Script
# This script helps set up the GitHub Actions CI/CD pipeline for the Book Review Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
GITHUB_REPO=""
AWS_REGION="us-east-1"
PROJECT_NAME="book-review-platform"

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if GitHub CLI is installed
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed. Please install it first."
        log_info "Visit: https://cli.github.com/"
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        log_info "Visit: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    # Check GitHub authentication
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated. Please run 'gh auth login' first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Function to get repository information
get_repo_info() {
    log_step "Getting repository information..."
    
    # Try to get repo from git remote
    if git remote get-url origin &> /dev/null; then
        REPO_URL=$(git remote get-url origin)
        GITHUB_REPO=$(echo $REPO_URL | sed -n 's#.*github\.com[:/]\([^/]*\)/\([^/.]*\).*#\1/\2#p')
    fi
    
    if [ -z "$GITHUB_REPO" ]; then
        echo "Enter your GitHub repository (format: owner/repo):"
        read -r GITHUB_REPO
    fi
    
    log_info "Repository: $GITHUB_REPO"
}

# Function to create GitHub environments
create_github_environments() {
    log_step "Creating GitHub environments..."
    
    # Development environment
    log_info "Creating development environment..."
    gh api repos/$GITHUB_REPO/environments/development --method PUT --silent || true
    
    # Staging environment
    log_info "Creating staging environment..."
    gh api repos/$GITHUB_REPO/environments/staging --method PUT \
        --field 'protection_rules[0][type]=required_reviewers' \
        --field 'protection_rules[0][required_reviewers][users][0]=@me' \
        --silent || true
    
    # Production environment
    log_info "Creating production environment..."
    gh api repos/$GITHUB_REPO/environments/production --method PUT \
        --field 'protection_rules[0][type]=required_reviewers' \
        --field 'protection_rules[0][required_reviewers][users][0]=@me' \
        --field 'protection_rules[1][type]=branch_policy' \
        --field 'protection_rules[1][branch_policy]=main' \
        --silent || true
    
    log_info "GitHub environments created successfully"
}

# Function to set up AWS IAM user for CI/CD
setup_aws_iam() {
    log_step "Setting up AWS IAM user for CI/CD..."
    
    IAM_USER_NAME="${PROJECT_NAME}-cicd"
    POLICY_NAME="${PROJECT_NAME}-cicd-policy"
    
    # Check if user already exists
    if aws iam get-user --user-name $IAM_USER_NAME &> /dev/null; then
        log_warn "IAM user $IAM_USER_NAME already exists"
    else
        log_info "Creating IAM user: $IAM_USER_NAME"
        aws iam create-user --user-name $IAM_USER_NAME
    fi
    
    # Create IAM policy
    log_info "Creating IAM policy: $POLICY_NAME"
    
    cat > cicd-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:*",
                "ecs:*",
                "rds:*",
                "s3:*",
                "elasticloadbalancing:*",
                "cloudwatch:*",
                "logs:*",
                "iam:PassRole",
                "iam:GetRole",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:DeleteRole",
                "iam:ListRolePolicies",
                "iam:ListAttachedRolePolicies",
                "ec2:*",
                "route53:*",
                "acm:*",
                "secretsmanager:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    
    # Create or update policy
    POLICY_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$POLICY_NAME"
    
    if aws iam get-policy --policy-arn $POLICY_ARN &> /dev/null; then
        log_info "Updating existing policy..."
        aws iam create-policy-version --policy-arn $POLICY_ARN --policy-document file://cicd-policy.json --set-as-default
    else
        log_info "Creating new policy..."
        aws iam create-policy --policy-name $POLICY_NAME --policy-document file://cicd-policy.json
    fi
    
    # Attach policy to user
    log_info "Attaching policy to user..."
    aws iam attach-user-policy --user-name $IAM_USER_NAME --policy-arn $POLICY_ARN
    
    # Create access keys
    log_info "Creating access keys..."
    ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name $IAM_USER_NAME --output json)
    ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
    SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')
    
    # Clean up temporary file
    rm -f cicd-policy.json
    
    log_info "IAM setup completed"
    echo "Access Key ID: $ACCESS_KEY_ID"
    echo "Secret Access Key: $SECRET_ACCESS_KEY"
    echo ""
    log_warn "Save these credentials securely - they will not be shown again!"
}

# Function to set GitHub secrets
set_github_secrets() {
    log_step "Setting GitHub repository secrets..."
    
    echo "Enter AWS Access Key ID:"
    read -r AWS_ACCESS_KEY_ID
    
    echo "Enter AWS Secret Access Key:"
    read -s AWS_SECRET_ACCESS_KEY
    echo
    
    echo "Enter AWS Account ID:"
    read -r AWS_ACCOUNT_ID
    
    # Set required secrets
    gh secret set AWS_ACCESS_KEY_ID --body "$AWS_ACCESS_KEY_ID" --repo $GITHUB_REPO
    gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET_ACCESS_KEY" --repo $GITHUB_REPO
    gh secret set AWS_ACCOUNT_ID --body "$AWS_ACCOUNT_ID" --repo $GITHUB_REPO
    
    # Optional secrets
    echo "Enter Snyk token (optional, press Enter to skip):"
    read -r SNYK_TOKEN
    if [ -n "$SNYK_TOKEN" ]; then
        gh secret set SNYK_TOKEN --body "$SNYK_TOKEN" --repo $GITHUB_REPO
    fi
    
    echo "Enter Slack webhook URL (optional, press Enter to skip):"
    read -r SLACK_WEBHOOK
    if [ -n "$SLACK_WEBHOOK" ]; then
        gh secret set SLACK_WEBHOOK --body "$SLACK_WEBHOOK" --repo $GITHUB_REPO
    fi
    
    echo "Enter Security Slack webhook URL (optional, press Enter to skip):"
    read -r SECURITY_SLACK_WEBHOOK
    if [ -n "$SECURITY_SLACK_WEBHOOK" ]; then
        gh secret set SECURITY_SLACK_WEBHOOK --body "$SECURITY_SLACK_WEBHOOK" --repo $GITHUB_REPO
    fi
    
    echo "Enter Infracost API key (optional, press Enter to skip):"
    read -r INFRACOST_API_KEY
    if [ -n "$INFRACOST_API_KEY" ]; then
        gh secret set INFRACOST_API_KEY --body "$INFRACOST_API_KEY" --repo $GITHUB_REPO
    fi
    
    log_info "GitHub secrets configured successfully"
}

# Function to create Terraform variable files
create_terraform_vars() {
    log_step "Creating Terraform variable files..."
    
    cd ../infrastructure/backend/environments
    
    # Create actual tfvars files from examples
    for env in dev staging prod; do
        if [ ! -f "${env}.tfvars" ]; then
            log_info "Creating ${env}.tfvars from example..."
            cp "${env}.tfvars.example" "${env}.tfvars"
            log_warn "Please review and customize infrastructure/backend/environments/${env}.tfvars"
        else
            log_info "${env}.tfvars already exists"
        fi
    done
    
    cd ../../backend
    
    log_info "Terraform variable files created"
}

# Function to enable branch protection
enable_branch_protection() {
    log_step "Enabling branch protection rules..."
    
    # Protect main branch
    log_info "Protecting main branch..."
    gh api repos/$GITHUB_REPO/branches/main/protection --method PUT \
        --field 'required_status_checks[strict]=true' \
        --field 'required_status_checks[contexts][]=Lint and Format Check' \
        --field 'required_status_checks[contexts][]=Run Tests' \
        --field 'required_status_checks[contexts][]=Security Scan' \
        --field 'enforce_admins=true' \
        --field 'required_pull_request_reviews[required_approving_review_count]=1' \
        --field 'required_pull_request_reviews[dismiss_stale_reviews]=true' \
        --field 'restrictions=null' \
        --silent || log_warn "Failed to set branch protection for main"
    
    # Protect develop branch
    log_info "Protecting develop branch..."
    gh api repos/$GITHUB_REPO/branches/develop/protection --method PUT \
        --field 'required_status_checks[strict]=true' \
        --field 'required_status_checks[contexts][]=Lint and Format Check' \
        --field 'required_status_checks[contexts][]=Run Tests' \
        --field 'required_status_checks[contexts][]=Security Scan' \
        --field 'enforce_admins=false' \
        --field 'required_pull_request_reviews=null' \
        --field 'restrictions=null' \
        --silent || log_warn "Failed to set branch protection for develop"
    
    log_info "Branch protection rules configured"
}

# Function to test the setup
test_setup() {
    log_step "Testing CI/CD setup..."
    
    # Check if workflows exist
    if [ -f ".github/workflows/ci-cd.yml" ]; then
        log_info "✓ Main CI/CD workflow exists"
    else
        log_error "✗ Main CI/CD workflow missing"
    fi
    
    if [ -f ".github/workflows/rollback.yml" ]; then
        log_info "✓ Rollback workflow exists"
    else
        log_error "✗ Rollback workflow missing"
    fi
    
    if [ -f ".github/workflows/security-scan.yml" ]; then
        log_info "✓ Security scan workflow exists"
    else
        log_error "✗ Security scan workflow missing"
    fi
    
    # Check Terraform files
    if [ -f "../infrastructure/backend/main.tf" ]; then
        log_info "✓ Terraform configuration exists"
    else
        log_error "✗ Terraform configuration missing"
    fi
    
    # Check if secrets are set
    log_info "Checking GitHub secrets..."
    if gh secret list --repo $GITHUB_REPO | grep -q "AWS_ACCESS_KEY_ID"; then
        log_info "✓ AWS credentials configured"
    else
        log_warn "✗ AWS credentials not configured"
    fi
    
    log_info "Setup test completed"
}

# Function to show next steps
show_next_steps() {
    log_step "Setup completed! Next steps:"
    
    echo ""
    echo "1. Review and customize Terraform variable files:"
    echo "   - infrastructure/backend/environments/dev.tfvars"
    echo "   - infrastructure/backend/environments/staging.tfvars"
    echo "   - infrastructure/backend/environments/prod.tfvars"
    echo ""
    echo "2. Create the following branches if they don't exist:"
    echo "   - develop (for development deployments)"
    echo "   - staging (for staging deployments)"
    echo ""
    echo "3. Test the pipeline by:"
    echo "   - Creating a feature branch"
    echo "   - Making a small change"
    echo "   - Creating a PR to develop"
    echo "   - Observing the CI/CD pipeline run"
    echo ""
    echo "4. Monitor the first deployment:"
    echo "   - Check GitHub Actions for workflow status"
    echo "   - Monitor AWS CloudWatch for application logs"
    echo "   - Verify health checks pass"
    echo ""
    echo "5. Set up monitoring and alerts:"
    echo "   - Configure Slack webhooks for notifications"
    echo "   - Set up CloudWatch alarms"
    echo "   - Configure log aggregation"
    echo ""
    echo "For more information, see:"
    echo "- .github/README.md - CI/CD documentation"
    echo "- DEPLOYMENT.md - Deployment guide"
    echo ""
    log_info "CI/CD pipeline setup is complete!"
}

# Main execution
main() {
    echo "=========================================="
    echo "Book Review Platform CI/CD Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    get_repo_info
    
    echo ""
    echo "This script will:"
    echo "1. Create GitHub environments (development, staging, production)"
    echo "2. Set up AWS IAM user and policies for CI/CD"
    echo "3. Configure GitHub repository secrets"
    echo "4. Create Terraform variable files"
    echo "5. Enable branch protection rules"
    echo "6. Test the setup"
    echo ""
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Setup cancelled"
        exit 0
    fi
    
    create_github_environments
    
    echo ""
    read -p "Do you want to create a new AWS IAM user for CI/CD? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_aws_iam
    fi
    
    set_github_secrets
    create_terraform_vars
    enable_branch_protection
    test_setup
    show_next_steps
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --repo REPO    Specify GitHub repository (owner/repo)"
    echo "  --region REGION Specify AWS region (default: us-east-1)"
    echo ""
    echo "This script sets up the CI/CD pipeline for the Book Review Platform."
    echo "It creates GitHub environments, configures secrets, and sets up AWS resources."
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        --repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main