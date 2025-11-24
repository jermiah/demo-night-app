# Deployment Guide

This guide outlines how to deploy the Demo Night App to production, specifically targeting Vercel.

## 🚀 Vercel Deployment

The easiest way to deploy this application is using [Vercel](https://vercel.com).

### 1. Prerequisites
- A Vercel account.
- A cloud PostgreSQL database (e.g., Neon, Supabase, or Vercel Postgres).
- A cloud Redis instance (e.g., Upstash).

### 2. Environment Variables
Configure the following environment variables in your Vercel project settings:

**Database (Prisma):**
- `DATABASE_URL`: Connection string to your production database (Pooling enabled).
- `DATABASE_URL_NON_POOLING`: Connection string to your production database (Direct connection).

**Redis (Upstash/KV):**
- `KV_REST_API_URL`: URL for your Redis instance.
- `KV_REST_API_TOKEN`: Auth token for your Redis instance.

**NextAuth (Authentication):**
- `NEXTAUTH_URL`: Your production URL (e.g., `https://my-app.vercel.app`).
- `NEXTAUTH_SECRET`: A random string (generate with `openssl rand -base64 32`).
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.

### 3. Deploy
Connect your GitHub repository to Vercel. Vercel will automatically detect the Next.js app and build it.

**Build Command:**
The default build command is sufficient. It will automatically:
1.  Run `prisma migrate deploy` to apply database changes.
2.  Generate the Prisma Client.
3.  Build the Next.js application.

```bash
# Default Build Command
prisma migrate deploy && prisma generate && next build
```

---

## 📦 Production Database Management

### Migrations
Migrations are applied automatically during deployment. If you need to run them manually or troubleshoot:

```bash
# Run migrations against production DB (requires .env.production or env vars set)
yarn db:migrate:deploy
```

### Admin & Judges
In production, you will need to manually set up your initial admin or judge users since there is no admin registration page.

**Option 1: SQL Query**
Connect to your production database and run:
```sql
-- Make a user a judge
UPDATE "User" SET "isJudge" = true WHERE email = 'judge@example.com';
```

**Option 2: Prisma Studio**
You can connect Prisma Studio to your production database locally:
1.  Update your local `.env` to point to the production `DATABASE_URL`.
2.  Run `yarn db:studio`.
3.  Edit records via the GUI.
