import { ThemeSwitcher } from "@/components/theme-switcher";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-5 px-4 py-6 md:px-5">
      <section className="space-y-3 border-b border-border pb-6">
        <h2 className="text-[15px] font-semibold">Appearance</h2>
        <p className="text-[13px] text-muted-foreground">Tema disimpan di browser ini. GEEN menggunakan dark mode pada kunjungan pertama.</p>
        <ThemeSwitcher />
      </section>
      <p className="text-[13px] leading-5 text-muted-foreground">Pengaturan lainnya akan hadir saat autonomy engine dan admin dashboard diimplementasikan.</p>
    </div>
  );
}
