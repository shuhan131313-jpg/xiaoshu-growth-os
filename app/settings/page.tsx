"use client";

import { useEffect, useState } from "react";
import { Download, Upload, KeyRound, Leaf, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { exportAll, importAll, downloadBackup, pickBackupFile } from "@/lib/backup";
import { repos } from "@/lib/db/repo";

export default function SettingsPage() {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [provider, setProvider] = useState("DeepSeek");
  const [apiKey, setApiKey] = useState("");
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    repos.settings
      .all()
      .then((rows) => {
        const row = rows.find((r) => r.key === "aiProvider");
        if (row && row.value) {
          const v = row.value as { provider?: string; apiKey?: string };
          if (v.provider) setProvider(v.provider);
          if (v.apiKey) setApiKey(v.apiKey);
        }
      })
      .catch(() => {});
  }, []);

  function flash(text: string, isErr = false) {
    setErr("");
    setMsg("");
    if (isErr) setErr(text);
    else setMsg(text);
    setTimeout(() => {
      setMsg("");
      setErr("");
    }, 3000);
  }

  async function onExport() {
    const json = await exportAll();
    downloadBackup(json);
    flash("已导出备份文件");
  }

  async function onImport() {
    const json = await pickBackupFile();
    if (!json) return;
    if (!window.confirm("导入将覆盖当前所有本地数据，确定继续吗？")) return;
    try {
      await importAll(json);
      flash("已从备份恢复");
    } catch (e) {
      flash("导入失败：文件格式不正确", true);
    }
  }

  async function saveAi() {
    const value = { provider, apiKey: apiKey.trim() };
    const existing = await repos.settings
      .all()
      .then((rows) => rows.find((r) => r.key === "aiProvider"));
    if (existing?.id != null) {
      await repos.settings.update(existing.id, { value });
    } else {
      await repos.settings.add({ key: "aiProvider", value });
    }
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="设置" desc="数据都在你本机，这里负责备份与偏好" />

      {/* 数据备份 */}
      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-primary">数据备份</p>
          <p className="text-[13px] leading-6 text-ink-soft">
            所有记录保存在浏览器 IndexedDB，断网也能用。建议定期导出一份 JSON
            备份，换设备或清缓存前务必先导出。
          </p>
          <div className="flex gap-3">
            <Button variant="accent" className="flex-1" onClick={onExport}>
              <Download className="h-4 w-4" /> 导出备份
            </Button>
            <Button variant="outline" className="flex-1" onClick={onImport}>
              <Upload className="h-4 w-4" /> 导入恢复
            </Button>
          </div>
          {msg && (
            <p className="flex items-center gap-1 text-sm text-accent-dark">
              <Check className="h-4 w-4" /> {msg}
            </p>
          )}
          {err && (
            <p className="flex items-center gap-1 text-sm text-primary">
              <AlertTriangle className="h-4 w-4" /> {err}
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI 设置（预留） */}
      <Card>
        <CardContent className="space-y-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <KeyRound className="h-4 w-4 text-primary" /> AI 设置（可选 · 二期启用）
          </p>
          <p className="text-[13px] leading-6 text-ink-soft">
            首期 AI 由本地内容池提供，无需联网。若填入 API Key，二期开启真实模型后，
            书摘、英文、文献与复盘将升级为实时生成（Key 仅存于本机）。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>服务商</Label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option>DeepSeek</option>
                <option>OpenAI</option>
                <option>通义千问</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          </div>
          <Button variant="soft" className="w-full" onClick={saveAi}>
            {aiSaved ? "已保存" : "保存 AI 配置"}
          </Button>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Leaf className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold text-ink">小树 · Personal Growth OS</p>
              <p className="text-xs text-ink-faint">
                轻量化个人成长工作台 · v1.0
              </p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-ink-soft">
            服务学习、科研与日常习惯记录。本地优先、离线可用、隐私安全。
            技术栈：Next.js · TypeScript · Tailwind · Dexie(IndexedDB) · PWA。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
