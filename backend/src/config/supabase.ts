import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client for the backend
// This will require the Service Role key for backend operations

const supabaseUrl = process.env.SUPABASE_URL || "https://your-supabase-url.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "your-supabase-service-role-key";

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const verifyJWT = async (token: string) => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    throw new Error(error.message);
  }
  return data.user;
};
