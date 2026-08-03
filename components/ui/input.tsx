import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-faint focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
