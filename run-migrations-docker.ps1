# Run Prisma migrations using Docker exec
# This works around Windows connection issues

Write-Host "Running Prisma migrations via Docker..." -ForegroundColor Cyan

# Copy schema to container
docker cp prisma/schema.prisma demo_night_app-demo-night-app-postgres-1:/tmp/schema.prisma

# Run migrations inside container
docker exec demo_night_app-demo-night-app-postgres-1 bash -c "cd /tmp && npx prisma migrate dev --skip-generate"

Write-Host "Migrations complete!" -ForegroundColor Green

