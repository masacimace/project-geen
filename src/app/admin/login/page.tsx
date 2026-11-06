import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/server/admin/session";

export const metadata = { title: "Admin Login", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-[360px]">
        <Link href="/" className="text-[17px] font-semibold tracking-tight">GEEN</Link>
        <h1 className="mt-7 text-[18px] font-semibold md:text-[20px]">Admin sign in</h1>
        <p className="mt-1 text-[13px] leading-5 text-muted-foreground">Masuk menggunakan akun owner yang dibuat melalui bootstrap CLI.</p>
        <LoginForm />
      </div>
    </main>
  );
}
