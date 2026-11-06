import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-foreground">
      <h1 className="text-[20px] font-semibold">Page not found</h1>
      <Link href="/" className="text-[14px] underline underline-offset-4">Back to Home</Link>
    </main>
  );
}
