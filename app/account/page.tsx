"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Sprout,
  Trash2,
  X,
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
  getAccountMonthTotals,
  getAccountDailyMap,
  getAccountByDate,
  extractAmount,
} from "@/lib/summary";
import { todayKey } from "@/lib/utils";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const BASELINE = 30000; // 基准额度参考值

/**
 * 顶部「土地 + 可左右移动树苗」可视化：
 * - 土地为一条细线轨道；树苗绘制在土地上方，左右移动。
 * - 位置由结余占基准值的比例决定（夹在 0~100%）。
 * - 结余 > 0：茁壮绿色小树，数值越大枝叶越茂盛；
 *   结余 < 0：枯萎灰黄色树苗，负数绝对值越大越枯萎。
 */
function TreeTrack({ balance }: { balance: number }) {
  const ratio = Math.max(0, Math.min(1, balance / BASELINE)); // 0~1
  const leftPct = 4 + ratio * 92; // 留白，避免贴边
  const positive = balance >= 0;

  // 茂盛度：0~1，绝对值越大越茂盛 / 越枯萎
  const intensity = Math.min(1, Math.abs(balance) / BASELINE);
  const treeColor = positive ? "#548C70" : "#B7A24E"; // 松绿 / 灰黄
  const leafScale = 0.7 + intensity * 0.6; // 枝叶缩放

  return (
    <div className="relative h-28">
      {/* 基准刻度说明 */}
      <div className="mb-2 flex items-center justify-between text-[11px] text-ink-faint">
        <span>0</span>
        <span>结余 = 收入 − 支出 · 基准 {BASELINE}</span>
        <span>+{BASELINE}</span>
      </div>
      {/* 土地轨道（细线） */}
      <div className="absolute bottom-6 left-0 right-0 h-px bg-line" />
      {/* 基准中点标记 */}
      <div className="absolute bottom-6 left-1/2 h-2 w-px -translate-x-1/2 bg-line" />
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

  // 记录列表（最新在前），分别来自 account 表
  const [expenseList, setExpenseList] = useState<AccountRecord[]>([]);
  const [incomeList, setIncomeList] = useState<AccountRecord[]>([]);

  // 日历标记
  const [dayMap, setDayMap] = useState<
    Record<string, { income: number; expense: number }>
  >({});
  const [monthTotals, setMonthTotals] = useState<{
    income: number;
    expense: number;
    balance: number;
  }>({ income: 0, expense: 0, balance: 0 });

  // 日历点击弹窗
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailRecords, setDetailRecords] = useState<AccountRecord[]>([]);

  const calPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const curMonth = useMemo(() => todayKey().slice(0, 7), [today]);

  async function reload() {
    const [t, dMap, mT] = await Promise.all([
      getAccountTotals(),
      getAccountDailyMap(calPrefix),
      getAccountMonthTotals(calPrefix),
    ]);
    setTotals(t);
    setDayMap(dMap);
    setMonthTotals(mT);
  }

  async function reloadLists() {
    const all = (await repos.account.all()) as AccountRecord[];
    const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
    setExpenseList(sorted.filter((r) => r.type === "expense"));
    setIncomeList(sorted.filter((r) => r.type === "income"));
  }

  useEffect(() => {
    reload();
    reloadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

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
    await Promise.all([reload(), reloadLists()]);
  }

  async function removeRecord(id?: number) {
    if (id == null) return;
    await repos.account.delete(id);
    await Promise.all([reload(), reloadLists()]);
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
            items={expenseList}
            title={
              <p className="mb-3 px-1 text-sm font-medium text-primary">
                支出记录（{expenseList.length}）
              </p>
            }
            empty={
              <p className="py-2 text-center text-[13px] text-ink-faint">
                还没有支出记录
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
            items={incomeList}
            title={
              <p className="mb-3 px-1 text-sm font-medium text-primary">
                收入记录（{incomeList.length}）
              </p>
            }
            empty={
              <p className="py-2 text-center text-[13px] text-ink-faint">
                还没有收入记录
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
                      <span className="text-[10px] tabular text-red-500">
                        +{day.income}
                      </span>
                    ) : null}
                    {day?.expense ? (
                      <span className="text-[10px] tabular text-accent">
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

      {/* 当月汇总 */}
      <Card>
        <CardContent>
          <p className="text-sm font-medium text-primary">本月汇总</p>
          <p className="mt-2 tabular text-sm text-ink">
            本月收入：
            <span className="text-red-500">+{monthTotals.income}</span>
            <span className="mx-1 text-ink-faint">｜</span>
            本月支出：
            <span className="text-accent">-{monthTotals.expense}</span>
            <span className="mx-1 text-ink-faint">｜</span>
            本月结余：
            <span className={monthTotals.balance >= 0 ? "text-accent-dark" : "text-ink"}>
              {monthTotals.balance >= 0 ? "+" : ""}
              {monthTotals.balance}
            </span>
          </p>
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
                          <span className={r.type === "income" ? "text-red-500" : "text-accent"}>
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
