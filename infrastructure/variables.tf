# Project configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "book-review-platform"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# VPC configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# Database configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "bookreview"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

# ECS configuration
variable "ecs_task_cpu" {
  description = "CPU units for ECS task"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Memory for ECS task"
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "container_port" {
  description = "Port on which the container listens"
  type        = number
  default     = 3000
}

# SSL Certificate
variable "domain_name" {
  description = "Domain name for SSL certificate (optional)"
  type        = string
  default     = ""
}

# Application configuration
variable "app_environment_variables" {
  description = "Environment variables for the application"
  type        = map(string)
  default = {
    NODE_ENV = "production"
    PORT     = "3000"
  }
}