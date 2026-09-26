"use client";

import { useEffect, useState } from "react";
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
  onSaved: (record: FoodRecord) => void;
}

export function FoodRecordSheet({
  open,
  isUnplanned,
  existing,
  onClose,
  onSaved,
}: FoodRecordSheetProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContent(existing?.content ?? "");
  }, [open, existing]);

  async function save() {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const record = existing?.id != null
        ? await updateFoodRecord(existing.id, content)
        : await addFoodRecord(content, isUnplanned);
      onSaved(record);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const unplanned = existing?.isUnplanned ?? isUnplanned;

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
