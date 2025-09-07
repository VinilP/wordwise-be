# WordWise Backend Project

A comprehensive REST API for the WordWise book review platform built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

## 📁 Project Structure

```
backend-project/
├── src/                    # Source code
│   ├── controllers/        # Route controllers
│   ├── services/          # Business logic
│   ├── repositories/      # Data access layer
│   ├── middleware/        # Custom middleware
│   ├── routes/           # API routes
│   ├── models/           # Data models
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript types
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── prisma/               # Database schema and migrations
├── infrastructure/       # Terraform infrastructure code
├── .kiro/               # Kiro specs and documentation
│   └── specs/           # Requirements, design, tasks
├── chats/               # Development chat history
├── scripts/             # Utility scripts
└── docs/                # API documentation
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage   # Run with coverage

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier
```

## 🏗️ Infrastructure

The `infrastructure/` directory contains Terraform configurations for AWS deployment:

- **ECS/Fargate**: Containerized application deployment
- **RDS PostgreSQL**: Managed database service
- **Application Load Balancer**: Load balancing and SSL termination
- **CloudWatch**: Logging and monitoring
- **S3**: Static asset storage

## 📊 API Documentation

- **OpenAPI Spec**: `docs/api.yaml`
- **Interactive Docs**: Available at `/docs` when server is running
- **Postman Collection**: Available in `docs/` directory

## 🧪 Testing

Comprehensive testing suite including:

- **Unit Tests**: Individual function and class testing
- **Integration Tests**: API endpoint and database testing
- **Load Tests**: Performance and scalability testing
- **Security Tests**: Authentication and authorization testing

## 📋 Requirements & Design

See `.kiro/specs/` for detailed:

- **Requirements**: Functional and non-functional requirements
- **Design**: Architecture and technical design
- **Tasks**: Implementation tasks and progress
- **Setup Guide**: Detailed setup instructions

## 🔄 CI/CD

GitHub Actions workflows in `.github/workflows/`:

- **CI/CD Pipeline**: Automated testing and deployment
- **Security Scanning**: Dependency and code security checks
- **Infrastructure Validation**: Terraform plan validation
- **Health Monitoring**: Production health checks

## 📈 Monitoring

Built-in monitoring and observability:

- **Health Checks**: `/health` endpoint
- **Metrics Collection**: Application and business metrics
- **Performance Monitoring**: Response times and throughput
- **Error Tracking**: Comprehensive error logging

## 🤝 Contributing

1. Review the requirements in `.kiro/specs/`
2. Follow the development workflow in `DEVELOPER_ONBOARDING.md`
3. Run tests before submitting PRs
4. Update documentation as needed

## 📚 Documentation

- **[Setup Guide](.kiro/specs/SETUP.md)** - Detailed setup instructions
- **[API README](README.md)** - API-specific documentation
- **[Testing Guide](TESTING_GUIDE.md)** - Testing procedures
- **[Deployment Guide](DEPLOYMENT.md)** - Deployment instructions
- **[Developer Guide](DEVELOPER_ONBOARDING.md)** - Development workflow

## 🆘 Support

- Check the chat history in `chats/` for implementation details
- Review test reports for debugging information
- Use the monitoring dashboard for production issues
- Create issues with detailed error information

---

**Tech Stack**: Node.js, Express, TypeScript, PostgreSQL, Prisma, Jest, Docker, AWS, Terraform