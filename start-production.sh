#!/bin/bash

# Start Production Services Script for Lorrigo Application
# This script builds and starts all services for production environment
# and ensures Redis Docker container is running

# Set environment to production
export NODE_ENV=production

# Fail on any error
set -e

echo "======================================"
echo "  Lorrigo Production Deployment"
echo "======================================"

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "🐳 Docker found, checking Redis container..."

    # Check if Redis container is running
    if [ "$(docker ps -q -f name=lorrigo-v2-redis)" ]; then
        echo "✅ Redis container 'lorrigo-v2-redis' is already running."
    else
        # Check if Redis container exists but stopped
        if [ "$(docker ps -aq -f status=exited -f name=lorrigo-v2-redis)" ]; then
            echo "⚠️ Redis container exists but stopped. Starting container..."
            docker start lorrigo-v2-redis
        else
            echo "🚀 Starting Redis container..."
            docker run -d \
              --name lorrigo-v2-redis \
              -v lorrigo-redis-data:/data \
              -p 6379:6379 \
              redis:latest
        fi
    fi
else
    echo "❌ Docker is not installed. Please install Docker to run Redis."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Building all packages..."
pnpm build

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Stop any existing processes
echo "🛑 Stopping any existing services..."
pm2 delete all 2>/dev/null || true

# Start all services using consolidated ecosystem config
echo "🚀 Starting all services..."
pm2 start ecosystem.config.cjs --env production

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
