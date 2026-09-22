"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Diamond, Route } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MainlineSheet } from "@/components/mainline/mainline-sheet";
import { Button } from "@/components/ui/button";
import { repos } from "@/lib/db/repo";
import type { DailyMainRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

export default function MainlinePage() {
  const today = useMemo(() => todayKey(), []);
  const [records, setRecords] = useState<DailyMainRecord[]>([]);
  const [milestoneDates, setMilestoneDates] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDate, setEditDate] = useState(today);
  const [editing, setEditing] = useState<DailyMainRecord | undefined>();

  useEffect(() => {
    (async () => {
      const [mainRows, milestoneRows] = await Promise.all([
        repos.dailyMain.all(),
        repos.milestones.all(),
      ]);
      const sorted = mainRows.sort((a, b) => b.date.localeCompare(a.date));
      setRecords(sorted);
      setMilestoneDates(new Set(milestoneRows.map((item) => item.date)));
      if (new URLSearchParams(window.location.search).get("edit") === "1") {
        setEditDate(today);
        setEditing(sorted.find((item) => item.date === today));
        setSheetOpen(true);
      }
    })();
  }, [today]);

  function openRecord(record?: DailyMainRecord) {
    setEditDate(record?.date ?? today);
    setEditing(record ?? records.find((item) => item.date === today));
    setSheetOpen(true);
  }

  function saved(record: DailyMainRecord) {
    setRecords((current) =>
      [record, ...current.filter((item) => item.date !== record.date)].sort((a, b) =>
        b.date.localeCompare(a.date)
      )
    );
    setEditing(record);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="主线记录" desc="回看最近这些天，时间与精力主要流向了哪里" />

      <Button variant="outline" className="w-full" onClick={() => openRecord()}>
        <Route className="h-4 w-4" /> {records.some((item) => item.date === today) ? "修改今日主线" : "记录今日主线"}
      </Button>

      {records.length === 0 ? (
        <div className="border-y border-line py-12 text-center">
          <p className="text-sm text-ink-soft">还没有主线记录</p>
          <p className="mt-1 text-xs text-ink-faint">每天留下一条，就会慢慢看见自己的时间轨迹</p>
        </div>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {records.map((record) => {
            const hasMilestone = milestoneDates.has(record.date);
            return (
              <div key={record.id} className="flex items-center gap-3 py-3.5">
                <button type="button" onClick={() => openRecord(record)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="tabular w-12 shrink-0 text-xs text-ink-faint">{shortDate(record.date)}</span>
                  <span className="w-10 shrink-0 text-sm font-medium text-primary">{record.category}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{record.note || ""}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                </button>
                {hasMilestone && (
                  <Link
                    href={`/milestones?date=${record.date}`}
                    aria-label={`查看 ${record.date} 的里程碑`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-primary"
                  >
                    <Diamond className="h-3.5 w-3.5 fill-primary/10" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MainlineSheet
        open={sheetOpen}
        date={editDate}
        existing={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={saved}
      />
    </div>
  );
}

function shortDate(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(8, 10)}`;
}
