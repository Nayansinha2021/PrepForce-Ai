import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (input, init) => {
          try {
            return await window.fetch(input, init);
          } catch (err) {
            console.warn("Supabase browser fetch failed (network offline/paused):", err);
            return new Response(
              JSON.stringify({
                error: {
                  message: "Supabase connection failed. The database might be paused or offline.",
                  details: String(err),
                },
              }),
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }
      }
    }
  );
}
