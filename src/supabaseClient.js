import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SB URL", supabaseUrl);
console.log("SB ANON", (supabaseAnonKey || "").slice(0, 12));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

supabase.auth.getSession().then(({ data, error }) => {
  console.log("SESSION", data);
  console.log("SESSION ERROR", error);
});
