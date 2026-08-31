"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { repos } from "@/lib/db/repo";
import type { TodoRecord } from "@/lib/db/db";
import { todayKey } from "@/lib/utils";

/**
 * 过滤异常字符：屏蔽 IME 残留控制符、私有区、孤立代理、替换符(乱码标志)等，
 * 仅保留正常可见文本与汉字，避免输入框出现拼音乱码混杂。
 */
function sanitizeInput(s: string): string {
  return Array.from(s)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20) return false; // C0 控制符
      if (code === 0x7f) return false; // DEL
      if (code >= 0x80 && code < 0xa0) return false; // C1 控制符
      if (code >= 0xe000 && code <= 0xf8ff) return false; // 私有使用区
      if (code >= 0xd800 && code <= 0xdfff) return false; // 孤立代理
      if (code === 0xfffd) return false; // 替换符（乱码标志）
      return true;
    })
    .join("");
}

export default function TodoPage() {
  const today = useMemo(() => todayKey(), []);
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  // 跟踪 IME 组合输入状态：组合进行中不改写受控值，避免拼音乱码混杂
  const composingRef = useRef(false);

  // 跨天迁移：加载时清理「昨日已完成」、保留「昨日未完成」并带到今天
  async function migrateIfNeeded() {
    const all = (await repos.todo.all()) as TodoRecord[];
    const stale = all.filter((t) => t.date !== today);
    if (stale.length === 0) return;
    for (const t of stale) {
      if (t.done) {
        if (t.id != null) await repos.todo.delete(t.id);
      } else if (t.id != null) {
        await repos.todo.update(t.id, { date: today });
      }
    }
  }

  async function load() {
    await migrateIfNeeded();
    const rows = ((await repos.todo.whereDate(today)) as TodoRecord[]).sort(
      (a, b) => a.order - b.order
    );
    setTodos(rows);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 显示序列：未完成在前、已完成沉底；组内按 order
  const sorted = useMemo(
    () =>
      [...todos].sort((a, b) =>
        a.done === b.done ? a.order - b.order : a.done ? 1 : -1
      ),
    [todos]
  );

  async function addTodo() {
    const maxOrder = todos.reduce((mx, t) => Math.max(mx, t.order), -1);
    const rec: TodoRecord = {
      date: today,
      text: "",
      done: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    };
    const id = (await repos.todo.add(rec)) as number;
    const created = { ...rec, id };
    setTodos((prev) => [...prev, created]);
    requestAnimationFrame(() => inputRefs.current[id]?.focus());
  }

  async function toggleDone(t: TodoRecord) {
    if (t.id == null) return;
    const next = !t.done;
    await repos.todo.update(t.id, { done: next });
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: next } : x)));
  }

  async function editText(t: TodoRecord, text: string) {
    if (t.id == null) return;
    await repos.todo.update(t.id, { text });
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, text } : x)));
  }

  // 空内容待办（未输入即失焦）自动移除，避免残留空行
  async function removeIfEmpty(t: TodoRecord) {
    if (t.id == null) return;
    if (t.text.trim() === "") {
      await repos.todo.delete(t.id);
      setTodos((prev) => prev.filter((x) => x.id !== t.id));
    }
  }

  // 拖拽排序：在显示序列上移动，并重排 order（完成项始终沉底）
  async function moveItem(from: number, to: number) {
    const arr = [...sorted];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    arr.forEach((t, i) => (t.order = i));
    setTodos(arr);
    await Promise.all(
      arr.map((t) =>
        t.id != null ? repos.todo.update(t.id, { order: t.order }) : Promise.resolve()
      )
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="每日待办"
        desc="打钩完成自动沉底；跨天未完成自动保留，已完成次日清空。"
      />

      <Card>
        <CardContent>
          {/* 顶部加号按钮 */}
          <div className="mb-4">
            <Button variant="soft" size="sm" onClick={addTodo} className="gap-1">
              <Plus className="h-4 w-4" /> 新增待办
            </Button>
          </div>

          {sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-faint">
              还没有待办，点上方「新增待办」开始规划今天 ✦
            </p>
          ) : (
            <ul className="space-y-2">
              {sorted.map((t, idx) => (
                <li
                  key={t.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== idx)
                      moveItem(dragIndex, idx);
                    setDragIndex(null);
                  }}
                  className={
                    "flex items-center gap-2 rounded-2xl border px-2 py-2 transition duration-200 " +
                    (t.done
                      ? "border-line bg-line/20"
                      : "border-line bg-surface")
                  }
                >
                  {/* 拖拽手柄 */}
                  <span
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragEnd={() => setDragIndex(null)}
                    className="cursor-grab text-ink-faint hover:text-primary active:cursor-grabbing"
                    aria-label="拖拽排序"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>

                  {/* 复选框 */}
                  <button
                    type="button"
                    onClick={() => toggleDone(t)}
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition duration-200 " +
                      (t.done
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-surface text-transparent hover:border-primary/60")
                    }
                    aria-label={t.done ? "标记为未完成" : "标记为完成"}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>

                  {/* 文本输入 */}
                  <Input
                    ref={(el) => {
                      if (t.id != null) inputRefs.current[t.id] = el;
                    }}
                    value={t.text}
                    onChange={(e) => {
                      // 组合输入进行中交给浏览器处理，不在中途改写受控值，避免乱码
                      if (composingRef.current) return;
                      editText(t, sanitizeInput(e.target.value));
                    }}
                    onCompositionStart={() => {
                      composingRef.current = true;
                    }}
                    onCompositionEnd={(e) => {
                      composingRef.current = false;
                      editText(t, sanitizeInput(e.currentTarget.value));
                    }}
                    onBlur={() => removeIfEmpty(t)}
                    placeholder="要做的事…"
                    className={
                      "h-9 border-0 bg-transparent px-1 focus:bg-line/30 focus:ring-0 " +
                      (t.done ? "text-ink-faint line-through" : "text-ink")
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[12px] text-ink-faint">
            拖动左侧手柄可调整顺序；完成项自动沉到底部。第二天，已完成项清空、未完成项自动带到新的一天。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
