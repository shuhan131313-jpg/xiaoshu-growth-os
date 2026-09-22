"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Diamond, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { MilestoneSheet } from "@/components/milestones/milestone-sheet";
import { Button } from "@/components/ui/button";
import { repos } from "@/lib/db/repo";
import type { MilestoneRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

export default function MilestonesPage() {
  const today = useMemo(() => todayKey(), []);
  const [records, setRecords] = useState<MilestoneRecord[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState(today);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const date = params.get("date");
      const rows = await repos.milestones.all();
      setRecords(sortMilestones(rows));
      setFocusDate(date);
      if (params.get("new") === "1") {
        setDefaultDate(date || today);
        setSheetOpen(true);
      }
    })();
  }, [today]);

  const visibleRecords = focusDate
    ? records.filter((record) => record.date === focusDate)
    : records;
  const byYear = visibleRecords.reduce<Record<string, MilestoneRecord[]>>((groups, record) => {
    const year = record.date.slice(0, 4);
    (groups[year] ||= []).push(record);
    return groups;
  }, {});

  function openNew() {
    setDefaultDate(focusDate || today);
    setSheetOpen(true);
  }

  function saved(record: MilestoneRecord) {
    setRecords((current) => sortMilestones([record, ...current]));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={focusDate ? "这一天的里程碑" : "里程碑"}
        desc={focusDate ? focusDate : "不是成就评级，只把想记住的时刻留在这里"}
      />

      <div className="flex gap-2">
        {focusDate && (
          <Link
            href="/milestones"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-medium text-ink-soft transition hover:bg-line/50"
          >
            查看全部
          </Link>
        )}
        <Button variant="outline" className="flex-1" onClick={openNew}>
          <Plus className="h-4 w-4" /> 记录里程碑
        </Button>
      </div>

      {visibleRecords.length === 0 ? (
        <div className="border-y border-line py-12 text-center">
          <Diamond className="mx-auto h-5 w-5 text-primary" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-ink-soft">这里还没有里程碑</p>
          <p className="mt-1 text-xs text-ink-faint">大小都可以，只要你想在这里折一下角</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byYear)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, items]) => (
              <section key={year}>
                <h2 className="tabular mb-3 text-xl font-semibold text-ink">{year}</h2>
                <div className="space-y-0 border-l border-primary/25 pl-5">
                  {items.map((record) => (
                    <article key={record.id} className="relative pb-6 last:pb-0">
                      <Diamond className="absolute -left-[27px] top-0.5 h-3 w-3 fill-background text-primary" />
                      <p className="tabular text-xs text-ink-faint">{shortDate(record.date)}</p>
                      <h3 className="mt-1 text-base font-semibold leading-snug text-ink">{record.title}</h3>
                      {record.note && (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{record.note}</p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      <MilestoneSheet
        open={sheetOpen}
        defaultDate={defaultDate}
        onClose={() => setSheetOpen(false)}
        onSaved={saved}
      />
    </div>
  );
}

function sortMilestones(records: MilestoneRecord[]): MilestoneRecord[] {
  return [...records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );
}

function shortDate(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(8, 10)}`;
}
