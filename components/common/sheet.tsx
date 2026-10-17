"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** 移动端底部上滑抽屉；桌面端居中弹窗。统一 250ms 柔和动效。 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-x-0 z-50 flex items-end justify-center md:inset-0 md:items-center"
          style={{
            top: "var(--visual-viewport-offset-top)",
            height: "var(--visual-viewport-height)",
          }}
        >
          <motion.div
            className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-card shadow-soft md:rounded-xl"
            style={{ maxHeight: "min(88vh, calc(var(--visual-viewport-height) - 1rem))" }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="keyboard-scroll-region overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
