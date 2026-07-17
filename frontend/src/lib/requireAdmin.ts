import { createClient } from "./supabase/server";
import { redirect } from "next/navigation";

/**
 * Server-side guard to enforce database admin authorization in Next.js Server Components.
 * If the user is unauthenticated, redirects to `/login`.
 * If they are not an active admin, redirects to `/dashboard`.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    redirect("/login");
  }

  let { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, status')
    .eq('id', session.user.id)
    .single();

  // Robust fallback: if status column doesn't exist yet, query role only
  if (error && (error.message?.includes("status") || error.message?.includes("column"))) {
    const { data: retryProfile, error: retryError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (!retryError && retryProfile) {
      profile = { role: retryProfile.role, status: 'active' } as any;
      error = null as any;
    }
  }

  if (error || !profile || profile.role !== 'admin' || profile.status === 'banned') {
    console.log("\n--- [ADMIN PROTECTION SHIELD] ---");
    console.log(`User attempting access: ${session.user.email}`);
    console.log(`User ID: ${session.user.id}`);
    if (error) console.log(`Database Error: ${JSON.stringify(error.message || error)}`);
    if (profile) {
      console.log(`Database profile role is currently: '${profile.role}' (needs to be 'admin')`);
      console.log(`Database profile status is: '${profile.status}' (needs to be 'active')`);
    } else {
      console.log("No profile row found in 'user_profiles' table for this user ID.");
    }
    console.log("Redirecting to /dashboard...\n");
    redirect("/dashboard");
  }
  
  return { session, profile };
}
