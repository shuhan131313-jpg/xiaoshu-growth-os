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
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-primary">{title}</h1>
      {desc && <p className="mt-1 text-sm text-ink-soft">{desc}</p>}
      {children}
    </header>
  );
}
