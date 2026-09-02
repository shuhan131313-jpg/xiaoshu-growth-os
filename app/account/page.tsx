"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Sprout,
  Trash2,
  X,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { FoldList } from "@/components/common/fold-list";
import { repos } from "@/lib/db/repo";
import type { AccountRecord } from "@/lib/db/db";
import {
  getAccountTotals,
  getAccountDailyMap,
  getAccountByDate,
  extractAmount,
} from "@/lib/summary";
import { todayKey } from "@/lib/utils";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const BASELINE = 30000; // 基准额度参考值

/** 取记录所属自然月（YYYY-MM），异常数据返回空串 */
function monthOf(r: AccountRecord): string {
  return typeof r.date === "string" ? r.date.slice(0, 7) : "";
}

/** 汇总一批记账记录：收入 / 支出 / 结余 */
function sumRows(rows: AccountRecord[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
  }
  income = Math.round(income * 100) / 100;
  expense = Math.round(expense * 100) / 100;
  return { income, expense, balance: Math.round((income - expense) * 100) / 100 };
}

/** 月份位移：YYYY-MM 往前/往后 delta 个月 */
function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 月份下拉文案：2026-09 → 2026 年 9 月（本月） */
function monthLabel(ym: string, cur: string, prev: string): string {
  const [y, m] = ym.split("-").map(Number);
  const base = `${y} 年 ${m} 月`;
  if (ym === cur) return `${base}（本月）`;
  if (ym === prev) return `${base}（上月）`;
  return base;
}

/**
 * 顶部「土地 + 可左右移动树苗」可视化：
 * - 土地为一条细线轨道；树苗绘制在土地上方，左右移动。
 * - 位置由结余占基准值的比例决定（夹在 0~100%）。
 * - 结余 > 0：茁壮暖黄小树，数值越大枝叶越茂盛；
 *   结余 < 0：枯萎灰树苗，负数绝对值越大越枯萎。
 */
function TreeTrack({ balance }: { balance: number }) {
  const ratio = Math.max(0, Math.min(1, balance / BASELINE)); // 0~1
  const leftPct = 4 + ratio * 92; // 留白，避免贴边
  const positive = balance >= 0;

  // 茂盛度：0~1，绝对值越大越茂盛 / 越枯萎
  const intensity = Math.min(1, Math.abs(balance) / BASELINE);
  const treeColor = positive ? "#E6C260" : "#B0B0B0"; // 暖黄 / 灰
  const leafScale = 0.7 + intensity * 0.6; // 枝叶缩放

  return (
    <div className="relative h-28">
      {/* 基准刻度说明 */}
      <div className="mb-2 flex items-center justify-between text-[11px] text-ink-faint">
        <span>0</span>
        <span>结余 = 收入 − 支出 · 基准 {BASELINE}</span>
        <span>+{BASELINE}</span>
      </div>
      {/* 土地轨道（细线，属进度元素，用主强调蓝） */}
      <div className="absolute bottom-6 left-0 right-0 h-px bg-primary/30" />
      {/* 基准中点标记 */}
      <div className="absolute bottom-6 left-1/2 h-2 w-px -translate-x-1/2 bg-primary/40" />
      {/* 树苗（绘制在土地上方，可左右移动） */}
      <div
        className="absolute bottom-6 transition-all duration-500 ease-out"
        style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
      >
        <Sprout
          className="h-10 w-10 transition-all duration-500"
          style={{
            color: treeColor,
            // 枝叶随强度缩放（以图标中心为锚点）
            transform: `scale(${leafScale})`,
            transformOrigin: "bottom center",
            opacity: positive ? 0.85 + intensity * 0.15 : 0.55 + intensity * 0.25,
          }}
          strokeWidth={positive ? 2.2 : 1.8}
        />
      </div>
    </div>
  );
}

export default function AccountPage() {
  const today = useMemo(() => new Date(), []);
  // 当前自然月（YYYY-MM）：「本月 / 上月」汇总与默认查看月份都以此为基准
  const curMonth = useMemo(() => todayKey().slice(0, 7), [today]);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11

  // 顶部总览
  const [totals, setTotals] = useState<{
    income: number;
    expense: number;
    balance: number;
  }>({ income: 0, expense: 0, balance: 0 });

  // 支出框
  const [expenseText, setExpenseText] = useState("");
  // 收入框
  const [incomeText, setIncomeText] = useState("");

  // 全部记账记录（最新在前，含所有月份，按月派生展示与汇总）
  const [allRecords, setAllRecords] = useState<AccountRecord[]>([]);
  // 当前查看的月份（YYYY-MM），默认本月
  const [viewMonth, setViewMonth] = useState(curMonth);

  // 日历标记
  const [dayMap, setDayMap] = useState<
    Record<string, { income: number; expense: number }>
  >({});

  // 日历点击弹窗
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailRecords, setDetailRecords] = useState<AccountRecord[]>([]);

  const calPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const prevMonth = useMemo(() => shiftYearMonth(curMonth, -1), [curMonth]);

  async function reload() {
    const [t, dMap] = await Promise.all([
      getAccountTotals(),
      getAccountDailyMap(calPrefix),
    ]);
    setTotals(t);
    setDayMap(dMap);
  }

  async function reloadRecords() {
    const all = (await repos.account.all()) as AccountRecord[];
    // 最新在前；全部月份记录始终保留，按月派生展示，不做任何自动删除
    setAllRecords(all.sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    reload();
    reloadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // 本月 / 上月汇总（自然月自动划分；跨月后本月统计自然从零重新累计）
  const curTotals = useMemo(
    () => sumRows(allRecords.filter((r) => monthOf(r) === curMonth)),
    [allRecords, curMonth]
  );
  const prevTotals = useMemo(
    () => sumRows(allRecords.filter((r) => monthOf(r) === prevMonth)),
    [allRecords, prevMonth]
  );

  // 下拉可选月份：有记录的月份 + 本月（新月份即使暂无记录也可选中）
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      const m = monthOf(r);
      if (m) set.add(m);
    });
    set.add(curMonth);
    return Array.from(set).sort().reverse(); // 最新在前
  }, [allRecords, curMonth]);

  // 当前查看月份的收支条目（每个月数据相互独立）
  const viewExpense = useMemo(
    () => allRecords.filter((r) => r.type === "expense" && monthOf(r) === viewMonth),
    [allRecords, viewMonth]
  );
  const viewIncome = useMemo(
    () => allRecords.filter((r) => r.type === "income" && monthOf(r) === viewMonth),
    [allRecords, viewMonth]
  );

  async function addRecord(type: "expense" | "income", text: string) {
    const amount = extractAmount(text);
    if (amount <= 0) return; // 无有效数字则忽略
    await repos.account.add({
      date: todayKey(),
      type,
      amount,
      note: text.trim() || undefined,
      createdAt: Date.now(),
    });
    if (type === "expense") setExpenseText("");
    else setIncomeText("");
    // 新记录记在当天，把查看月份切回本月，避免记完看不到
    setViewMonth(curMonth);
    await Promise.all([reload(), reloadRecords()]);
  }

  async function removeRecord(id?: number) {
    if (id == null) return;
    await repos.account.delete(id);
    await Promise.all([reload(), reloadRecords()]);
    if (detailDate) {
      setDetailRecords(await getAccountByDate(detailDate));
    }
  }

  async function openDay(date: string) {
    const recs = await getAccountByDate(date);
    setDetailRecords(recs);
    setDetailDate(date);
  }

  // 月历格子
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  }

  const expensePreview = extractAmount(expenseText);
  const incomePreview = extractAmount(incomeText);

  return (
    <div className="space-y-5">
      <PageHeader title="记账" desc="记下每一笔进出，看小树慢慢长大" />

      {/* 顶部：30000 基准额度进度可视化 */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Wallet className="h-4 w-4" /> 结余进度
          </div>
          <TreeTrack balance={totals.balance} />
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-line/30 px-3 py-2">
            <span className="text-sm text-ink-soft">当前结余</span>
            <span
              className={`tabular text-lg font-semibold ${
                totals.balance >= 0 ? "text-accent-dark" : "text-ink"
              }`}
            >
              {totals.balance >= 0 ? "+" : ""}
              {totals.balance}
              <span className="ml-1 text-xs font-normal text-ink-faint">元</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 月份切换：选择查看哪个月的记账条目（历史月份完整保留，不会自动删除） */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-card">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary">
          <CalendarDays className="h-4 w-4 shrink-0" />
          查看月份
        </div>
        <select
          value={viewMonth}
          onChange={(e) => setViewMonth(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none transition duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m, curMonth, prevMonth)}
            </option>
          ))}
        </select>
      </div>

      {/* 支出大框 */}
      <Card>
        <CardContent>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
            支出
          </div>
          <p className="mb-3 text-[13px] text-ink-faint">
            自由输入，自动提取其中数字求和。如「午餐5 晚餐10」→ 15 元
          </p>
          <Label>支出内容</Label>
          <Input
            value={expenseText}
            onChange={(e) => setExpenseText(e.target.value)}
            placeholder="午餐5 晚餐10"
          />
          <Button
            variant="accent"
            className="mt-3 w-full"
            onClick={() => addRecord("expense", expenseText)}
            disabled={expensePreview <= 0}
          >
            确认支出
            {expensePreview > 0 && (
              <span className="tabular">（{expensePreview} 元）</span>
            )}
          </Button>

          <FoldList
            className="mt-4"
            items={viewExpense}
            title={
              <p className="mb-3 px-1 text-sm font-medium text-primary">
                支出记录（{viewMonth} · {viewExpense.length}）
              </p>
            }
            empty={
              <p className="py-2 text-center text-[13px] text-ink-faint">
                该月还没有支出记录
              </p>
            }
            renderItem={(r) => (
              <Card key={r.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        支出 {r.amount} 元
                        {r.note && (
                          <span className="ml-2 text-xs font-normal text-ink-faint">
                            ｜备注：{r.note}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 tabular text-[11px] text-ink-faint">
                        {r.date}
                      </p>
                    </div>
                    <button
                      onClick={() => removeRecord(r.id)}
                      aria-label="删除"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition duration-200 hover:bg-line/50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          />
        </CardContent>
      </Card>

      {/* 收入大框 */}
      <Card>
        <CardContent>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
            收入
          </div>
          <p className="mb-3 text-[13px] text-ink-faint">
            自由输入，提取其中数字作为收入。如「红包10」或只写「10」
          </p>
          <Label>收入内容</Label>
          <Input
            value={incomeText}
            onChange={(e) => setIncomeText(e.target.value)}
            placeholder="红包10 / 10"
          />
          <Button
            variant="accent"
            className="mt-3 w-full"
            onClick={() => addRecord("income", incomeText)}
            disabled={incomePreview <= 0}
          >
            确认收入
            {incomePreview > 0 && (
              <span className="tabular">（{incomePreview} 元）</span>
            )}
          </Button>

          <FoldList
            className="mt-4"
            items={viewIncome}
            title={
              <p className="mb-3 px-1 text-sm font-medium text-primary">
                收入记录（{viewMonth} · {viewIncome.length}）
              </p>
            }
            empty={
              <p className="py-2 text-center text-[13px] text-ink-faint">
                该月还没有收入记录
              </p>
            }
            renderItem={(r) => (
              <Card key={r.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        收入 {r.amount} 元
                        {r.note && (
                          <span className="ml-2 text-xs font-normal text-ink-faint">
                            ｜备注：{r.note}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 tabular text-[11px] text-ink-faint">
                        {r.date}
                      </p>
                    </div>
                    <button
                      onClick={() => removeRecord(r.id)}
                      aria-label="删除"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition duration-200 hover:bg-line/50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          />
        </CardContent>
      </Card>

      {/* 记账日历 */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
              aria-label="上个月"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-ink">{calPrefix}</p>
            <button
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
              aria-label="下个月"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-faint">
            {WEEK.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d == null) return <div key={`e${i}`} />;
              const date = `${calPrefix}-${String(d).padStart(2, "0")}`;
              const day = dayMap[date];
              const isToday = date === todayKey();
              const isActive = date === detailDate;
              return (
                <button
                  key={date}
                  onClick={() => openDay(date)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition duration-200 ${
                    isActive
                      ? "bg-accent/20 font-semibold text-accent-dark"
                      : isToday
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-ink hover:bg-line/40"
                  }`}
                >
                  <span>{d}</span>
                  <span className="mt-0.5 flex flex-col items-center leading-none">
                    {day?.income ? (
                      <span className="text-[10px] tabular text-[#C2554F]">
                        +{day.income}
                      </span>
                    ) : null}
                    {day?.expense ? (
                      <span className="text-[10px] tabular text-[#5E8C6A]">
                        -{day.expense}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 月度汇总（记账板块底部）：本月汇总 + 上个月汇总，按自然月独立统计 */}
      <Card>
        <CardContent>
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-primary">
            <CalendarDays className="h-4 w-4" /> 月度汇总
          </div>
          <p className="mb-3 text-[13px] text-ink-faint">
            按自然月独立统计；跨入新月份后本月统计重新累计，历史月份记录完整保留可查。
          </p>

          {/* 本月 */}
          <div className="rounded-2xl bg-line/30 px-3 py-3">
            <p className="text-xs font-medium text-ink-soft">本月 · {curMonth}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-ink-faint">总收入</p>
                <p className="tabular text-sm font-semibold text-[#C2554F]">
                  +{curTotals.income}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-faint">总支出</p>
                <p className="tabular text-sm font-semibold text-[#5E8C6A]">
                  -{curTotals.expense}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-faint">结余</p>
                <p
                  className={`tabular text-sm font-semibold ${
                    curTotals.balance >= 0 ? "text-accent-dark" : "text-ink"
                  }`}
                >
                  {curTotals.balance >= 0 ? "+" : ""}
                  {curTotals.balance}
                </p>
              </div>
            </div>
          </div>

          {/* 上个月 */}
          <div className="mt-2 rounded-2xl border border-line px-3 py-3">
            <p className="text-xs font-medium text-ink-soft">上个月 · {prevMonth}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-ink-faint">总收入</p>
                <p className="tabular text-sm font-semibold text-[#C2554F]">
                  +{prevTotals.income}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-faint">总支出</p>
                <p className="tabular text-sm font-semibold text-[#5E8C6A]">
                  -{prevTotals.expense}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-faint">结余</p>
                <p
                  className={`tabular text-sm font-semibold ${
                    prevTotals.balance >= 0 ? "text-accent-dark" : "text-ink"
                  }`}
                >
                  {prevTotals.balance >= 0 ? "+" : ""}
                  {prevTotals.balance}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 点击某天：弹窗显示当天所有记账记录与原始备注 */}
      {detailDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDetailDate(null)}
          />
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-soft md:rounded-3xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-base font-semibold text-ink">{detailDate} 记账</h3>
              <button
                onClick={() => setDetailDate(null)}
                aria-label="关闭"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {detailRecords.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">当天无记账记录</p>
              ) : (
                <ul className="space-y-2">
                  {detailRecords.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-2 rounded-2xl bg-line/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          <span className={r.type === "income" ? "text-[#C2554F]" : "text-[#5E8C6A]"}>
                            {r.type === "income" ? "收入" : "支出"} {r.amount} 元
                          </span>
                        </p>
                        {r.note && (
                          <p className="mt-0.5 text-[13px] text-ink-soft">{r.note}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeRecord(r.id)}
                        aria-label="删除"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition duration-200 hover:bg-line/50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
