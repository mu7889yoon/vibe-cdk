#!/bin/bash

# Chaos Engineering UI Build and Deploy Script
set -e

echo "🚀 Starting Chaos Engineering UI Build and Deploy..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${YELLOW}📁 Project root: $PROJECT_ROOT${NC}"

# Step 1: Deploy CDK Infrastructure
echo -e "${YELLOW}🏗️  Step 1: Deploying CDK Infrastructure...${NC}"
cd "$PROJECT_ROOT/cdk"

# Install CDK dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing CDK dependencies..."
    npm install
fi

# Deploy CDK stack
echo "🚀 Deploying CDK stack..."
npm run cdk -- deploy --outputs-file ../outputs.json --require-approval never

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CDK deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CDK deployment completed!${NC}"

# Step 2: Extract API Gateway URL from outputs
echo -e "${YELLOW}🔍 Step 2: Extracting API Gateway URL...${NC}"
cd "$PROJECT_ROOT"

if [ ! -f "outputs.json" ]; then
    echo -e "${RED}❌ outputs.json not found!${NC}"
    exit 1
fi

# Extract API Gateway URL
API_GATEWAY_URL=$(cat outputs.json | jq -r '.Chaos100Stack.ApiGatewayUrl // empty')

if [ -z "$API_GATEWAY_URL" ]; then
    echo -e "${RED}❌ Could not extract API Gateway URL from outputs!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ API Gateway URL: $API_GATEWAY_URL${NC}"

# Step 3: Build Frontend
echo -e "${YELLOW}🏗️  Step 3: Building Frontend...${NC}"
cd "$PROJECT_ROOT/src/frontend"

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Create .env file with API Gateway URL
echo "🔧 Creating .env file..."
cat > .env << EOF
VITE_API_URL=$API_GATEWAY_URL
VITE_ENV=production
EOF

# Build frontend
echo "🏗️  Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build completed!${NC}"

# Step 4: Deploy Frontend to S3
echo -e "${YELLOW}📤 Step 4: Deploying Frontend to S3...${NC}"
cd "$PROJECT_ROOT"

# Extract S3 bucket name and CloudFront distribution ID
S3_BUCKET=$(cat outputs.json | jq -r '.Chaos100Stack.FrontendBucketName // empty')
CLOUDFRONT_DIST_ID=$(cat outputs.json | jq -r '.Chaos100Stack.CloudFrontDistributionId // empty')

if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}❌ Could not extract S3 bucket name from outputs!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ S3 Bucket: $S3_BUCKET${NC}"
echo -e "${GREEN}✅ CloudFront Distribution ID: $CLOUDFRONT_DIST_ID${NC}"

# Upload files to S3
echo "📤 Uploading files to S3..."
aws s3 sync src/frontend/dist s3://$S3_BUCKET --delete

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ S3 upload failed!${NC}"
    exit 1
fi

# Invalidate CloudFront cache
if [ ! -z "$CLOUDFRONT_DIST_ID" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*"
fi

echo -e "${GREEN}✅ Frontend deployment completed!${NC}"

# Step 5: Display final URLs
echo -e "${YELLOW}🎉 Deployment Summary:${NC}"
WEBSITE_URL=$(cat outputs.json | jq -r '.Chaos100Stack.WebsiteUrl // empty')

echo -e "${GREEN}🌐 Website URL: $WEBSITE_URL${NC}"
echo -e "${GREEN}🔗 API Gateway URL: $API_GATEWAY_URL${NC}"
echo -e "${GREEN}📦 S3 Bucket: $S3_BUCKET${NC}"

echo -e "${GREEN}🎉 All done! Visit your Chaos Engineering UI at: $WEBSITE_URL${NC}" 