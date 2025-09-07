# Book Review Platform - Backend Infrastructure

This directory contains Terraform configurations for deploying the Book Review Platform backend infrastructure on AWS.

## Architecture Overview

The infrastructure includes:
- **VPC** with public and private subnets across multiple AZs
- **RDS PostgreSQL** database in private subnets
- **ECS Fargate** cluster for containerized application deployment
- **Application Load Balancer** with SSL termination
- **S3 bucket** for static assets with CloudFront distribution
- **CloudWatch** monitoring and alerting
- **ECR** repository for container images

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Docker** for building container images
4. **AWS account** with necessary permissions

## Quick Start

### 1. Initialize Terraform

```bash
cd backend/terraform
terraform init
```

### 2. Plan Infrastructure

For development environment:
```bash
terraform plan -var-file="environments/dev.tfvars"
```

For staging environment:
```bash
terraform plan -var-file="environments/staging.tfvars"
```

For production environment:
```bash
terraform plan -var-file="environments/prod.tfvars"
```

### 3. Deploy Infrastructure

```bash
# Development
terraform apply -var-file="environments/dev.tfvars"

# Staging
terraform apply -var-file="environments/staging.tfvars"

# Production
terraform apply -var-file="environments/prod.tfvars"
```

### 4. Build and Push Docker Image

After infrastructure is deployed, build and push your application image:

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t book-review-platform-backend .

# Tag image
docker tag book-review-platform-backend:latest <ecr-repository-url>:latest

# Push image
docker push <ecr-repository-url>:latest
```

### 5. Update ECS Service

After pushing a new image, update the ECS service:

```bash
aws ecs update-service --cluster <cluster-name> --service <service-name> --force-new-deployment
```

## Environment Configuration

### Development (dev.tfvars)
- Minimal resources for cost optimization
- Single AZ deployment
- Small RDS instance (db.t3.micro)
- Single ECS task

### Staging (staging.tfvars)
- Production-like setup for testing
- Multi-AZ deployment
- Medium RDS instance (db.t3.small)
- Multiple ECS tasks

### Production (prod.tfvars)
- High availability setup
- Multi-AZ deployment across 3 zones
- Larger RDS instance (db.t3.medium)
- Multiple ECS tasks with auto-scaling
- Deletion protection enabled

## Customization

### Custom Domain

To use a custom domain:

1. Update the `domain_name` variable in your environment file
2. After applying Terraform, manually create DNS records for certificate validation
3. Update your DNS to point to the ALB

### Environment Variables

Add application-specific environment variables in the `app_environment_variables` map in your environment file.

### Scaling

Adjust the following variables for scaling:
- `ecs_task_cpu` and `ecs_task_memory` for vertical scaling
- `ecs_desired_count` for horizontal scaling
- `db_instance_class` for database scaling

## Monitoring

The infrastructure includes:

### CloudWatch Dashboard
- ALB metrics (request count, response time, error rates)
- ECS metrics (CPU, memory utilization)
- RDS metrics (CPU, connections, latency)

### CloudWatch Alarms
- High response time alerts
- 5XX error alerts
- High CPU/memory utilization alerts
- High database connection alerts

### SNS Notifications
Configure SNS topic subscriptions to receive alerts via email or SMS.

## Security Features

- **VPC** with private subnets for database and application
- **Security Groups** with minimal required access
- **RDS encryption** at rest
- **S3 bucket encryption** and public access blocking
- **ALB access logs** for audit trail
- **IAM roles** with least privilege access

## Backup and Recovery

- **RDS automated backups** with 7-day retention
- **Point-in-time recovery** enabled
- **Multi-AZ deployment** for high availability (staging/prod)
- **S3 versioning** enabled for assets

## Cost Optimization

- **Fargate Spot** capacity providers for cost savings
- **ECR lifecycle policies** to clean up old images
- **CloudWatch log retention** set to 7 days
- **S3 lifecycle policies** for ALB logs

## Troubleshooting

### Common Issues

1. **Certificate validation timeout**
   - Manually create DNS records for certificate validation
   - Check domain ownership

2. **ECS tasks failing to start**
   - Check CloudWatch logs for application errors
   - Verify environment variables and secrets

3. **Database connection issues**
   - Verify security group rules
   - Check database credentials in Secrets Manager

4. **High costs**
   - Review resource sizing in tfvars files
   - Consider using Spot instances for non-production

### Useful Commands

```bash
# View Terraform state
terraform show

# Get outputs
terraform output

# Destroy infrastructure (be careful!)
terraform destroy -var-file="environments/dev.tfvars"

# View ECS service status
aws ecs describe-services --cluster <cluster-name> --services <service-name>

# View CloudWatch logs
aws logs tail /ecs/<project-name> --follow
```

## Maintenance

### Regular Tasks

1. **Update Terraform providers** regularly
2. **Review and rotate** database passwords
3. **Monitor costs** and optimize resources
4. **Update security groups** as needed
5. **Review CloudWatch alarms** and adjust thresholds

### Backup Procedures

1. **Database backups** are automated via RDS
2. **Infrastructure state** should be backed up (consider remote state)
3. **Application code** should be version controlled

## Support

For issues or questions:
1. Check CloudWatch logs and metrics
2. Review Terraform documentation
3. Consult AWS documentation for specific services
4. Check the project's GitHub issues

## Security Considerations

- Never commit sensitive data to version control
- Use AWS Secrets Manager for sensitive configuration
- Regularly review IAM permissions
- Enable AWS CloudTrail for audit logging
- Keep Terraform and provider versions updated