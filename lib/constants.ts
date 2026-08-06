export const SITE = {
  name: "小树",
  fullName: "小树 · Personal Growth OS",
};

/** 首页今日待办覆盖的模块（与导航顺序一致） */
export const TODAY_MODULES = [
  { key: "exercise", label: "运动" },
  { key: "reading", label: "阅读" },
  { key: "english", label: "英文阅读" },
  { key: "research", label: "论文" },
  { key: "experiment", label: "实验" },
  { key: "gratitude", label: "感恩日记" },
] as const;

export type TodayModuleKey = (typeof TODAY_MODULES)[number]["key"];

/** 首页「今日成长」树苗条：核心模块（不含感恩日记），与侧边导航核心模块一一对应 */
export const GROWTH_MODULES = [
  { key: "exercise", label: "运动" },
  { key: "reading", label: "阅读" },
  { key: "english", label: "英文阅读" },
  { key: "research", label: "论文" },
  { key: "experiment", label: "实验" },
] as const;
