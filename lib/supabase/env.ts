export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }

  return { url, anonKey };
}

export function getSupabaseSqlEditorUrl() {
  try {
    const { url } = getSupabasePublicEnv();
    const projectRef = new URL(url).hostname.split(".")[0];

    if (!projectRef) {
      return "https://supabase.com/dashboard";
    }

    return `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
  } catch {
    return "https://supabase.com/dashboard";
  }
}
