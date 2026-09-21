import type { ReactNode } from "react";

export function PageHeader({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-7 border-b border-line pb-5">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">{title}</h1>
      {desc && <p className="mt-1.5 text-sm leading-6 text-ink-soft">{desc}</p>}
      {children}
    </header>
  );
}
