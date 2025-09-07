# Development Environment Configuration
project_name = "book-review-platform"
environment  = "dev"
aws_region   = "us-east-1"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# Database Configuration (smaller for dev)
db_instance_class         = "db.t3.micro"
db_allocated_storage      = 20
db_max_allocated_storage  = 50
db_name                   = "bookreview_dev"
db_username               = "postgres"

# ECS Configuration (smaller for dev)
ecs_task_cpu       = 256
ecs_task_memory    = 512
ecs_desired_count  = 1
container_port     = 3000

# No custom domain for dev
domain_name = ""

# Application Environment Variables
app_environment_variables = {
  NODE_ENV = "development"
  PORT     = "3000"
}