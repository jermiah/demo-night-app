# Development Guide

This guide covers how to set up the Demo Night App locally, run the development server, and work with key features like Match Mode.

## 🛠️ Prerequisites

- **Node.js** (v18+ recommended)
- **Yarn** (Package manager)
- **Docker Desktop** (Required for local database & Redis)

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```
*Note: The default values in `.env.example` work out-of-the-box with the local Docker setup.*

### 2. Start Database & Redis

Make sure Docker Desktop is running, then run:

```powershell
# Windows (PowerShell)
.\start-database.ps1
```

```bash
# Mac/Linux
bash start-database.sh
```

This starts:
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Redis HTTP Proxy (Port 8079)

### 3. Setup Database Schema

Run the migrations to create tables:

```bash
yarn db:migrate
```

Generate the Prisma client:

```bash
yarn prisma generate
```

### 4. Start the App

```bash
yarn dev
```

The app will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## 🎮 Testing Features (Match Mode)

The app includes a "Match Mode" for 1v1 startup battles. Here is how to test it locally.

### 1. Create Test Data
Open Prisma Studio to manage your local database:
```bash
yarn db:studio
```
(Opens at http://localhost:5555)

**Required Data:**
1.  **Users**: Create a user and set `isJudge = true` to test judge voting.
2.  **Event**: Create an event and set `oneVsOneMode = true`.
3.  **Demos**: Create at least 2 demos (startups) for that event.
4.  **Award**: Ensure an award exists (or create one named "Match Vote").

### 2. Admin Workflow
1.  Go to `http://localhost:3000/admin/[eventId]`.
2.  Navigate to the **Match Mode** tab.
3.  **Create Match**: Select two startups and a round type.
4.  **Start Match**: Click "Start" to open voting.
5.  **Close Voting**: Click "Close" to see the weighted results.

### 3. Attendee Workflow
1.  Go to the event page `http://localhost:3000/[eventUrl]`.
2.  If a match is active, the voting interface will appear automatically.
3.  Vote for a startup.
    *   **Regular User**: Counts as Audience vote (50% weight).
    *   **Judge User**: Counts as Judge vote (50% weight).

---

## 🆘 Troubleshooting

### "Cannot reach database server"
- Ensure Docker Desktop is running.
- Check containers: `docker ps`.
- If needed, restart: `.\start-database.ps1`.

### Migration Fails
- Try pushing the schema directly for dev: `yarn db:push`.

### TypeScript Errors
- If you change the schema, always run: `yarn prisma generate`.
