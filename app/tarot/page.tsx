"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronUp, Clock3, Eye, RotateCcw, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getTarotCard, TAROT_CARDS, type TarotCard } from "@/lib/tarot-data";
import { dueReviewCount, getTarotProgress, masteryCount, nextReviewAtFor, saveTarotProgress, type TarotProgress, type TarotRecallRating } from "@/lib/tarot";

const FILTERS = [
  ["all", "全部"], ["major", "大阿尔卡那"], ["wands", "权杖"], ["cups", "圣杯"], ["swords", "宝剑"], ["pentacles", "星币"],
] as const;

function statusLabel(status?: string): string {
  return status === "mastered" ? "已掌握" : status === "due" ? "待复习" : status === "learning" ? "学习中" : "未学习";
}

function statusClass(status?: string): string {
  return status === "mastered" ? "bg-[#FFF4C7] text-[#806B20]" : status === "due" ? "bg-[#F4EEE5] text-[#866C4E]" : status === "learning" ? "bg-[#E7F0FA] text-primary" : "bg-line/50 text-ink-faint";
}

function CardImage({ card, large = false }: { card: TarotCard; large?: boolean }) {
  if (card.image) return <img src={card.image} alt={`${card.chineseName} ${card.englishName}`} className={`${large ? "h-80" : "h-28"} w-auto rounded-lg object-contain shadow-sm`} />;
  return <div className={`${large ? "h-80 w-52" : "h-28 w-20"} flex items-center justify-center rounded-lg border border-line bg-[#F7F7F5] text-center text-xs text-ink-faint`}>牌面待补充</div>;
}

function updateCardProgress(progress: TarotProgress, cardId: string, rating?: TarotRecallRating): TarotProgress {
  const current = progress.cards[cardId] ?? { status: "learning" as const, reviewCount: 0 };
  const now = Date.now();
  const next = rating ? {
    ...current,
    status: rating === "remembered" ? "mastered" as const : rating === "fuzzy" ? "due" as const : "learning" as const,
    reviewCount: current.reviewCount + 1,
    recallRating: rating,
    lastReviewedAt: now,
    nextReviewAt: nextReviewAtFor(rating, now, current.reviewCount),
  } : {
    ...current,
    status: current.status === "new" ? "learning" as const : current.status,
    learnedAt: current.learnedAt ?? now,
  };
  return { ...progress, cards: { ...progress.cards, [cardId]: next } };
}

export default function TarotPage() {
  const [progress, setProgress] = useState<TarotProgress>({ cards: {}, notes: {}, recallAnswers: {} });
  const [selectedId, setSelectedId] = useState("major-00");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [search, setSearch] = useState("");
  const [showDeck, setShowDeck] = useState(false);
  const [showStudy, setShowStudy] = useState(true);
  const [recall, setRecall] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<number, string>>({});
  const [exerciseSubmitted, setExerciseSubmitted] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [ready, setReady] = useState(false);
  const card = getTarotCard(selectedId) ?? TAROT_CARDS[0];

  useEffect(() => {
    getTarotProgress().then((next) => {
      setProgress(next);
      const firstDue = TAROT_CARDS.find((item) => next.cards[item.id]?.nextReviewAt && next.cards[item.id].nextReviewAt! <= Date.now());
      const firstUnlearned = TAROT_CARDS.find((item) => !next.cards[item.id]);
      setSelectedId(firstDue?.id ?? firstUnlearned?.id ?? "major-00");
      setReady(true);
    });
  }, []);

  useEffect(() => {
    setRecall(progress.recallAnswers[selectedId] ?? "");
    setShowAnswer(false);
    setExerciseAnswers({});
    setExerciseSubmitted({});
  }, [selectedId, progress.recallAnswers]);

  const visibleCards = useMemo(() => TAROT_CARDS.filter((item) =>
    (filter === "all" || item.section === filter) && `${item.chineseName}${item.englishName}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [filter, search]);
  const currentProgress = progress.cards[card.id];
  const studiedCount = Object.keys(progress.cards).length;
  const dueCount = dueReviewCount(progress);
  const mastered = masteryCount(progress);
  const note = progress.notes[card.id] ?? {};

  async function persist(next: TarotProgress, message?: string) {
    setProgress(next);
    await saveTarotProgress(next);
    if (message) {
      setFeedback(message);
      window.setTimeout(() => setFeedback(""), 2200);
    }
  }

  async function startCard() {
    await persist(updateCardProgress(progress, card.id), "已记录本次学习");
  }

  async function saveRecall(rating: TarotRecallRating) {
    const next = updateCardProgress({ ...progress, recallAnswers: { ...progress.recallAnswers, [card.id]: recall } }, card.id, rating);
    await persist(next, rating === "remembered" ? "已标记为真正记住" : rating === "fuzzy" ? "已安排较近复习" : "会优先重新练习");
    setShowAnswer(true);
  }

  async function saveNote(field: "symbols" | "upright" | "reversed" | "cases", value: string) {
    const next = { ...progress, notes: { ...progress.notes, [card.id]: { ...note, [field]: value } } };
    setProgress(next);
    await saveTarotProgress(next);
  }

  return (
    <div className="space-y-7">
      <PageHeader title="塔罗学习" desc="观察牌面，理解象征，再通过回忆与复习真正记住。" />

      <div className="grid grid-cols-3 gap-2 border-y border-line py-4 text-center">
        <div><p className="tabular text-xl font-semibold text-primary">{studiedCount} / 78</p><p className="mt-1 text-xs text-ink-faint">已学习</p></div>
        <div><p className="tabular text-xl font-semibold text-primary">{dueCount}</p><p className="mt-1 text-xs text-ink-faint">今日待复习</p></div>
        <div><p className="tabular text-xl font-semibold text-primary">{mastered}</p><p className="mt-1 text-xs text-ink-faint">已掌握</p></div>
      </div>

      <section className="border-b border-line pb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint">继续学习</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{card.number != null ? `${card.number} · ` : ""}{card.chineseName}</h2>
            <p className="text-sm text-ink-soft">{card.englishName}</p>
          </div>
          <CardImage card={card} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-faint"><span>观察牌面</span><span>→</span><span>理解象征</span><span>→</span><span>正逆位</span><span>→</span><span>主动回忆</span></div>
        <Button variant="accent" className="mt-4" onClick={() => { setShowStudy(true); void startCard(); }}>{currentProgress ? "继续学习" : "开始学习"}</Button>
      </section>

      <section className="space-y-3">
        <button type="button" onClick={() => setShowStudy((value) => !value)} className="flex w-full items-center justify-between text-left">
          <span className="flex items-center gap-2 text-base font-semibold text-ink"><Eye className="h-4 w-4 text-primary" />当前课程</span>
          {showStudy ? <ChevronUp className="h-4 w-4 text-ink-faint" /> : <ChevronDown className="h-4 w-4 text-ink-faint" />}
        </button>
        {showStudy && <Course card={card} recall={recall} setRecall={setRecall} showAnswer={showAnswer} setShowAnswer={setShowAnswer} exerciseAnswers={exerciseAnswers} setExerciseAnswers={setExerciseAnswers} exerciseSubmitted={exerciseSubmitted} setExerciseSubmitted={setExerciseSubmitted} note={note} onSaveNote={saveNote} onRate={saveRecall} />}
      </section>

      <section className="border-t border-line pt-5">
        <button type="button" onClick={() => setShowDeck((value) => !value)} className="flex w-full items-center justify-between text-left">
          <span className="flex items-center gap-2 text-base font-semibold text-ink"><BookOpen className="h-4 w-4 text-primary" />78 张牌图鉴</span>
          {showDeck ? <ChevronUp className="h-4 w-4 text-ink-faint" /> : <ChevronDown className="h-4 w-4 text-ink-faint" />}
        </button>
        {showDeck && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">{FILTERS.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${filter === value ? "border-primary bg-primary text-white" : "border-line text-ink-soft"}`}>{label}</button>)}</div>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-faint" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="搜索牌名" /></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleCards.map((item) => { const itemStatus = progress.cards[item.id]?.status; return <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setShowStudy(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-2 rounded-lg border border-line p-2 text-left transition hover:bg-line/30"><CardImage card={item} /><span className="min-w-0"><span className="block truncate text-xs font-medium text-ink">{item.number != null ? `${item.number} · ` : ""}{item.chineseName}</span><span className="mt-1 block truncate text-[10px] text-ink-faint">{item.englishName}</span><span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] ${statusClass(itemStatus)}`}>{statusLabel(itemStatus)}</span></span></button>; })}
            </div>
          </div>
        )}
      </section>

      {feedback && <p className="rounded-lg bg-[#F2F2F0] px-3 py-2 text-center text-xs text-ink-soft" role="status">{feedback}</p>}
      {!ready && <p className="text-center text-xs text-ink-faint">正在加载学习进度…</p>}
    </div>
  );
}

function Course({ card, recall, setRecall, showAnswer, setShowAnswer, exerciseAnswers, setExerciseAnswers, exerciseSubmitted, setExerciseSubmitted, note, onSaveNote, onRate }: {
  card: TarotCard;
  recall: string;
  setRecall: (value: string) => void;
  showAnswer: boolean;
  setShowAnswer: (value: boolean) => void;
  exerciseAnswers: Record<number, string>;
  setExerciseAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  exerciseSubmitted: Record<number, boolean>;
  setExerciseSubmitted: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  note: { symbols?: string; upright?: string; reversed?: string; cases?: string };
  onSaveNote: (field: "symbols" | "upright" | "reversed" | "cases", value: string) => void;
  onRate: (rating: TarotRecallRating) => void;
}) {
  if (!card.lesson) return <Card><CardContent><p className="text-sm text-ink-soft">这张牌已加入 78 张牌索引。完整课程会按学习顺序逐步补充，目前先从「愚人」建立内容模板。</p></CardContent></Card>;
  const lesson = card.lesson;
  return <div className="space-y-5">
    <div className="flex flex-col items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 text-center"><CardImage card={card} large /><p className="max-w-prose text-sm leading-6 text-ink-soft">{lesson.scene}</p>{card.source && <p className="text-[10px] text-ink-faint">{card.source}</p>}</div>
    <Section title="1 · 认识牌面" icon={<Eye className="h-4 w-4" />}><div className="space-y-2">{lesson.observationPrompts.map((prompt) => <p key={prompt} className="border-l-2 border-[#C9D5E3] pl-3 text-sm text-ink-soft">{prompt}</p>)}</div></Section>
    <Section title="2 · 理解图像象征" icon={<Sparkles className="h-4 w-4" />}><div className="space-y-3">{lesson.symbols.map((symbol) => <div key={symbol.id} className="border-b border-line pb-3 last:border-0"><h3 className="font-medium text-ink">{symbol.name}</h3><p className="mt-1 text-sm leading-6 text-ink-soft"><strong>观察：</strong>{symbol.observation}</p><p className="text-sm leading-6 text-ink-soft"><strong>象征来源：</strong>{symbol.source}</p><p className="text-sm leading-6 text-ink-soft"><strong>结合牌面：</strong>{symbol.connection}</p><p className="mt-1 text-xs text-primary">记忆关键词：{symbol.keyword}</p></div>)}</div><NoteField value={note.symbols ?? ""} onSave={(value) => onSaveNote("symbols", value)} placeholder="写下你对这些象征的个人联想…" /></Section>
    <Section title="3 · 理解正位" icon={<Check className="h-4 w-4" />}><p className="text-lg font-semibold text-ink">{lesson.upright.core}</p><p className="mt-2 text-sm leading-6 text-ink-soft">{lesson.upright.story}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Info title="主要关键词" value={lesson.upright.keywords.join("、")} /><Info title="积极表达" value={lesson.upright.positive} /><Info title="潜在风险" value={lesson.upright.risk} /><Info title="现实情境" value={lesson.upright.example} /></div><NoteField value={note.upright ?? ""} onSave={(value) => onSaveNote("upright", value)} placeholder="写下你自己的正位理解…" /></Section>
    <Section title="4 · 理解逆位" icon={<RotateCcw className="h-4 w-4" />}><p className="text-sm leading-6 text-ink-soft">{lesson.reversed.explanation}</p><div className="mt-3 space-y-2">{lesson.reversed.pathways.map((path) => <p key={path} className="rounded-lg bg-[#F7F7F5] px-3 py-2 text-sm text-ink-soft">{path}</p>)}</div><NoteField value={note.reversed ?? ""} onSave={(value) => onSaveNote("reversed", value)} placeholder="写下你自己的逆位推导…" /></Section>
    <Section title="5 · 交互练习" icon={<BookOpen className="h-4 w-4" />}><div className="space-y-4">{lesson.exercises.map((exercise, index) => <div key={exercise.prompt} className="rounded-lg border border-line p-3"><p className="text-sm font-medium text-ink">{exercise.prompt}</p><div className="mt-2 space-y-1.5">{exercise.options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft"><input type="radio" name={`exercise-${index}`} value={option} checked={exerciseAnswers[index] === option} onChange={() => setExerciseAnswers((current) => ({ ...current, [index]: option }))} />{option}</label>)}</div><Button variant="soft" className="mt-3 h-8 text-xs" onClick={() => setExerciseSubmitted((current) => ({ ...current, [index]: true }))} disabled={!exerciseAnswers[index]}>检查答案</Button>{exerciseSubmitted[index] && <p className={`mt-2 text-xs leading-5 ${exerciseAnswers[index] === exercise.answer ? "text-[#557A5D]" : "text-[#866C4E]"}`}>{exerciseAnswers[index] === exercise.answer ? "回答符合推导" : `参考答案：${exercise.answer}`} · {exercise.explanation}</p>}</div>)}</div></Section>
    <Section title="6 · 主动回忆" icon={<Clock3 className="h-4 w-4" />}><p className="text-sm text-ink-soft">先不看答案，尽量用自己的话回答：</p><div className="mt-2 space-y-1.5">{lesson.recallPrompts.map((prompt) => <p key={prompt} className="text-sm text-ink-soft">· {prompt}</p>)}</div><textarea value={recall} onChange={(event) => setRecall(event.target.value)} className="mt-3 min-h-32 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary" placeholder="先写下你记得的内容，再查看参考答案…" />{!showAnswer ? <Button variant="soft" className="mt-2" onClick={() => setShowAnswer(true)} disabled={!recall.trim()}>查看参考答案</Button> : <div className="mt-3 space-y-3 rounded-xl bg-[#F7F7F5] p-3"><p className="text-sm leading-6 text-ink-soft"><strong>你的答案：</strong>{recall}</p><p className="text-sm leading-6 text-ink-soft"><strong>参考答案：</strong>{lesson.referenceAnswer}</p><p className="text-xs text-ink-faint">请按自己的实际记忆选择反馈，系统会据此安排下一次复习。</p><div className="flex flex-wrap gap-2"><Button variant="soft" className="h-8 text-xs" onClick={() => onRate("forgot")}>没记住</Button><Button variant="soft" className="h-8 text-xs" onClick={() => onRate("fuzzy")}>有点模糊</Button><Button variant="accent" className="h-8 text-xs" onClick={() => onRate("remembered")}>真正记住了</Button></div></div>}</Section>
    <Section title="学习笔记" icon={<BookOpen className="h-4 w-4" />}><NoteField value={note.cases ?? ""} onSave={(value) => onSaveNote("cases", value)} placeholder="记录容易混淆的地方、案例或自己的总结…" /></Section>
  </div>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="border-t border-line pt-4"><h2 className="flex items-center gap-2 text-base font-semibold text-ink">{icon}{title}</h2><div className="mt-3">{children}</div></section>; }
function Info({ title, value }: { title: string; value: string }) { return <div className="rounded-lg bg-[#F7F7F5] p-3"><p className="text-xs font-medium text-primary">{title}</p><p className="mt-1 text-sm leading-6 text-ink-soft">{value}</p></div>; }
function NoteField({ value, onSave, placeholder }: { value: string; onSave: (value: string) => void; placeholder: string }) { const [draft, setDraft] = useState(value); useEffect(() => setDraft(value), [value]); return <div className="mt-3"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft !== value) onSave(draft); }} className="min-h-20 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary" placeholder={placeholder} /><p className="mt-1 text-[10px] text-ink-faint">离开输入框自动保存</p></div>; }

