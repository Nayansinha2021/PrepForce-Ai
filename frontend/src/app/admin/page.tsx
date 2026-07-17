import { requireAdmin } from "@/lib/requireAdmin";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminPage() {
  // Enforce server-side security checks: redirects standard users to /dashboard
  const { session } = await requireAdmin();

  return <AdminDashboardClient sessionToken={session.access_token} />;
}
