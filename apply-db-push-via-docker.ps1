# ============================================================================
# Database Push Workaround Script for Windows
# ============================================================================
# 
# This script applies Prisma schema changes via Docker to work around a known
# issue where Prisma CLI cannot authenticate to PostgreSQL on Windows.
#
# Usage:
#   .\apply-db-push-via-docker.ps1
#
# Prerequisites:
#   - Docker containers must be running (run .\start-database.ps1 first)
#   - Prisma schema file must exist at prisma/schema.prisma
#
# What it does:
#   1. Runs `prisma db push` via a temporary Node.js container on the Docker network
#   2. Generates the Prisma Client on Windows
#
# Note: This syncs your schema directly to the database without migrations.
# Use this for development. For production, use migrations instead.
#
# For more details, see MIGRATION_TROUBLESHOOTING.md
# ============================================================================

Write-Host "Applying Prisma schema via Docker (db push)..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker container is running
$containerRunning = docker ps --filter "name=demo_night_app-demo-night-app-postgres-1" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "Error: PostgreSQL container is not running!" -ForegroundColor Red
    Write-Host "Please run: .\start-database.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if schema file exists
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "Error: prisma\schema.prisma not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Running 'prisma db push' via temporary Node container..." -ForegroundColor Yellow
Write-Host ""

# Use a temporary Node.js container on the same Docker network to run Prisma
# Use node:18 (not alpine) to avoid OpenSSL issues
# Mount the prisma directory so it can access schema.prisma
$pushResult = docker run --rm `
  --network demo_night_app_default `
  -v "${PWD}\prisma:/app/prisma" `
  -w /app `
  -e DATABASE_URL="postgresql://postgres@demo_night_app-demo-night-app-postgres-1:5432/demo-night-app?schema=public" `
  node:18 sh -c "npx -y prisma@5.14.0 db push --schema=prisma/schema.prisma --skip-generate 2>&1"

$pushExitCode = $LASTEXITCODE

# Output the result
Write-Host $pushResult

if ($pushExitCode -ne 0) {
    Write-Host ""
    Write-Host "Error: Failed to push schema to database" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    exit 1
}

# If we get here, push was successful
Write-Host ""
Write-Host "Step 2: Generating Prisma Client on Windows..." -ForegroundColor Yellow
yarn prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success! Database schema has been synced." -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run: yarn dev" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Warning: Schema was pushed but Prisma Client generation failed." -ForegroundColor Yellow
    Write-Host "Try running: yarn prisma generate" -ForegroundColor Yellow
}

