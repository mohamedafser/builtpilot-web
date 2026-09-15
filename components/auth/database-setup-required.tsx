import { LogoutButton } from "@/components/auth/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseSqlEditorUrl } from "@/lib/supabase/env";

export function DatabaseSetupRequired() {
  const sqlEditorUrl = getSupabaseSqlEditorUrl();

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Finish database setup</CardTitle>
          <p className="mt-1 text-sm text-stone-500">
            Your account is signed in, but this Supabase project does not have
            the BuildPilot tables yet.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-600">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open the{" "}
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-amber-700 hover:underline"
              >
                Supabase SQL editor
              </a>
              .
            </li>
            <li>
              Paste and run{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-800">
                supabase/migrations/20240912100000_init.sql
              </code>
              .
            </li>
            <li>
              Then paste and run{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-800">
                supabase/migrations/20240912120000_project_management.sql
              </code>
              .
            </li>
            <li>Refresh this page.</li>
          </ol>
          <p>
            That creates <code>profiles</code>, <code>businesses</code>,{" "}
            <code>business_members</code>, and <code>projects</code>, then
            backfills a workspace for users who already signed up.
          </p>
          <LogoutButton fullWidth={false} />
        </CardContent>
      </Card>
    </div>
  );
}
