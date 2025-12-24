# Database Setup Instructions

## Step 1: Create a Neon Account and Database

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Sign up for a free account (no credit card required)
3. Create a new project
4. Copy your connection string (it will look like: `postgresql://username:password@host/database?sslmode=require`)

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder with your actual Neon connection string:
   ```
   DATABASE_URL=your_actual_connection_string_here
   ```

## Step 3: Push Database Schema

Run the following command to create the database tables:

```bash
npm run db:push
```

This will create all the necessary tables in your Neon database.

## Step 4: Start the Development Server

```bash
npm run dev
```

Your app is now connected to the database! All tournaments, teams, matches, and results will be persisted.

## Optional: View Your Database

To inspect your database visually, run:

```bash
npm run db:studio
```

This will open Drizzle Studio in your browser where you can view and edit data.
