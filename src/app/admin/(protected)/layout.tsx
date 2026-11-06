import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
