# WordWise Deployment Guide

This guide provides comprehensive instructions for deploying the WordWise book review platform across different environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Database Setup](#database-setup)
- [Infrastructure as Code](#infrastructure-as-code)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Logging](#monitoring--logging)
- [Security Configuration](#security-configuration)
- [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

### System Requirements

- **Node.js**: v18 or higher
- **PostgreSQL**: v13 or higher
- **Docker**: v20 or higher (optional)
- **Git**: Latest version
- **SSL Certificate**: For production deployment

### Cloud Provider Accounts

- AWS Account (for production)
- GitHub Account (for CI/CD)
- Domain registrar (for custom domain)

### Required Tools

```bash
# Install required tools
npm install -g @aws-cli/cli
npm install -g terraform
npm install -g docker
```

## 🌍 Environment Setup

### Environment Variables

Create environment-specific configuration files:

#### Development (.env.development)
```env
# Backend
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/wordwise_dev
JWT_SECRET=dev-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret
OPENAI_API_KEY=your-openai-key
CORS_ORIGIN=http://localhost:3000

# Frontend
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=WordWise
VITE_ENABLE_DEBUG=true
```

#### Staging (.env.staging)
```env
# Backend
NODE_ENV=staging
PORT=3001
DATABASE_URL=postgresql://username:password@staging-db:5432/wordwise_staging
JWT_SECRET=staging-secret-key
JWT_REFRESH_SECRET=staging-refresh-secret
OPENAI_API_KEY=your-openai-key
CORS_ORIGIN=https://staging.wordwise.com

# Frontend
VITE_API_BASE_URL=https://api-staging.wordwise.com/api/v1
VITE_APP_NAME=WordWise Staging
VITE_ENABLE_DEBUG=false
```

#### Production (.env.production)
```env
# Backend
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@prod-db:5432/wordwise_prod
JWT_SECRET=production-secret-key
JWT_REFRESH_SECRET=production-refresh-secret
OPENAI_API_KEY=your-openai-key
CORS_ORIGIN=https://wordwise.com

# Frontend
VITE_API_BASE_URL=https://api.wordwise.com/api/v1
VITE_APP_NAME=WordWise
VITE_ENABLE_DEBUG=false
```

## 🚀 Backend Deployment

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3001
   
   CMD ["npm", "start"]
   ```

2. **Build and Run Container**
   ```bash
   # Build image
   docker build -t wordwise-backend .
   
   # Run container
   docker run -d \
     --name wordwise-backend \
     -p 3001:3001 \
     --env-file .env.production \
     wordwise-backend
   ```

### AWS ECS Deployment

1. **Create ECS Task Definition**
   ```json
   {
     "family": "wordwise-backend",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "wordwise-backend",
         "image": "your-account.dkr.ecr.region.amazonaws.com/wordwise-backend:latest",
         "portMappings": [
           {
             "containerPort": 3001,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "DATABASE_URL",
             "valueFrom": "arn:aws:secretsmanager:region:account:secret:wordwise/database-url"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/wordwise-backend",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

2. **Deploy to ECS**
   ```bash
   # Register task definition
   aws ecs register-task-definition --cli-input-json file://task-definition.json
   
   # Create service
   aws ecs create-service \
     --cluster wordwise-cluster \
     --service-name wordwise-backend \
     --task-definition wordwise-backend \
     --desired-count 2
   ```

### Manual Server Deployment

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone https://github.com/your-org/wordwise.git
   cd wordwise/backend
   
   # Install dependencies
   npm ci --production
   
   # Build application
   npm run build
   
   # Start with PM2
   pm2 start dist/server.js --name wordwise-backend
   pm2 save
   pm2 startup
   ```

## 🎨 Frontend Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Configure Environment Variables**
   ```bash
   vercel env add VITE_API_BASE_URL
   vercel env add VITE_APP_NAME
   ```

### AWS S3 + CloudFront Deployment

1. **Build Application**
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync dist/ s3://wordwise-frontend-bucket --delete
   ```

3. **Invalidate CloudFront**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DISTRIBUTION_ID \
     --paths "/*"
   ```

### Netlify Deployment

1. **Create netlify.toml**
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy to Netlify**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy
   netlify deploy --prod --dir=dist
   ```

## 🗄️ Database Setup

### PostgreSQL Setup

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   
   # Start service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Create Database and User**
   ```sql
   -- Connect to PostgreSQL
   sudo -u postgres psql
   
   -- Create database
   CREATE DATABASE wordwise_prod;
   
   -- Create user
   CREATE USER wordwise_user WITH PASSWORD 'secure_password';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE wordwise_prod TO wordwise_user;
   
   -- Connect to database
   \c wordwise_prod
   
   -- Grant schema privileges
   GRANT ALL ON SCHEMA public TO wordwise_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wordwise_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wordwise_user;
   ```

3. **Run Migrations**
   ```bash
   cd backend
   npm run db:migrate:prod
   npm run db:seed
   ```

### AWS RDS Setup

1. **Create RDS Instance**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier wordwise-prod \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --engine-version 13.7 \
     --master-username wordwise_admin \
     --master-user-password secure_password \
     --allocated-storage 20 \
     --vpc-security-group-ids sg-12345678 \
     --db-subnet-group-name wordwise-subnet-group
   ```

2. **Configure Security Group**
   ```bash
   # Allow inbound connections on port 5432
   aws ec2 authorize-security-group-ingress \
     --group-id sg-12345678 \
     --protocol tcp \
     --port 5432 \
     --cidr 0.0.0.0/0
   ```

## 🏗️ Infrastructure as Code

### Terraform Configuration

1. **Backend Infrastructure**
   ```hcl
   # main.tf
   provider "aws" {
     region = "us-east-1"
   }
   
   # VPC
   resource "aws_vpc" "wordwise_vpc" {
     cidr_block           = "10.0.0.0/16"
     enable_dns_hostnames = true
     enable_dns_support   = true
   
     tags = {
       Name = "wordwise-vpc"
     }
   }
   
   # Internet Gateway
   resource "aws_internet_gateway" "wordwise_igw" {
     vpc_id = aws_vpc.wordwise_vpc.id
   
     tags = {
       Name = "wordwise-igw"
     }
   }
   
   # Public Subnets
   resource "aws_subnet" "wordwise_public_subnet" {
     count             = 2
     vpc_id            = aws_vpc.wordwise_vpc.id
     cidr_block        = "10.0.${count.index + 1}.0/24"
     availability_zone = data.aws_availability_zones.available.names[count.index]
   
     map_public_ip_on_launch = true
   
     tags = {
       Name = "wordwise-public-subnet-${count.index + 1}"
     }
   }
   
   # ECS Cluster
   resource "aws_ecs_cluster" "wordwise_cluster" {
     name = "wordwise-cluster"
   
     setting {
       name  = "containerInsights"
       value = "enabled"
     }
   }
   
   # Application Load Balancer
   resource "aws_lb" "wordwise_alb" {
     name               = "wordwise-alb"
     internal           = false
     load_balancer_type = "application"
     security_groups    = [aws_security_group.wordwise_alb_sg.id]
     subnets            = aws_subnet.wordwise_public_subnet[*].id
   
     enable_deletion_protection = false
   }
   ```

2. **Deploy Infrastructure**
   ```bash
   cd infrastructure
   terraform init
   terraform plan
   terraform apply
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions

1. **Backend CI/CD**
   ```yaml
   # .github/workflows/backend.yml
   name: Backend CI/CD
   
   on:
     push:
       branches: [main, develop]
       paths: ['backend/**']
     pull_request:
       branches: [main]
       paths: ['backend/**']
   
   jobs:
     test:
       runs-on: ubuntu-latest
       
       services:
         postgres:
           image: postgres:13
           env:
             POSTGRES_PASSWORD: postgres
             POSTGRES_DB: wordwise_test
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5
       
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
             cache-dependency-path: backend/package-lock.json
         
         - name: Install dependencies
           run: |
             cd backend
             npm ci
         
         - name: Run tests
           run: |
             cd backend
             npm run test:coverage
           env:
             DATABASE_URL: postgresql://postgres:postgres@localhost:5432/wordwise_test
         
         - name: Upload coverage
           uses: codecov/codecov-action@v3
           with:
             file: backend/coverage/lcov.info
   
     deploy:
       needs: test
       runs-on: ubuntu-latest
       if: github.ref == 'refs/heads/main'
       
       steps:
         - uses: actions/checkout@v3
         
         - name: Configure AWS credentials
           uses: aws-actions/configure-aws-credentials@v2
           with:
             aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
             aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
             aws-region: us-east-1
         
         - name: Login to Amazon ECR
           id: login-ecr
           uses: aws-actions/amazon-ecr-login@v1
         
         - name: Build and push image
           env:
             ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
             ECR_REPOSITORY: wordwise-backend
             IMAGE_TAG: ${{ github.sha }}
           run: |
             docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG ./backend
             docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
         
         - name: Deploy to ECS
           run: |
             aws ecs update-service \
               --cluster wordwise-cluster \
               --service wordwise-backend \
               --force-new-deployment
   ```

2. **Frontend CI/CD**
   ```yaml
   # .github/workflows/frontend.yml
   name: Frontend CI/CD
   
   on:
     push:
       branches: [main, develop]
       paths: ['frontend/**']
     pull_request:
       branches: [main]
       paths: ['frontend/**']
   
   jobs:
     test:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
             cache-dependency-path: frontend/package-lock.json
         
         - name: Install dependencies
           run: |
             cd frontend
             npm ci
         
         - name: Run tests
           run: |
             cd frontend
             npm run test:all
         
         - name: Run accessibility tests
           run: |
             cd frontend
             npm run test:accessibility
   
     build:
       needs: test
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
             cache-dependency-path: frontend/package-lock.json
         
         - name: Install dependencies
           run: |
             cd frontend
             npm ci
         
         - name: Build application
           run: |
             cd frontend
             npm run build
           env:
             VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
         
         - name: Upload build artifacts
           uses: actions/upload-artifact@v3
           with:
             name: frontend-build
             path: frontend/dist
   
     deploy:
       needs: build
       runs-on: ubuntu-latest
       if: github.ref == 'refs/heads/main'
       
       steps:
         - uses: actions/checkout@v3
         
         - name: Download build artifacts
           uses: actions/download-artifact@v3
           with:
             name: frontend-build
             path: frontend/dist
         
         - name: Configure AWS credentials
           uses: aws-actions/configure-aws-credentials@v2
           with:
             aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
             aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
             aws-region: us-east-1
         
         - name: Deploy to S3
           run: |
             aws s3 sync frontend/dist/ s3://wordwise-frontend-bucket --delete
         
         - name: Invalidate CloudFront
           run: |
             aws cloudfront create-invalidation \
               --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
               --paths "/*"
   ```

## 📊 Monitoring & Logging

### Application Monitoring

1. **Health Checks**
   ```bash
   # Backend health check
   curl -f http://localhost:3001/health || exit 1
   
   # Frontend health check
   curl -f http://localhost:3000 || exit 1
   ```

2. **Logging Configuration**
   ```javascript
   // Backend logging
   const winston = require('winston');
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.errors({ stack: true }),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' }),
       new winston.transports.Console({
         format: winston.format.simple()
       })
     ]
   });
   ```

3. **AWS CloudWatch Integration**
   ```yaml
   # CloudWatch agent configuration
   {
     "logs": {
       "logs_collected": {
         "files": {
           "collect_list": [
             {
               "file_path": "/var/log/wordwise/application.log",
               "log_group_name": "/aws/ecs/wordwise-backend",
               "log_stream_name": "{instance_id}"
             }
           ]
         }
       }
     }
   }
   ```

### Performance Monitoring

1. **Application Performance Monitoring**
   ```javascript
   // New Relic configuration
   const newrelic = require('newrelic');
   
   // Custom metrics
   newrelic.recordMetric('Custom/Books/Searched', 1);
   newrelic.recordMetric('Custom/Reviews/Created', 1);
   ```

2. **Database Monitoring**
   ```sql
   -- PostgreSQL performance queries
   SELECT 
     schemaname,
     tablename,
     attname,
     n_distinct,
     correlation
   FROM pg_stats
   WHERE schemaname = 'public';
   ```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Let's Encrypt Certificate**
   ```bash
   # Install Certbot
   sudo apt install certbot
   
   # Obtain certificate
   sudo certbot certonly --standalone -d api.wordwise.com
   
   # Auto-renewal
   echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
   ```

2. **Nginx SSL Configuration**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name api.wordwise.com;
       
       ssl_certificate /etc/letsencrypt/live/api.wordwise.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.wordwise.com/privkey.pem;
       
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
       ssl_prefer_server_ciphers off;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Security Headers

1. **Helmet Configuration**
   ```javascript
   const helmet = require('helmet');
   
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         scriptSrc: ["'self'"],
         imgSrc: ["'self'", "data:", "https:"],
       },
     },
     hsts: {
       maxAge: 31536000,
       includeSubDomains: true,
       preload: true
     }
   }));
   ```

2. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP, please try again later.'
   });
   
   app.use('/api/', limiter);
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection
   psql -h localhost -U wordwise_user -d wordwise_prod
   
   # Check logs
   sudo tail -f /var/log/postgresql/postgresql-13-main.log
   ```

2. **Application Crashes**
   ```bash
   # Check PM2 status
   pm2 status
   
   # View logs
   pm2 logs wordwise-backend
   
   # Restart application
   pm2 restart wordwise-backend
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   free -h
   
   # Check Node.js memory
   node --max-old-space-size=4096 dist/server.js
   ```

### Performance Optimization

1. **Database Optimization**
   ```sql
   -- Create indexes
   CREATE INDEX idx_books_title ON books(title);
   CREATE INDEX idx_books_author ON books(author);
   CREATE INDEX idx_reviews_book_id ON reviews(book_id);
   CREATE INDEX idx_reviews_user_id ON reviews(user_id);
   
   -- Analyze tables
   ANALYZE books;
   ANALYZE reviews;
   ```

2. **Application Optimization**
   ```javascript
   // Enable compression
   const compression = require('compression');
   app.use(compression());
   
   // Enable caching
   const redis = require('redis');
   const client = redis.createClient();
   
   app.use('/api/books', cache(300)); // 5 minutes
   ```

### Backup and Recovery

1. **Database Backup**
   ```bash
   # Create backup
   pg_dump -h localhost -U wordwise_user wordwise_prod > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Restore backup
   psql -h localhost -U wordwise_user wordwise_prod < backup_20240101_120000.sql
   ```

2. **Application Backup**
   ```bash
   # Backup application files
   tar -czf wordwise_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/wordwise/
   
   # Backup environment files
   cp .env.production .env.production.backup
   ```

## 📞 Support

For deployment issues and support:

- **Documentation**: Check this guide and README files
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Email**: Contact dev@wordwise.com for urgent issues

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Check application logs
   - Monitor performance metrics
   - Review security alerts

2. **Monthly**
   - Update dependencies
   - Review and rotate secrets
   - Database maintenance

3. **Quarterly**
   - Security audit
   - Performance review
   - Disaster recovery testing

### Update Procedures

1. **Backend Updates**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Install dependencies
   npm ci --production
   
   # Run migrations
   npm run db:migrate:prod
   
   # Restart application
   pm2 restart wordwise-backend
   ```

2. **Frontend Updates**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Install dependencies
   npm ci
   
   # Build application
   npm run build
   
   # Deploy to CDN
   aws s3 sync dist/ s3://wordwise-frontend-bucket --delete
   aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
   ```
