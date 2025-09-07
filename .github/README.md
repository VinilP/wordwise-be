# Frontend CI/CD Pipeline

This directory contains GitHub Actions workflows for the WordWise frontend application, providing automated testing, building, and deployment capabilities.

## 🚀 Workflows Overview

### 1. Frontend CI/CD Pipeline (`frontend-ci-cd.yml`)
**Main deployment workflow** that runs on pushes to `main` and `develop` branches.

**Stages:**
- **Lint & Format Check**: ESLint, Prettier, TypeScript type checking
- **Test Suite**: Unit tests, integration tests, accessibility tests with coverage
- **Visual Regression Tests**: Playwright visual testing
- **Build Validation**: Production build with optimization
- **Security Audit**: npm audit and dependency checks
- **Deploy to Staging**: Automatic deployment to staging environment
- **Deploy to Production**: Automatic deployment to production environment
- **Health Check**: Post-deployment health verification

### 2. Frontend PR Validation (`frontend-pr-validation.yml`)
**Pull request validation** that runs on all PRs to `main` and `develop` branches.

**Features:**
- Quick validation pipeline
- Build size reporting
- Automatic PR comments with build status

### 3. Frontend Performance Monitoring (`frontend-performance.yml`)
**Performance and accessibility auditing** that runs on code changes.

**Features:**
- Bundle size analysis
- Lighthouse CI performance testing
- Accessibility auditing with axe-core
- Performance budget enforcement

### 4. Frontend Security Scan (`frontend-security.yml`)
**Comprehensive security scanning** that runs daily and on code changes.

**Features:**
- npm audit for vulnerability scanning
- Snyk security analysis
- CodeQL static analysis
- Secret detection with TruffleHog
- License compliance checking

### 5. Frontend Dependency Update (`frontend-dependency-update.yml`)
**Automated dependency updates** that runs weekly.

**Features:**
- Automatic npm dependency updates
- Security fix application
- Automated PR creation for updates

## 🔧 Configuration Files

### Vite Configuration (`frontend/vite.config.ts`)
Production-optimized build configuration with:
- Code splitting and chunk optimization
- Terser minification with console removal
- Asset optimization
- Cache-friendly file naming

### Security Configuration (`frontend/.audit-ci.json`)
Audit configuration for dependency vulnerability checking.

### Lighthouse Configuration (`frontend/.lighthouserc.json`)
Performance and accessibility testing configuration with:
- Performance budgets
- Accessibility thresholds
- SEO requirements

## 🚀 Deployment

### Staging Deployment
- **Trigger**: Push to `develop` branch
- **Environment**: `staging`
- **URL**: Configured via `STAGING_DOMAIN` secret

### Production Deployment
- **Trigger**: Push to `main` branch
- **Environment**: `production`
- **URL**: Configured via `PRODUCTION_DOMAIN` secret

### Manual Deployment
Use the workflow dispatch feature to manually trigger deployments:
```bash
# Via GitHub CLI
gh workflow run frontend-ci-cd.yml -f environment=staging
gh workflow run frontend-ci-cd.yml -f environment=production
```

## 🔐 Required Secrets

Configure the following secrets in your GitHub repository:

### AWS Configuration
- `AWS_ACCESS_KEY_ID`: AWS access key for S3 and CloudFront
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `STAGING_S3_BUCKET`: S3 bucket name for staging
- `PRODUCTION_S3_BUCKET`: S3 bucket name for production
- `STAGING_CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID for staging
- `PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID for production
- `STAGING_DOMAIN`: Staging domain name
- `PRODUCTION_DOMAIN`: Production domain name

### Optional Secrets
- `SNYK_TOKEN`: Snyk API token for security scanning
- `SLACK_WEBHOOK_URL`: Slack webhook for deployment notifications

## 📊 Monitoring and Alerts

### Build Status
- All workflows include comprehensive status reporting
- Failed builds prevent deployment
- Health checks verify successful deployments

### Performance Monitoring
- Bundle size tracking
- Lighthouse performance scores
- Accessibility compliance monitoring

### Security Monitoring
- Vulnerability scanning
- License compliance checking
- Secret detection

## 🛠️ Local Development

### Running Tests
```bash
cd frontend

# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:accessibility
npm run test:visual

# Run with coverage
npm run test:coverage
```

### Building for Production
```bash
cd frontend

# Build with production optimizations
npm run build

# Preview production build
npm run preview
```

### Manual Deployment
```bash
cd frontend

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check linting errors: `npm run lint`
   - Verify TypeScript types: `npm run type-check`
   - Run tests locally: `npm run test:all`

2. **Deployment Failures**
   - Verify AWS credentials and permissions
   - Check S3 bucket configuration
   - Ensure CloudFront distribution is active

3. **Performance Issues**
   - Review bundle size analysis
   - Check Lighthouse reports
   - Optimize large assets

### Debug Mode
Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository settings.

## 📈 Metrics and Reporting

### Coverage Reports
- Unit test coverage uploaded to Codecov
- Coverage thresholds enforced (80% minimum)

### Performance Reports
- Lighthouse CI reports available in workflow artifacts
- Bundle size analysis in build logs

### Security Reports
- Vulnerability reports in workflow artifacts
- License compliance reports available

## 🔄 Maintenance

### Weekly Tasks
- Review dependency update PRs
- Check security scan results
- Monitor performance metrics

### Monthly Tasks
- Review and update performance budgets
- Audit security configurations
- Update workflow dependencies

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vite Configuration Guide](https://vitejs.dev/config/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Playwright Testing](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
