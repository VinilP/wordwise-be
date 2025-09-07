-- Initialize database for development
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases for testing
CREATE DATABASE bookreview_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE bookreview_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE bookreview_test TO postgres;

-- Create extensions if needed
\c bookreview_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c bookreview_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";