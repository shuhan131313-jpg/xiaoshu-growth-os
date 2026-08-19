import { Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ComingSoon({ title }: { title: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
        <Leaf className="h-6 w-6" />
      </div>
      <p className="text-sm text-ink-soft">{title} · 模块建设中</p>
      <p className="text-xs text-ink-faint">将在对应开发阶段完成</p>
    </Card>
  );
}
