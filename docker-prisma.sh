#!/bin/bash
# Run Prisma commands inside Docker where connection works
docker exec -i demo_night_app-demo-night-app-postgres-1 psql -U postgres -d demo-night-app < /dev/stdin

