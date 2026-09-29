"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Utensils } from "lucide-react";
import { Sheet } from "@/components/common/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFoodRecord, updateFoodRecord } from "@/lib/food";
import type { FoodRecord } from "@/lib/db/db";

interface FoodRecordSheetProps {
  open: boolean;
  isUnplanned: boolean;
  existing?: FoodRecord;
  onClose: () => void;
  onSaved: (record: FoodRecord, leavesDelta: number) => void;
}

export function FoodRecordSheet({
  open,
  isUnplanned,
  existing,
  onClose,
  onSaved,
}: FoodRecordSheetProps) {
  const [content, setContent] = useState("");
  const [unplanned, setUnplanned] = useState(isUnplanned);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setContent(existing?.content ?? "");
    setUnplanned(existing?.isUnplanned ?? isUnplanned);
  }, [open, existing, isUnplanned]);

  async function save() {
    if (!content.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const result = existing?.id != null
        ? await updateFoodRecord(existing.id, content, unplanned)
        : await addFoodRecord(content, isUnplanned);
      onSaved(result.record, result.leavesDelta);
      onClose();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? "编辑饮食记录" : unplanned ? "记录计划外饮食" : "记录普通饮食"}
    >
      <div className="space-y-4">
        <div>
          <Label>吃了什么？</Label>
          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            placeholder="例如：两个鸡蛋 + 豆浆"
            maxLength={160}
            autoFocus
          />
        </div>
        {existing && (
          <div>
            <Label>记录类型</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F2F2F0] p-1">
              <button
                type="button"
                onClick={() => setUnplanned(false)}
                aria-pressed={!unplanned}
                className={`h-9 rounded-md text-xs font-medium ${
                  !unplanned ? "bg-white text-primary" : "text-ink-soft"
                }`}
              >
                普通饮食
              </button>
              <button
                type="button"
                onClick={() => setUnplanned(true)}
                aria-pressed={unplanned}
                className={`h-9 rounded-md text-xs font-medium ${
                  unplanned ? "bg-[#F4EEE5] text-[#866C4E]" : "text-ink-soft"
                }`}
              >
                计划外
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          <Utensils className="h-3.5 w-3.5" />
          <span>{existing ? "编辑不会改变原始记录时间" : "保存时自动记录当前时间"}</span>
          {unplanned && (
            <span className="rounded-full border border-[#D8C3A5] bg-[#F4EEE5] px-2 py-0.5 text-[#866C4E]">
              计划外
            </span>
          )}
        </div>
        <Button variant="accent" className="w-full" onClick={save} disabled={!content.trim() || saving}>
          <Check className="h-4 w-4" /> {saving ? "保存中…" : existing ? "保存修改" : "保存记录"}
        </Button>
      </div>
    </Sheet>
  );
}
