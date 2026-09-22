"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/common/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAINLINE_CATEGORIES, saveDailyMain } from "@/lib/mainline";
import type { DailyMainRecord, MainlineCategory } from "@/lib/db/db";

interface MainlineSheetProps {
  open: boolean;
  date: string;
  existing?: DailyMainRecord;
  onClose: () => void;
  onSaved: (record: DailyMainRecord) => void;
}

export function MainlineSheet({ open, date, existing, onClose, onSaved }: MainlineSheetProps) {
  const [category, setCategory] = useState<MainlineCategory | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory(existing?.category ?? null);
    setNote(existing?.note ?? "");
  }, [open, existing]);

  async function save() {
    if (!category || saving) return;
    setSaving(true);
    try {
      const record = await saveDailyMain(date, category, note);
      onSaved(record);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="今天的主线是什么？">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs text-ink-faint">选择最接近今天时间与精力流向的一项</p>
          <div className="grid grid-cols-4 gap-2">
            {MAINLINE_CATEGORIES.map((item) => {
              const selected = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`flex h-12 items-center justify-center rounded-lg border text-sm transition ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-background text-ink-soft"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>具体记录（可选）</Label>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例如：修改 Figure 2 和 Discussion"
            maxLength={120}
          />
        </div>
        <Button variant="accent" className="w-full" onClick={save} disabled={!category || saving}>
          <Check className="h-4 w-4" /> {saving ? "保存中…" : existing ? "更新今日主线" : "保存今日主线"}
        </Button>
      </div>
    </Sheet>
  );
}
