# Production Environment Configuration
project_name = "book-review-platform"
environment  = "prod"
aws_region   = "us-east-1"

# VPC Configuration
vpc_cidr           = "10.2.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# Database Configuration (production-ready)
db_instance_class         = "db.t3.medium"
db_allocated_storage      = 100
db_max_allocated_storage  = 1000
db_name                   = "bookreview_prod"
db_username               = "postgres"

# ECS Configuration (production-ready)
ecs_task_cpu       = 1024
ecs_task_memory    = 2048
ecs_desired_count  = 3
container_port     = 3000

# Custom domain (set your domain here)
domain_name = ""

# Application Environment Variables
app_environment_variables = {
  NODE_ENV = "production"
  PORT     = "3000"
}