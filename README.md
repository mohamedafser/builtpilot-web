# BuildPilot

Construction management for civil engineers and small contractors.

This repository contains the production-ready foundation: Next.js App Router, Supabase Auth, a multi-tenant PostgreSQL schema, and project tracking.

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + PostgreSQL)
- React Hook Form
- Zod
- ESLint
- Prettier

## Local setup

### 1. Install dependencies

```bash
cd buildpilot
npm install
```

### 2. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a project.
2. Wait until the database is ready.
3. Open **Project Settings → API**.
4. Copy the project URL and the `anon` `public` key.

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=BuildPilot <you@gmail.com>
```

Use only the public anon key in this app. Do not put the `service_role` key in `.env.local` or any client-side code.

Signup and password-reset emails are sent by **Supabase Auth** automatically. Quotation emails cannot use that mailer, so they go through **Gmail SMTP** instead. That lets you send from your Gmail address to any client without verifying a domain.

1. Turn on 2-Step Verification for the Gmail account.
2. Create an [App Password](https://myaccount.google.com/apppasswords).
3. Put that 16-character password in `SMTP_PASS` (not your normal Gmail password).
4. Restart `npm run dev`.

BuildPilot AI is optional for local use of the rest of the app. To enable it, add a server-only provider key:

```bash
AI_PROVIDER_API_KEY=your-ai-provider-api-key
AI_MODEL=gpt-4o-mini
AI_PROVIDER_BASE_URL=https://api.openai.com/v1
```

Do not prefix these with `NEXT_PUBLIC_`. If they are missing, quantitative answers still use BuildPilot data, and general construction answers ask you to configure the provider.

### 4. Run the database migrations

In the Supabase dashboard, open **SQL Editor** and run these files in order:

1. `supabase/migrations/20240912100000_init.sql`
2. `supabase/migrations/20240912120000_project_management.sql`
3. `supabase/migrations/20240912140000_daily_site_diary.sql`
4. `supabase/migrations/20240912160000_labour_management.sql`
5. `supabase/migrations/20240912180000_materials_vendors.sql`
6. `supabase/migrations/20240913100000_project_vendors.sql`
7. `supabase/migrations/20240913120000_material_usage_vendors.sql`
8. `supabase/migrations/20240913140000_material_default_vendor.sql`
9. `supabase/migrations/20240913160000_project_expenses.sql`
10. `supabase/migrations/20240913180000_quotations.sql`
11. `supabase/migrations/20240913182000_quotation_item_workers.sql`
12. `supabase/migrations/20240913200000_boq_measurements.sql`
13. `supabase/migrations/20240913220000_client_portal.sql`
14. `supabase/migrations/20240913230000_client_portal_public_rls.sql`
15. `supabase/migrations/20240913231000_client_portal_resolve_last_accessed.sql`
16. `supabase/migrations/20240914000000_ai_assistant.sql`
17. `supabase/migrations/20240914120000_whatsapp_notifications.sql`
18. `supabase/migrations/20240914140000_locale_currency.sql`

Alternatively, if you use the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

The migrations create:

- `profiles`, `businesses`, `business_members`, `projects`
- extra project fields (`client_phone`, `client_email`, `description`, `archived_at`)
- daily site reports, manpower snapshots, material snapshots, and site photo metadata
- workers, project assignments, daily attendance, and labour cost records
- materials, vendors, project materials, vendor project assignments, and material stock transactions
- project expenses, private expense receipts, and project cost aggregations
- quotations, quotation items (including catalog materials and workers), and per-business quotation numbering
- project BOQs, sections, items, measurement history, and progress totals
- client portal access tokens, visibility settings, and read-only portal RPCs
- AI conversations, messages, and usage tracking
- WhatsApp message logs, webhook event idempotency, in-app notifications, and notification preferences
- a private `site-photos` Storage bucket with membership-scoped policies
- membership-based Row Level Security
- a trigger that creates a profile, a default business, and an owner membership when a user signs up

### 5. Configure Auth redirect URLs

In **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/api/auth/callback`
  - `http://localhost:3000/api/auth/callback?next=/reset-password`

For local development, you can disable **Confirm email** under **Authentication → Providers → Email**. If confirmation stays enabled, new users will receive an email before they can sign in.

Password reset emails use the same callback route and then send the user to `/reset-password`.

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run typecheck
npm test
```

## What this foundation includes

- Email/password signup, login, logout, and password reset
- Protected `/dashboard`, `/ai`, `/projects`, `/quotations`, `/workers`, `/settings`, and `/account` routes
- Automatic profile, business, and owner membership creation on signup
- Project list, search, status filters, details, edit, and archive
- Daily site reports with manpower, materials, and private site photos
- Workers, project assignments, daily attendance, and labour summaries
- Materials, vendors, stock transactions, and project cost tracking
- Quotations, estimate vs actual comparison, convert-to-project, and client email on send
- BuildPilot AI, a construction-aware assistant grounded in authorized project data
- WhatsApp Business messaging (manual client updates, portal sharing) and in-app notifications
- Dashboard totals, recent projects, project cost overview, and latest site reports from live Supabase data

## What is intentionally not included

Payments, payroll, full accounting, email/SMS marketing, automation engines, and subscription billing.
