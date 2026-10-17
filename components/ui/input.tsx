import * as React from "react";
import { cn } from "@/lib/utils";
import { shouldSubmitOnEnter } from "@/lib/input-submit";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onEnterSubmit?: () => void | Promise<void>;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, onEnterSubmit, onKeyDown, ...props }, ref) => (
    <input
      ref={ref}
      data-keyboard-aware="true"
      className={cn(
        "h-11 w-full scroll-m-5 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10",
        className
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          onEnterSubmit &&
          shouldSubmitOnEnter({
            key: event.key,
            isComposing: event.nativeEvent.isComposing,
            keyCode: event.nativeEvent.keyCode,
            defaultPrevented: event.defaultPrevented,
            shiftKey: event.shiftKey,
          })
        ) {
          event.preventDefault();
          void onEnterSubmit();
        }
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";
