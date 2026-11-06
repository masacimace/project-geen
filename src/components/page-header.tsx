export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 md:px-5">
      <h1 className="text-[17px] font-semibold tracking-[-0.025em] md:text-[20px]">{title}</h1>
      {description ? <p className="mt-1 text-[12px] text-muted-foreground md:text-[13px]">{description}</p> : null}
    </header>
  );
}
