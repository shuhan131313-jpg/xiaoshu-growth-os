export interface KeyboardViewportMetrics {
  height: number;
  offsetTop: number;
  keyboardInset: number;
  keyboardOpen: boolean;
}

/** 根据布局视口、可视视口与无键盘基线判断软键盘占用。 */
export function keyboardViewportMetrics(
  layoutHeight: number,
  visualHeight: number,
  offsetTop: number,
  baselineHeight: number,
  threshold = 96
): KeyboardViewportMetrics {
  const height = Math.max(1, visualHeight || layoutHeight);
  const top = Math.max(0, offsetTop || 0);
  const keyboardInset = Math.max(
    0,
    baselineHeight - height,
    layoutHeight - height - top
  );
  return {
    height,
    offsetTop: top,
    keyboardInset,
    keyboardOpen: keyboardInset >= threshold,
  };
}
