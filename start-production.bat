@echo off
SETLOCAL

echo ======================================
echo   Lorrigo Production Deployment
echo ======================================

:: Set environment to production
SET NODE_ENV=production

:: Check if pnpm is installed
where pnpm >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo pnpm is not installed. Please install it first.
    exit /b 1
)

:: Check if PM2 is installed
where pm2 >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo PM2 is not installed. Installing PM2...
    call npm install -g pm2
)

echo Installing dependencies...
call pnpm install --frozen-lockfile

echo Building all packages...
call pnpm build

:: Create logs directory if it doesn't exist
if not exist logs mkdir logs

:: Stop any existing processes
echo Stopping any existing services...
call pm2 delete all >nul 2>&1

echo Starting all services...

:: Start all services using consolidated ecosystem config
call pm2 start ecosystem.config.cjs --env production

:: Save PM2 configuration for auto-restart
call pm2 save

echo ======================================
echo   All services started successfully
echo ======================================
echo To view logs: pm2 logs
echo To monitor: pm2 monit
echo To stop all: pm2 delete all
echo ======================================

:: Display all running services
call pm2 list

ENDLOCAL 