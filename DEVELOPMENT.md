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
cp .env.example .env.local
```
*Note: The default values in `.env.example` work out-of-the-box with the local Docker setup.*

**⚠️ Important**: Generate a `NEXTAUTH_SECRET` for authentication:
```bash
# Generate a secret (works on Linux/Mac/WSL)
openssl rand -base64 32

# Or on Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Add the generated secret to your `.env.local` file:
```
NEXTAUTH_SECRET="your-generated-secret-here"
```

**Without this secret, login will fail with a 500 error!**

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
- PostgreSQL (Port 5433)
- Redis (Port 6380)
- Redis HTTP Proxy (Port 8079)

### 3. Setup Database Schema

Run the migrations to create tables:

```bash
yarn db:migrate
```

**⚠️ Windows Users**: 
- **✅ Recommended**: Use WSL2 - Prisma commands work perfectly! See [Migration Troubleshooting Guide](./MIGRATION_TROUBLESHOOTING.md).
- **If using Windows Native**: If `yarn db:migrate` fails with authentication errors, use `.\apply-migrations-via-docker.ps1`

**⚠️ WSL Users**: If you get esbuild platform errors, reinstall dependencies in WSL:
```bash
rm -rf node_modules
yarn install
```

Generate the Prisma client:

```bash
yarn prisma generate
```

(Optional) Populate the database with test data:

```bash
yarn db:seed
```

**⚠️ WSL Users**: If `yarn db:seed` fails with esbuild platform errors, ensure you've reinstalled `node_modules` in WSL (see above).

Create an event in the database (or view seeded data):

```bash
yarn db:studio
```

### 4. Start the App

```bash
yarn dev
```

The app will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## 📱 Accessing the App

Once the server is running (`yarn dev`), you can access the different parts of the application:

| Interface | URL | Description |
|-----------|-----|-------------|
| **Login Page** | `http://localhost:3000/api/auth/signin` | The default sign-in page for authentication (use `test@example.com` for dev). |
| **Attendee View** | `http://localhost:3000/[event-url]` | The public page where attendees view demos and vote. |
| **Admin Panel** | `http://localhost:3000/admin/[event-id]` | The dashboard for organizers to manage the event. |
| **Database Studio** | `http://localhost:5555` | A GUI to view and edit your local database directly. |

---

## 📖 User Guide: 1v1 Match Mode

The "Match Mode" allows you to run head-to-head battles between two startups. Here is the complete end-to-end workflow to test it locally.

### Step 1: Initial Setup (Database)

Since we are in a local environment, we need to manually set up the data first using **Prisma Studio**.

1.  **Open Prisma Studio**:
    ```bash
    yarn db:studio
    ```
2.  **Create an Event**:
    *   Go to the `Event` table.
    *   Create a new record.
    *   **Important**: Set `oneVsOneMode` to `true`.
    *   Note the `id` (e.g., `evt_123`) and `url` (e.g., `demo-night`).
3.  **Create Demos (Startups)**:
    *   Go to the `Demo` table.
    *   Create at least 2 demos linked to your `eventId`.
    *   Give them names like "Startup A" and "Startup B".
4.  **Create a Judge (Optional)**:
    *   Go to the `User` table.
    *   Find or create a user.
    *   Set `isJudge` to `true`.
    *   *Tip: Use a specific email like `judge@test.com` so you can login with it.*
5.  **Ensure Award Exists**:
    *   Go to the `Award` table.
    *   Make sure there is at least one award for your event. If not, create one named "Match Vote".

### Step 2: The Admin Experience (Running a Match)

1.  **Log In**:
    *   Go to `http://localhost:3000/api/auth/signin`.
    *   Sign in with `test@example.com` (or the user you created).
2.  Navigate to the Admin Panel: `http://localhost:3000/admin/[your-event-id]`
2.  Click on the **Match Mode** tab in the sidebar.
3.  **Create a Match**:
    *   Select "Startup A" and "Startup B" from the dropdowns.
    *   Choose a round type (e.g., "Round 1").
    *   Click **Create Match**.
4.  **Control the Match**:
    *   You will see the match card appear.
    *   Click **Start Match** to open voting.
    *   *The status will change to "Live" and attendees can now vote.*
    *   Watch the live vote counts update in real-time.
    *   Click **Close Voting** to end the match.
    *   The winner will be displayed with a 🏆 icon.

### Step 3: The Attendee Experience (Voting)

1.  Open a new browser window/tab (Incognito works best to test multiple users).
2.  Navigate to the Event Page: `http://localhost:3000/[your-event-url]`
3.  **Active Match**:
    *   If a match is "Live", a voting overlay or section will automatically appear.
    *   You will see the two startups facing off.
4.  **Voting**:
    *   Click on the startup you want to support.
    *   You will see a confirmation that your vote was recorded.
    *   *Note: You can only vote once per match.*

### Step 4: The Judge Experience (Weighted Voting)

1.  Log in as the user you marked as `isJudge = true`.
2.  Go to the Event Page.
3.  Vote in an active match.
4.  **Scoring Logic**:
    *   Your vote counts as a **Judge Vote**.
    *   The final score is calculated as: `(50% Audience Score) + (50% Judge Score)`.
    *   *Example*: If Startup A gets 100% of audience votes but 0% of judge votes, their final score is 50%.

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
