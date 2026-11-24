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
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (window.matchMedia("(max-width: 767px)").matches &&
        (navigator.maxTouchPoints > 0 || "ontouchstart" in window));
    if (!isMobile) return;

    let baselineHeight = viewport?.height ?? window.innerHeight;
    let keyboardOpen = false;
    let frame = 0;
    const timers = new Set<number>();
    const virtualKeyboard = (navigator as Navigator & {
      virtualKeyboard?: {
        boundingRect?: DOMRectReadOnly;
        addEventListener?: (type: string, listener: EventListener) => void;
        removeEventListener?: (type: string, listener: EventListener) => void;
      };
    }).virtualKeyboard;

    function activeEditable(): HTMLElement | null {
      return isEditable(document.activeElement) ? document.activeElement : null;
    }

    function isScrollable(element: HTMLElement) {
      const style = window.getComputedStyle(element);
      return (
        /(auto|scroll|overlay)/.test(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 2
      );
    }

    function keepVisible(target = activeEditable(), behavior: ScrollBehavior = "auto") {
      if (!target) return;
      const currentViewport = window.visualViewport;
      const top = currentViewport?.offsetTop ?? 0;
      const height = currentViewport?.height ?? window.innerHeight;
      const bottom = top + height;
      const margin = 28;

      // scrollIntoView() alone is unreliable when a Sheet locks body scrolling.
      // Move the nearest scrollable region first, then fall back to the page.
      let rect = target.getBoundingClientRect();
      let delta = rect.bottom - (bottom - margin);
      if (rect.top < top + margin) delta = rect.top - (top + margin);
      if (Math.abs(delta) < 2) return;

      let scroller = target.parentElement;
      while (scroller && scroller !== document.body) {
        if (isScrollable(scroller)) {
          scroller.scrollBy({ top: delta, behavior });
          rect = target.getBoundingClientRect();
          delta = rect.bottom - (bottom - margin);
          if (rect.top < top + margin) delta = rect.top - (top + margin);
          if (Math.abs(delta) < 2) return;
          break;
        }
        scroller = scroller.parentElement;
      }

      if (document.scrollingElement && document.scrollingElement.scrollHeight > window.innerHeight) {
        window.scrollBy({ top: delta, behavior });
      } else if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior });
      }
    }

    function scheduleVisibility(behavior: ScrollBehavior = "auto") {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => keepVisible(undefined, behavior));
    }

    function scheduleAfterKeyboard(target?: HTMLElement) {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      for (const delay of [0, 120, 280, 520, 820]) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          updateViewport();
          keepVisible(target ?? activeEditable(), "auto");
        }, delay);
        timers.add(timer);
      }
    }

    function updateViewport() {
      const currentViewport = window.visualViewport;
      const virtualKeyboardHeight = virtualKeyboard?.boundingRect?.height ?? 0;
      const visualHeight = Math.min(
        currentViewport?.height ?? window.innerHeight,
        Math.max(1, window.innerHeight - virtualKeyboardHeight)
      );
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
      keepVisible(event.target as HTMLElement, "auto");
      scheduleAfterKeyboard(event.target as HTMLElement);
    }

    function onInput(event: Event) {
      if (keyboardOpen && isEditable(event.target)) scheduleVisibility("auto");
    }

    function onFocusOut() {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        updateViewport();
      }, 180);
      timers.add(timer);
    }

    function onOrientationChange() {
      baselineHeight = window.visualViewport?.height ?? window.innerHeight;
      updateViewport();
    }

    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    virtualKeyboard?.addEventListener?.("geometrychange", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput);

    return () => {
      window.cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      virtualKeyboard?.removeEventListener?.("geometrychange", updateViewport);
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
