#!/usr/bin/env node
/**
 * Pushes the BuildPilot OTP confirm-signup template to the hosted Supabase project.
 *
 * Prerequisites:
 * 1. Create a personal access token: https://supabase.com/dashboard/account/tokens
 * 2. Run:
 *
 *    SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/push-confirm-signup-template.mjs
 *
 * Optional:
 *    SUPABASE_PROJECT_REF=ctokouyzvwkeuihzjemu
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() || "ctokouyzvwkeuihzjemu";

if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN.\nCreate one at https://supabase.com/dashboard/account/tokens",
  );
  process.exit(1);
}

const bodyPath = join(
  __dirname,
  "..",
  "supabase",
  "templates",
  "confirm-signup.body.html",
);
const content = readFileSync(bodyPath, "utf8");

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mailer_subjects_confirmation: "Your BuildPilot verification code",
      mailer_templates_confirmation_content: content,
    }),
  },
);

if (!response.ok) {
  const text = await response.text();
  console.error(`Failed (${response.status}): ${text}`);
  process.exit(1);
}

console.log(
  "Updated Confirm signup template to use {{ .Token }} (6-digit OTP).",
);
console.log(
  "Also set OTP expiry to 300 seconds in Authentication → Providers → Email.",
);
console.log("Then sign up with a new email to receive the OTP code.");
