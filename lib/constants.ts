export const SITE = {
  name: "树",
  fullName: "树 · Growth OS",
};

/** 首页今日待办覆盖的模块（与导航顺序一致） */
export const TODAY_MODULES = [
  { key: "exercise", label: "运动" },
  { key: "reading", label: "阅读" },
  { key: "research", label: "专注" },
  { key: "gratitude", label: "好运来" },
] as const;

export type TodayModuleKey = (typeof TODAY_MODULES)[number]["key"];

/** 首页「今日成长」树苗条：核心模块（不含好运来），与侧边导航核心模块一一对应 */
export const GROWTH_MODULES = [
  { key: "exercise", label: "运动" },
  { key: "reading", label: "阅读" },
  { key: "research", label: "专注" },
  { key: "gratitude", label: "好运来" },
] as const;
