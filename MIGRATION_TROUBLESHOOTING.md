# Migration Troubleshooting Guide

## Quick Reference

**Problem**: Prisma CLI commands (`yarn db:migrate`, `yarn db:push`) fail on Windows with authentication errors.

### ✅ Option 1: Use WSL2 (Recommended - Confirmed Working!)

**This is the best solution!** WSL2 bypasses Windows networking issues entirely.

```bash
# In WSL terminal
cd /mnt/c/Users/prajw/demo_night_app

# IMPORTANT: First time in WSL, reinstall dependencies for Linux binaries
rm -rf node_modules
yarn install

# Now everything works perfectly!
yarn db:migrate  # ✅ Works perfectly!
yarn db:push     # ✅ Works perfectly!
yarn db:seed     # ✅ Works perfectly!
yarn dev         # ✅ App runs perfectly!
```

**Why it works**: WSL2 runs Linux, which doesn't have the Windows-specific networking/authentication issues that prevent Prisma CLI from connecting to PostgreSQL in Docker.

**Note**: If you see esbuild platform errors (`@esbuild/win32-x64` vs `@esbuild/linux-x64`), you need to reinstall `node_modules` in WSL (see above).

### Option 2: Docker Workaround Scripts (Windows Native - Use if WSL2 Not Available)

**Quick Fix for Migrations**:
```powershell
.\start-database.ps1
.\apply-migrations-via-docker.ps1
```

**Quick Fix for Schema Push (Development)**:
```powershell
.\start-database.ps1
.\apply-db-push-via-docker.ps1
```

**That's it!** The scripts will apply changes and generate the Prisma Client.

---

## Problem: Prisma CLI Commands Fail on Windows

If you encounter authentication errors when running Prisma CLI commands (`yarn db:migrate`, `yarn db:push`, etc.) on Windows, you're not alone. This is a known issue where Prisma CLI cannot authenticate to PostgreSQL running in Docker, even with correct credentials configured.

### Affected Commands

- `yarn db:migrate` - Applies database migrations
- `yarn db:push` - Syncs schema directly to database
- `yarn db:studio` - May also fail (but app runtime usually works fine)

### Error Message

```
Error: P1000: Authentication failed against database server at `127.0.0.1`,
the provided database credentials for `postgres` are not valid.
```

### Why This Happens

This appears to be a Windows-specific networking/authentication issue between Prisma CLI and PostgreSQL in Docker. The database works fine from inside the container, but Prisma CLI on Windows cannot establish the connection.

## Solution: Use Docker Workaround Scripts

We've created workaround scripts that run Prisma commands via Docker, bypassing the Windows connection issue.

### Quick Start

1. **Ensure Docker containers are running:**
   ```powershell
   .\start-database.ps1
   ```

2. **For migrations (recommended for production):**
   ```powershell
   .\apply-migrations-via-docker.ps1
   ```

3. **For schema sync (development only):**
   ```powershell
   .\apply-db-push-via-docker.ps1
   ```

### Migration Script (`apply-migrations-via-docker.ps1`)

This script:
- Finds all migration files in `prisma/migrations/`
- Applies each migration SQL file directly to PostgreSQL via Docker
- Generates the Prisma Client
- Reports success/failure for each migration

**Use this for:** Production deployments, version-controlled schema changes

### Database Push Script (`apply-db-push-via-docker.ps1`)

This script:
- Copies your `prisma/schema.prisma` to the Docker container
- Runs `prisma db push` inside the container where connection works
- Generates the Prisma Client on Windows
- Syncs schema changes directly to the database

**Use this for:** Quick development iterations, prototyping

**⚠️ Warning:** `db:push` syncs schema directly without migrations. Use migrations for production!

## Alternative: Manual Migration Application

If you prefer to apply migrations manually or the script doesn't work:

### Step 1: List Available Migrations

```powershell
Get-ChildItem -Path "prisma\migrations" -Directory | Sort-Object Name
```

### Step 2: Apply Each Migration

For each migration folder, apply the SQL file:

```powershell
# Replace <migration-name> with the actual migration folder name
Get-Content "prisma\migrations\<migration-name>\migration.sql" | `
  docker exec -i demo_night_app-demo-night-app-postgres-1 psql -U postgres -d demo-night-app
```

### Step 3: Generate Prisma Client

After applying migrations:

```powershell
yarn prisma generate
```

## Verifying Migrations Were Applied

Check that tables exist:

```powershell
docker exec demo_night_app-demo-night-app-postgres-1 psql -U postgres -d demo-night-app -c "\dt"
```

You should see all your Prisma models as tables (e.g., `User`, `Event`, `Demo`, etc.).

## Creating New Migrations

When you need to create a new migration:

### Option 1: Use Prisma Studio (Recommended)

1. Make your schema changes in `prisma/schema.prisma`
2. Use Prisma Studio to inspect the database:
   ```powershell
   yarn db:studio
   ```
3. Manually create the migration SQL file based on your changes

### Option 2: Create Migration on Linux/Mac/WSL

If you have access to WSL or a Linux/Mac environment:

```bash
yarn db:migrate:create
# Then copy the migration file back to Windows
```

### Option 3: Use `db:push` (Development Only)

For development, you can use `db:push` which syncs schema without migrations. However, `yarn db:push` will likely fail with the same authentication issue on Windows.

**Use the Docker workaround script instead:**

```powershell
.\apply-db-push-via-docker.ps1
```

This script:
- Copies your `prisma/schema.prisma` to the Docker container
- Runs `prisma db push` inside the container where connection works
- Generates the Prisma Client on Windows
- Syncs your schema changes directly to the database

**⚠️ Warning:** `db:push` is for development only. Always use migrations in production.

## Troubleshooting

### Script Fails with "Container Not Found"

Ensure Docker containers are running:

```powershell
docker compose ps
```

If containers aren't running, start them:

```powershell
.\start-database.ps1
```

### Migration Already Applied Error

If you see errors about migrations already being applied, check the `_prisma_migrations` table:

```powershell
docker exec demo_night_app-demo-night-app-postgres-1 psql -U postgres -d demo-night-app -c "SELECT migration_name FROM _prisma_migrations ORDER BY started_at;"
```

### Database Connection Works But Migrations Fail

If your app connects fine but migrations fail, this confirms it's a Prisma CLI issue. The workaround script should resolve this.

### App Runtime Also Fails (Windows Native)

If you see authentication errors when running `yarn dev` on Windows (not just CLI commands), this means Prisma Client also can't connect. 

**Solutions:**
1. **Use WSL2** - Run the entire app in WSL2 where connections work
2. **Check PostgreSQL authentication** - Ensure `pg_hba.conf` allows connections (see "Why This Workaround Works" section)
3. **Verify Docker networking** - Ensure containers are on the same network

### WSL: esbuild Platform Mismatch Error

If you get errors like:
```
You installed esbuild for another platform than the one you're currently using.
Specifically the "@esbuild/win32-x64" package is present but this platform
needs the "@esbuild/linux-x64" package instead.
```

This happens because `node_modules` was installed on Windows but you're running in WSL.

**Fix:**
```bash
# In WSL terminal
cd /mnt/c/Users/prajw/demo_night_app
rm -rf node_modules
yarn install
```

This reinstalls all dependencies with Linux binaries, which WSL needs.

### Need to Reset Database

If you need to start fresh:

```powershell
# Stop and remove containers and volumes
docker compose down -v

# Restart containers
docker compose up -d

# Wait for PostgreSQL to initialize (5-10 seconds)
Start-Sleep -Seconds 5

# Apply migrations
.\apply-migrations-via-docker.ps1
```

## Why This Workaround Works

The workaround works because:
- **Inside Docker**: PostgreSQL accepts connections without authentication issues
- **Direct SQL**: We bypass Prisma CLI's connection logic
- **Same Result**: Migrations are applied correctly, just via a different path

## ✅ Recommended Solution: Use WSL2

**Confirmed Working!** Prisma commands work perfectly in WSL2. Since WSL2 runs a Linux environment, it bypasses the Windows networking issues that cause Prisma CLI authentication failures.

### Setting Up WSL2

1. **Install WSL2** (if not already installed):
   ```powershell
   wsl --install
   ```
   Or update existing WSL:
   ```powershell
   wsl --update
   ```

2. **Install Docker Desktop with WSL2 Integration**:
   - Open Docker Desktop Settings
   - Go to "Resources" → "WSL Integration"
   - Enable integration for your WSL distro (usually Ubuntu)
   - Apply & Restart

3. **Open WSL Terminal**:
   ```powershell
   wsl
   ```
   Or use your WSL distro directly (e.g., Ubuntu from Start menu)

4. **Navigate to Project in WSL**:
   ```bash
   # Your Windows C: drive is mounted at /mnt/c
   cd /mnt/c/Users/prajw/demo_night_app
   ```

5. **Install Dependencies** (if needed):
   ```bash
   # Install Node.js (if not already installed)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install Yarn
   npm install -g yarn
   ```

6. **Reinstall node_modules for Linux** (IMPORTANT):
   ```bash
   # If node_modules was installed on Windows, you need Linux binaries
   rm -rf node_modules
   yarn install
   ```
   This ensures native binaries (like esbuild) match the Linux platform WSL uses.

7. **Run Prisma Commands Normally**:
   ```bash
   # These should work in WSL!
   yarn db:migrate
   yarn db:push
   yarn db:seed
   yarn db:studio
   yarn dev  # App also runs perfectly!
   ```

### WSL2 Advantages

- ✅ Prisma CLI works without workarounds
- ✅ Native Linux environment (better compatibility)
- ✅ Can use standard Prisma commands
- ✅ Better performance for Node.js/npm operations
- ✅ Easier development workflow

### WSL2 Considerations

- Docker containers must be accessible from WSL2 (usually automatic with Docker Desktop WSL integration)
- File paths are different (`/mnt/c/...` instead of `C:\...`)
- Some Windows-specific tools won't work in WSL
- Need to ensure Docker Desktop WSL integration is enabled

### ✅ Confirmed Working

This has been tested and confirmed to work! You can use WSL2 for all Prisma operations:

```bash
# In WSL terminal
cd /mnt/c/Users/prajw/demo_night_app
yarn db:migrate  # ✅ Works!
yarn db:push     # ✅ Works!
yarn db:studio   # ✅ Should also work!
```

**No workaround scripts needed when using WSL2!**

## Other Future Solutions

If WSL2 isn't an option, other potential fixes:
1. Try different PostgreSQL authentication methods (md5, password)
2. Check Windows firewall/antivirus settings
3. Update Prisma to latest version (may have fixes)
4. Use a different database connection library temporarily

## Related Files

- `apply-migrations-via-docker.ps1` - Migration workaround script
- `apply-db-push-via-docker.ps1` - Database push workaround script
- `docker-compose.yml` - Docker configuration
- `.env.local` - Database connection settings
- `prisma/schema.prisma` - Database schema definition
- `prisma/migrations/` - Migration SQL files

## Getting Help

If you encounter issues not covered here:
1. Check that Docker Desktop is running
2. Verify PostgreSQL container is healthy: `docker logs demo_night_app-demo-night-app-postgres-1`
3. Ensure `.env.local` has correct `DATABASE_URL`
4. Try restarting Docker containers: `docker compose restart`

---

**Last Updated**: December 2024  
**Tested On**: Windows 10/11 with Docker Desktop

