# Staging Environment Configuration
project_name = "book-review-platform"
environment  = "staging"
aws_region   = "us-east-1"

# VPC Configuration
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# Database Configuration
db_instance_class         = "db.t3.small"
db_allocated_storage      = 20
db_max_allocated_storage  = 100
db_name                   = "bookreview_staging"
db_username               = "postgres"

# ECS Configuration
ecs_task_cpu       = 512
ecs_task_memory    = 1024
ecs_desired_count  = 2
container_port     = 3000

# Custom domain (optional)
domain_name = ""

# Application Environment Variables
app_environment_variables = {
  NODE_ENV = "staging"
  PORT     = "3000"
}