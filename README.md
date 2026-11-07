# PulseX – accounting task dashboard

A personal productivity web app for accountants: a visual to-do dashboard, a Friday weekly-report
generator, and browser reminders. No backend, no login – everything is stored in your browser's
`localStorage`, with JSON export/import for backups. Installable as a PWA.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173).

Production build and preview:

```bash
npm run build
npm run preview
```

## Install as a desktop app (Chrome / Edge)

1. Run `npm run build` then `npm run preview` (or deploy the `dist` folder to any static host over HTTPS).
2. Open the URL in Chrome or Edge.
3. Click the **install icon** at the right end of the address bar (a monitor with a down-arrow), or open
   the browser menu → **Install PulseX…** (Edge: **Apps → Install this site as an app**).
4. PulseX opens in its own window. Pin it to the taskbar / dock like any other app.

The install prompt only appears on `localhost` or HTTPS, which is what `npm run preview` and any
static host give you. (`npm run dev` also works for installation on localhost.)

## Accounts and multi-device sync (Supabase)

PulseX works fully offline on one device. Add Supabase and every person gets their own account, with
tasks, categories, settings and reports stored in your own database and synced live across devices.

1. Create a project at https://supabase.com (free tier is enough).
2. In the Supabase dashboard open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`,
   and click **Run**. This creates the tables, row-level security (each user only sees their own rows),
   and realtime.
3. **Authentication → Providers**: make sure **Email** is enabled. Optional: enable **Google** for the
   "Continue with Google" button.
4. **Authentication → URL Configuration**: set **Site URL** to your app URL (for example
   `https://pulsex.vercel.app`) and add `https://pulsex.vercel.app/welcome` and
   `http://localhost:5173/welcome` to **Redirect URLs**.
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
6. Provide them to the build:
   - Locally: copy `.env.example` to `.env.local` and fill in the two values.
   - Vercel: **Project → Settings → Environment Variables**, add `VITE_SUPABASE_URL` and
     `VITE_SUPABASE_ANON_KEY`, then **Redeploy**.

How sync works: the app stays offline-first. Changes save to the device immediately and are pushed to
Supabase in the background; edits made on another device arrive live through realtime. The first time
you sign in, any tasks already on the device are uploaded to your account. Signing out clears the device
copy; your data stays in the cloud.

## Features

- **Onboarding** – a short welcome flow: account (optional), profile, reminders, sample data.

- **Tasks** – quick-add bar (Enter adds; shortcuts `!high` / `#Compliance` / `@fri`), full form with notes,
  category, priority, due date & time, status, time spent, per-task reminder lead time, recurrence
  (daily / weekly / monthly) and a "blocked" flag. Views: Today, This week, Kanban (drag and drop), Calendar.
- **Dashboard** – today's progress ring, streak and productivity score, completed-vs-pending bar chart,
  category donut, "up next" cards, stat cards, and a Friday banner for the weekly report.
- **Weekly report** – compiles Monday–Friday into a professional message (accomplishments by area, in
  progress, pending/blocked, next week's plan, sign-off). Edit, copy, open in email (`mailto:`), download
  as PDF, and keep a history.
- **Notifications** – due-soon reminders, overdue alerts, a morning summary and a Friday reminder, delivered
  through the service worker. In-app bell lists recent alerts. Limitations are explained in Settings.
- **Settings** – profile, manager, working days/hours, notification times and toggles, theme, categories with
  colours, export/import backup, sample data loader.

## Tech

React 18 · Vite 5 · TypeScript · Tailwind CSS · Recharts · lucide-react · zustand (persist) · date-fns ·
@dnd-kit · jsPDF · vite-plugin-pwa (custom service worker in `src/sw.ts`).
