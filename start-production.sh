#!/bin/bash

# Start Production Services Script for Lorrigo Application
# This script builds and starts all services for production environment

# Set environment to production
export NODE_ENV=production

# Fail on any error
set -e

echo "======================================"
echo "  Lorrigo Production Deployment"
echo "======================================"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Please install it first."
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Building all packages..."
pnpm build

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to start a service
start_service() {
    local service=$1
    local log_file="logs/${service}.log"
    
    echo "🚀 Starting $service service..."
    cd "apps/$service"
    
    if [ -f "ecosystem.config.js" ]; then
        # Use PM2 if ecosystem file exists
        pm2 start ecosystem.config.js --env production
    else
        # Use PM2 with default configuration
        pm2 start npm --name "$service" -- start
    fi
    
    cd ../..
    echo "✅ $service service started and logging to $log_file"
}

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Stop any existing processes
echo "🛑 Stopping any existing services..."
pm2 delete all 2>/dev/null || true

# Start services in order
echo "🚀 Starting all services..."

# Start API first
start_service "api"

# Start other services
start_service "notifications"
start_service "workers"
start_service "web"

# Save PM2 configuration for auto-restart
pm2 save

echo "======================================"
echo "  All services started successfully"
echo "======================================"
echo "To view logs: pm2 logs"
echo "To monitor: pm2 monit"
echo "To stop all: pm2 delete all"
echo "======================================"

# Display all running services
pm2 list 