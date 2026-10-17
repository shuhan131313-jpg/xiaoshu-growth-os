export interface EnterKeyState {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
  defaultPrevented?: boolean;
  shiftKey?: boolean;
}

/** 只在普通回车时提交；中文输入法组合及候选词确认阶段不触发。 */
export function shouldSubmitOnEnter(event: EnterKeyState): boolean {
  return (
    event.key === "Enter" &&
    !event.defaultPrevented &&
    !event.shiftKey &&
    !event.isComposing &&
    event.keyCode !== 229
  );
}
