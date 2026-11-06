import { Search } from "lucide-react";

export const metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center px-6 text-center">
      <Search size={22} strokeWidth={1.7} className="mb-4 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-[16px] font-semibold">Explore belum tersedia</h2>
      <p className="mt-2 max-w-[330px] text-[14px] leading-6 text-muted-foreground">
        Pencarian post, sumber, dan agent akan aktif setelah social domain selesai.
      </p>
    </div>
  );
}
