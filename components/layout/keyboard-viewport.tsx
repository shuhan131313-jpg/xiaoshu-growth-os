"use client";

import { useEffect } from "react";
import { keyboardViewportMetrics } from "@/lib/viewport-rules";

function isEditable(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * 统一同步 Android/PWA 的 visualViewport，并在输入法改变可视区域时
 * 把当前输入控件滚回可见区域。页面与 Sheet 共用这一套逻辑。
 */
export function KeyboardViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let baselineHeight = viewport?.height ?? window.innerHeight;
    let keyboardOpen = false;
    let frame = 0;
    let focusTimer = 0;

    function activeEditable(): HTMLElement | null {
      return isEditable(document.activeElement) ? document.activeElement : null;
    }

    function keepVisible(target = activeEditable(), behavior: ScrollBehavior = "smooth") {
      if (!target) return;
      const currentViewport = window.visualViewport;
      const top = currentViewport?.offsetTop ?? 0;
      const height = currentViewport?.height ?? window.innerHeight;
      const bottom = top + height;
      const rect = target.getBoundingClientRect();
      const margin = 20;
      if (rect.top < top + margin || rect.bottom > bottom - margin) {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior });
      }
    }

    function scheduleVisibility(behavior: ScrollBehavior = "smooth") {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => keepVisible(undefined, behavior));
    }

    function updateViewport() {
      const currentViewport = window.visualViewport;
      const visualHeight = currentViewport?.height ?? window.innerHeight;
      const offsetTop = currentViewport?.offsetTop ?? 0;
      baselineHeight = Math.max(baselineHeight, visualHeight);
      const metrics = keyboardViewportMetrics(
        window.innerHeight,
        visualHeight,
        offsetTop,
        baselineHeight
      );
      keyboardOpen = metrics.keyboardOpen;
      root.style.setProperty("--visual-viewport-height", `${metrics.height}px`);
      root.style.setProperty("--visual-viewport-offset-top", `${metrics.offsetTop}px`);
      root.style.setProperty("--keyboard-inset", `${metrics.keyboardInset}px`);
      root.dataset.keyboardOpen = metrics.keyboardOpen ? "true" : "false";
      if (metrics.keyboardOpen) scheduleVisibility("auto");
    }

    function onFocus(event: FocusEvent) {
      if (!isEditable(event.target)) return;
      updateViewport();
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        updateViewport();
        keepVisible(event.target as HTMLElement);
      }, 280);
    }

    function onInput(event: Event) {
      if (keyboardOpen && isEditable(event.target)) scheduleVisibility("auto");
    }

    function onFocusOut() {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(updateViewport, 180);
    }

    function onOrientationChange() {
      baselineHeight = window.visualViewport?.height ?? window.innerHeight;
      updateViewport();
    }

    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onInput);
      delete root.dataset.keyboardOpen;
      root.style.removeProperty("--visual-viewport-height");
      root.style.removeProperty("--visual-viewport-offset-top");
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);

  return null;
}
