import Dexie, { type Table } from "dexie";

export interface DailyTask {
  id?: number;
  date: string; // YYYY-MM-DD
  key: string; // exercise | reading | ...
  done: boolean;
}

export interface ExerciseRecord {
  id?: number;
  date: string;
  project: string;
  duration: number; // 分钟
  note?: string;
  createdAt: number;
}

export interface ReadingRecord {
  id?: number;
  date: string;
  book?: string;
  duration: number;
  feeling?: string;
  createdAt: number;
}

export interface EnglishRecord {
  id?: number;
  date: string;
  title?: string;
  content?: string;
  createdAt: number;
}

export interface MeditationRecord {
  id?: number;
  date: string;
  duration: number;
  createdAt: number;
}

export interface ResearchRecord {
  id?: number;
  date: string;
  duration: number;
  summary?: string;
  createdAt: number;
}

export interface LiteratureItem {
  id?: number;
  date: string;
  title: string;
  journal?: string;
  excerpt?: string;
  cnSummary?: string;
  findings?: string;
  vocab?: { term: string; meaning: string }[];
  createdAt: number;
}

export interface ExperimentRecord {
  id?: number;
  date: string;
  name: string;
  type: string;
  steps?: string;
  result?: string;
  improvement?: string;
  duration?: number;
  createdAt: number;
}

export interface GratitudeRecord {
  id?: number;
  date: string;
  items: string[];
  reflection?: string;
  createdAt: number;
}

export interface GrowthReport {
  id?: number;
  period: string; // week-2026-31 | month-2026-08
  type: "week" | "month";
  data: Record<string, unknown>;
  createdAt: number;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: unknown;
}

export class XiaoShuDB extends Dexie {
  dailyTasks!: Table<DailyTask, number>;
  exercise!: Table<ExerciseRecord, number>;
  reading!: Table<ReadingRecord, number>;
  english!: Table<EnglishRecord, number>;
  meditation!: Table<MeditationRecord, number>;
  research!: Table<ResearchRecord, number>;
  literature!: Table<LiteratureItem, number>;
  experiment!: Table<ExperimentRecord, number>;
  gratitude!: Table<GratitudeRecord, number>;
  growth!: Table<GrowthReport, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super("xiaoshu-growth-os");
    this.version(1).stores({
      dailyTasks: "++id, date, key",
      exercise: "++id, date",
      reading: "++id, date",
      english: "++id, date",
      meditation: "++id, date",
      research: "++id, date",
      literature: "++id, date",
      experiment: "++id, date",
      gratitude: "++id, date",
      growth: "++id, period",
      settings: "++id, key",
    });
  }
}

export const db = new XiaoShuDB();
