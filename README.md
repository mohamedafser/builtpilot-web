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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=BuildPilot <you@gmail.com>
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only (never prefix with `NEXT_PUBLIC_`). It is required for OTP email verification and owner organization setup after signup.

Signup verification and password-reset codes are sent by **BuildPilot SMTP OTP** (not Supabase Auth emails). Quotation emails also use Gmail SMTP so you can send from your Gmail address without verifying a domain.

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
19. later migrations under `supabase/migrations/` (email OTPs, owner organization setup, etc.)

Alternatively, if you use the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

The migrations create:

- `profiles`, `businesses`, `business_members`, `business_invitations`, `projects`
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
- email OTP storage (`email_otps`) for signup and password-reset verification
- a private `site-photos` Storage bucket with membership-scoped policies
- membership-based Row Level Security
- signup creates a profile only; the organization/business and **owner** membership are created after OTP verification

### 5. Configure Auth redirect URLs

In **Authentication → URL Configuration** set both local and production values.

**Production (required for live signup emails):**

- Site URL: `https://builtpilot-web.vercel.app`
- Redirect URLs:
  - `https://builtpilot-web.vercel.app/api/auth/callback`
  - `https://builtpilot-web.vercel.app/api/auth/callback?next=/reset-password`
  - `http://localhost:3000/api/auth/callback`
  - `http://localhost:3000/api/auth/callback?next=/reset-password`

Also set this Vercel Production environment variable:

```bash
NEXT_PUBLIC_APP_URL=https://builtpilot-web.vercel.app
```

If Site URL stays on localhost, confirmation emails keep redirecting to localhost even when the app is deployed.

For local-only development, you can temporarily use Site URL `http://localhost:3000`, or disable **Confirm email** under **Authentication → Providers → Email**.

Password reset uses SMTP OTP at `/forgot-password` → `/verify-reset` → `/reset-password` (same 6-digit flow as signup).

### Signup email verification (SMTP OTP)

Signup and password-reset verification codes are sent by BuildPilot via your configured SMTP
(`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`) — not by Supabase Auth emails.

1. Apply the migrations:

```bash
npx supabase db push
```

Or run these in the SQL editor (in order):

- `supabase/migrations/20260316110000_email_otps.sql`
- `supabase/migrations/20260316120000_email_otp_purpose.sql`
- `supabase/migrations/20260316130000_owner_organization_setup.sql`

2. Ensure `.env.local` has:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=BuildPilot <you@gmail.com>
```

3. Keep **Confirm email** enabled in Supabase so unverified users cannot sign in
   until OTP verification marks `email_confirm` true.

Users verify at `/verify-email` with the 6-digit code from the SMTP email.

### Owner account creation and organization setup

BuildPilot uses `businesses` / `business_members` as the organization model.

#### Signup flow

The signup form collects:

- Full name
- Email
- Password
- Company / organization name
- Country and language (for locale/currency)

There is **no role selector**. Users cannot choose `owner` on the frontend.

After successful OTP verification:

```text
User
  ↓
Create organization (business)
  ↓
Create membership
  ↓
Assign OWNER role (server-side only)
  ↓
Redirect to Dashboard
```

#### Owner creation rules

- The first verified user who creates the organization becomes **Owner**.
- The owner role is assigned only by the server (`setup_owner_business` RPC).
- Frontend requests cannot set `role: "owner"`.
- Normal invitations cannot assign Owner.
- Users cannot promote themselves to Owner.

#### Roles

```text
owner
  ↓
admin
  ↓
project_manager
  ↓
engineer
  ↓
site_supervisor
  ↓
worker
```

Legacy `member` remains for older records. Display labels use title case (for example `Owner`, not `OWNER`).

#### Team invitations

Owners and admins can invite users from **Settings → Team management**.

Invite roles shown in the UI:

- Admin
- Project Manager
- Engineer
- Site Supervisor
- Worker

Owner is never shown in the invite dropdown. The API and database also reject Owner assignment through invitations.

Invitation emails are sent through the same SMTP configuration as signup OTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`). The email includes a **Create account** link that prefills the invited email and decrypts the organization name from an encrypted `org` query token. Invitations expire in **2 days**. Owners and admins can **resend** or **cancel** pending invitations from Settings → Team.

If another account is already signed in when opening an invite link, BuildPilot prompts to **sign out and continue** so the invited user can create their account instead of redirecting to the current user's dashboard.

Invited users join the organization when they sign up / verify (or sign in, if they already have an account) with the invited email.

#### Permissions

Authorization uses permission checks such as:

```ts
hasPermission(role, "organization.users.manage")
```

Owner automatically satisfies all permissions. Subscription/plan feature checks stay separate from role permissions.

#### Header display

After setup, the dashboard header shows:

```text
Organization: ABC Constructions · Role: Owner
```

#### Manual migration step

Apply:

```bash
npx supabase db push
```

Or run `supabase/migrations/20260316130000_owner_organization_setup.sql` in the SQL editor.

This migration:

- extends organization roles
- creates `business_invitations`
- updates signup so only a profile is created on auth user insert
- creates the organization + owner membership after OTP verification
- blocks Owner role assignment through normal membership inserts/updates

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

- Email/password signup, login, logout, and SMTP OTP password reset
- Protected `/dashboard`, `/ai`, `/projects`, `/quotations`, `/workers`, `/settings`, and `/account` routes
- Owner organization setup after email verification (server-assigned Owner role)
- Team invitations and role management for owners/admins
- Project list, search, status filters, details, edit, and archive
- Daily site reports with manpower, materials, and private site photos
- Workers, project assignments, daily attendance, and labour summaries
- Materials, vendors, stock transactions, and project cost tracking
- Quotations, estimate vs actual comparison, convert-to-project, and client email on send
- BuildPilot AI, a construction-aware assistant grounded in authorized project data
- WhatsApp Business messaging (manual client updates, portal sharing) and in-app notifications
- PWA install support (desktop and mobile)
- Dashboard totals, recent projects, project cost overview, and latest site reports from live Supabase data

## What is intentionally not included

Payments, payroll, full accounting, email/SMS marketing, automation engines, ownership-transfer UI, and subscription billing.
