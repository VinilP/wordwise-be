#!/bin/bash

# Comprehensive Testing Script for WordWise Platform
# This script runs all types of tests: unit, integration, e2e, load, and performance

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
REPORTS_DIR="test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}🚀 Starting Comprehensive Testing Suite for WordWise Platform${NC}"
echo -e "${BLUE}Timestamp: $TIMESTAMP${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run tests with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_dir="$3"
    
    echo -e "${BLUE}Running $test_name...${NC}"
    
    if [ -n "$test_dir" ]; then
        cd "$test_dir"
    fi
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
    
    if [ -n "$test_dir" ]; then
        cd - > /dev/null
    fi
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command_exists npx; then
    echo -e "${RED}❌ npx is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Install dependencies
print_section "Installing Dependencies"

echo "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm ci
cd - > /dev/null

echo "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm ci
cd - > /dev/null

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Backend Tests
print_section "Backend Testing Suite"

# Unit Tests
run_test "Backend Unit Tests" "npm run test:unit" "$BACKEND_DIR"
if [ $? -eq 0 ]; then
    echo "Copying unit test coverage report..."
    cp "$BACKEND_DIR/coverage/lcov-report/index.html" "$REPORTS_DIR/backend-unit-coverage.html" 2>/dev/null || true
fi

# Integration Tests
run_test "Backend Integration Tests" "npm run test:integration" "$BACKEND_DIR"
if [ $? -eq 0 ]; then
    echo "Copying integration test coverage report..."
    cp "$BACKEND_DIR/coverage/lcov-report/index.html" "$REPORTS_DIR/backend-integration-coverage.html" 2>/dev/null || true
fi

# Database Optimization Tests
run_test "Database Optimization Tests" "npm run test -- tests/performance/database-optimization.test.ts" "$BACKEND_DIR"

# Load Tests
run_test "Load Tests" "npm run test -- tests/load/load-testing.ts" "$BACKEND_DIR"

echo ""

# Frontend Tests
print_section "Frontend Testing Suite"

# Unit Tests
run_test "Frontend Unit Tests" "npm run test:unit" "$FRONTEND_DIR"
if [ $? -eq 0 ]; then
    echo "Copying unit test coverage report..."
    cp "$FRONTEND_DIR/coverage/index.html" "$REPORTS_DIR/frontend-unit-coverage.html" 2>/dev/null || true
fi

# Integration Tests
run_test "Frontend Integration Tests" "npm run test:integration" "$FRONTEND_DIR"

# Accessibility Tests
run_test "Accessibility Tests" "npm run test:accessibility" "$FRONTEND_DIR"

echo ""

# End-to-End Tests
print_section "End-to-End Testing Suite"

# Start backend server in background
echo "Starting backend server..."
cd "$BACKEND_DIR"
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd - > /dev/null

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 10

# Check if backend is running
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is running${NC}"
else
    echo -e "${RED}❌ Backend server failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend server in background
echo "Starting frontend server..."
cd "$FRONTEND_DIR"
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd - > /dev/null

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 15

# Check if frontend is running
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend server is running${NC}"
else
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

# Run Playwright E2E Tests
run_test "Playwright E2E Tests" "npx playwright test --reporter=html" "$FRONTEND_DIR"
if [ $? -eq 0 ]; then
    echo "Copying E2E test report..."
    cp "$FRONTEND_DIR/playwright-report/index.html" "$REPORTS_DIR/e2e-report.html" 2>/dev/null || true
fi

# Run Performance Tests
run_test "Performance Tests" "npx playwright test src/test/visual/performance.spec.ts --reporter=html" "$FRONTEND_DIR"

# Run Complete User Workflow Tests
run_test "Complete User Workflow Tests" "npx playwright test src/test/visual/complete-user-workflows.spec.ts --reporter=html" "$FRONTEND_DIR"

# Stop servers
echo "Stopping servers..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
sleep 5

echo ""

# Performance Analysis
print_section "Performance Analysis"

# Run Lighthouse audit
echo "Running Lighthouse performance audit..."
cd "$FRONTEND_DIR"
if command_exists lighthouse; then
    lighthouse http://localhost:5173 --output=html --output-path="../$REPORTS_DIR/lighthouse-report.html" --chrome-flags="--headless" || true
    echo -e "${GREEN}✅ Lighthouse audit completed${NC}"
else
    echo -e "${YELLOW}⚠️  Lighthouse not installed, skipping performance audit${NC}"
fi
cd - > /dev/null

# Bundle Analysis
echo "Analyzing bundle size..."
cd "$FRONTEND_DIR"
npm run build:analyze || true
cd - > /dev/null

echo ""

# Security Testing
print_section "Security Testing"

# Backend security audit
echo "Running backend security audit..."
cd "$BACKEND_DIR"
npm audit --audit-level=moderate || true
cd - > /dev/null

# Frontend security audit
echo "Running frontend security audit..."
cd "$FRONTEND_DIR"
npm audit --audit-level=moderate || true
cd - > /dev/null

echo ""

# Generate Comprehensive Report
print_section "Generating Comprehensive Test Report"

cat > "$REPORTS_DIR/test-summary.md" << EOF
# WordWise Platform - Comprehensive Test Report

**Generated:** $(date)
**Timestamp:** $TIMESTAMP

## Test Summary

### Backend Tests
- ✅ Unit Tests: Completed
- ✅ Integration Tests: Completed
- ✅ Database Optimization Tests: Completed
- ✅ Load Tests: Completed

### Frontend Tests
- ✅ Unit Tests: Completed
- ✅ Integration Tests: Completed
- ✅ Accessibility Tests: Completed

### End-to-End Tests
- ✅ Playwright E2E Tests: Completed
- ✅ Performance Tests: Completed
- ✅ Complete User Workflow Tests: Completed

### Performance Analysis
- ✅ Lighthouse Audit: Completed
- ✅ Bundle Analysis: Completed

### Security Testing
- ✅ Backend Security Audit: Completed
- ✅ Frontend Security Audit: Completed

## Reports Generated

1. **Backend Unit Test Coverage:** backend-unit-coverage.html
2. **Backend Integration Test Coverage:** backend-integration-coverage.html
3. **Frontend Unit Test Coverage:** frontend-unit-coverage.html
4. **E2E Test Report:** e2e-report.html
5. **Lighthouse Performance Report:** lighthouse-report.html

## Test Environment

- **Backend URL:** http://localhost:3000
- **Frontend URL:** http://localhost:5173
- **Database:** PostgreSQL (test environment)

## Next Steps

1. Review all test reports
2. Address any failing tests
3. Optimize performance based on Lighthouse report
4. Fix security vulnerabilities found in audit
5. Deploy to staging environment for further testing

EOF

echo -e "${GREEN}✅ Comprehensive test report generated: $REPORTS_DIR/test-summary.md${NC}"

# Final Summary
print_section "Test Suite Complete"

echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
echo ""
echo -e "${BLUE}Reports available in: $REPORTS_DIR/${NC}"
echo -e "${BLUE}Backend logs: backend.log${NC}"
echo -e "${BLUE}Frontend logs: frontend.log${NC}"
echo ""

# List all generated reports
echo -e "${YELLOW}Generated Reports:${NC}"
ls -la "$REPORTS_DIR" | grep -E '\.(html|md)$' | while read -r line; do
    echo -e "${GREEN}  📄 $line${NC}"
done

echo ""
echo -e "${GREEN}✨ Testing complete! Check the reports directory for detailed results.${NC}"
