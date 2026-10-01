"use client";

import { useEffect, useState } from "react";
import { Diamond } from "lucide-react";
import { Sheet } from "@/components/common/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addMilestone, updateMilestone } from "@/lib/milestones";
import type { MilestoneRecord } from "@/lib/db/db";

interface MilestoneSheetProps {
  open: boolean;
  defaultDate: string;
  existing?: MilestoneRecord;
  onClose: () => void;
  onSaved: (record: MilestoneRecord) => void;
}

export function MilestoneSheet({ open, defaultDate, existing, onClose, onSaved }: MilestoneSheetProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? "");
    setDate(existing?.date ?? defaultDate);
    setNote(existing?.note ?? "");
  }, [open, defaultDate, existing]);

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const record = existing?.id != null
        ? await updateMilestone(existing.id, date, title, note)
        : await addMilestone(date, title, note);
      onSaved(record);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "修改里程碑" : "今天有什么值得留下？"}>
      <div className="space-y-4">
        <div>
          <Label>里程碑</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="一句话记下这件事"
            maxLength={160}
            autoFocus
          />
        </div>
        <div>
          <Label>日期</Label>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div>
          <Label>备注（可选）</Label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="想多留一句的话，就写在这里"
            rows={3}
          />
        </div>
        <Button variant="accent" className="w-full" onClick={save} disabled={!title.trim() || !date || saving}>
          <Diamond className="h-4 w-4" /> {saving ? "保存中…" : existing ? "保存修改" : "保存里程碑"}
        </Button>
      </div>
    </Sheet>
  );
}
