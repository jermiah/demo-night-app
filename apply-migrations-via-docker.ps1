# ============================================================================
# Migration Workaround Script for Windows
# ============================================================================
# 
# This script applies Prisma migrations via Docker to work around a known
# issue where Prisma CLI cannot authenticate to PostgreSQL on Windows.
#
# Usage:
#   .\apply-migrations-via-docker.ps1
#
# Prerequisites:
#   - Docker containers must be running (run .\start-database.ps1 first)
#   - Migration files must exist in prisma/migrations/
#
# What it does:
#   1. Finds all migration SQL files in prisma/migrations/
#   2. Applies each migration directly to PostgreSQL via Docker exec
#   3. Generates the Prisma Client
#
# For more details, see MIGRATION_TROUBLESHOOTING.md
# ============================================================================

Write-Host "Applying Prisma migrations via Docker..." -ForegroundColor Cyan

# Get migration files
$migrations = Get-ChildItem -Path "prisma\migrations" -Directory | Sort-Object Name

foreach ($migration in $migrations) {
    $migrationFile = Join-Path $migration.FullName "migration.sql"
    if (Test-Path $migrationFile) {
        Write-Host "Applying: $($migration.Name)" -ForegroundColor Yellow
        Get-Content $migrationFile | docker exec -i demo_night_app-demo-night-app-postgres-1 psql -U postgres -d demo-night-app
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Applied: $($migration.Name)" -ForegroundColor Green
        } else {
            Write-Host "Failed: $($migration.Name)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Migrations complete! Generating Prisma Client..." -ForegroundColor Cyan
yarn prisma generate

Write-Host ""
Write-Host "Done! You can now run: yarn dev" -ForegroundColor Green
