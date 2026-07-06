import { createClient } from "@supabase/supabase-js";

// Same Supabase project the backend verifies tokens against
// (auth/deps.py's get_current_user calls supabase.auth.get_user on the
// access_token this client hands out) -- frontend and backend must point
// at the same project or every request will 401.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in " +
      "frontend/.env (see .env.example once added in a later commit).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
