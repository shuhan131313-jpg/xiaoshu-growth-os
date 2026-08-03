import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
}: {
  value?: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
