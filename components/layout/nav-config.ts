import {
  Home,
  Dumbbell,
  Wallet,
  Box,
  BookOpen,
  PenLine,
  FlaskConical,
  Heart,
  LineChart,
  Settings,
  Route,
  Diamond,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  en: string;
  icon: LucideIcon;
}

/** 栏目顺序固定，两端共用 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "今日", en: "Today", icon: Home },
  { href: "/exercise", label: "运动", en: "Exercise", icon: Dumbbell },
  { href: "/account", label: "记账", en: "Account", icon: Wallet },
  { href: "/food", label: "饮食记录", en: "Food", icon: Utensils },
  { href: "/boxplot", label: "箱型图", en: "Box Plot", icon: Box },
  { href: "/reading", label: "阅读", en: "Reading", icon: BookOpen },
  { href: "/research", label: "专注", en: "Focus", icon: PenLine },
  { href: "/experiment", label: "实验", en: "Experiment", icon: FlaskConical },
  { href: "/gratitude", label: "好运来", en: "Good Luck", icon: Heart },
  { href: "/mainline", label: "主线", en: "Mainline", icon: Route },
  { href: "/milestones", label: "里程碑", en: "Milestones", icon: Diamond },
  { href: "/growth", label: "成长回顾", en: "Growth", icon: LineChart },
  { href: "/settings", label: "设置", en: "Settings", icon: Settings },
];
