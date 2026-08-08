import {
  Home,
  Dumbbell,
  Wallet,
  BookOpen,
  Type,
  PenLine,
  FlaskConical,
  Heart,
  LineChart,
  Settings,
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
  { href: "/reading", label: "阅读", en: "Reading", icon: BookOpen },
  { href: "/english", label: "英文阅读", en: "English", icon: Type },
  { href: "/research", label: "论文", en: "Research", icon: PenLine },
  { href: "/experiment", label: "实验", en: "Experiment", icon: FlaskConical },
  { href: "/gratitude", label: "感恩日记", en: "Gratitude", icon: Heart },
  { href: "/growth", label: "成长回顾", en: "Growth", icon: LineChart },
  { href: "/settings", label: "设置", en: "Settings", icon: Settings },
];
