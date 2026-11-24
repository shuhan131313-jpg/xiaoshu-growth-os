"use client";

import type { DisplayTimeBlock } from "@/lib/time-blocks";
import { TIME_BLOCK_COLORS } from "@/lib/time-blocks";

function polar(minute: number, radius: number): [number, number] {
  const angle = (minute / 1440) * Math.PI * 2 - Math.PI / 2;
  return [130 + Math.cos(angle) * radius, 130 + Math.sin(angle) * radius];
}

function arcPath(startMinute: number, endMinute: number, radius: number): string {
  const [sx, sy] = polar(startMinute, radius);
  const [ex, ey] = polar(endMinute, radius);
  const delta = endMinute - startMinute;
  const largeArc = delta > 720 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function normalizedSegments(startMinute: number, endMinute: number): [number, number][] {
  const start = ((startMinute % 1440) + 1440) % 1440;
  const end = ((endMinute % 1440) + 1440) % 1440;
  if (end >= start) return [[start, end]];
  return [[start, 1440], [0, end]];
}

export function AppleClock({ blocks = [], compact = false }: { blocks?: DisplayTimeBlock[]; compact?: boolean }) {
  const size = compact ? 74 : 276;
  return (
    <svg
      viewBox="0 0 260 260"
      width={size}
      height={size}
      role="img"
      aria-label="24小时苹果时钟"
      className="shrink-0"
    >
      <path d="M130 51 C107 36 74 49 68 83 C61 120 82 171 130 194 C178 171 199 120 192 83 C186 49 153 36 130 51Z" fill="#FFFDF8" stroke="#6D5B4D" strokeWidth="3" />
      <path d="M127 49 C124 35 127 24 136 15" fill="none" stroke="#6D5B4D" strokeLinecap="round" strokeWidth="4" />
      <path d="M134 25 C147 14 162 18 167 29 C153 35 143 33 134 25Z" fill="#B6C982" stroke="#6D5B4D" strokeWidth="2.5" />

      {blocks.flatMap((block) => normalizedSegments(block.startMinute, block.endMinute).map(([start, end], index) => (
        <path
          key={`${block.id}-${index}`}
          d={arcPath(start, end, 93)}
          fill="none"
          stroke={TIME_BLOCK_COLORS[block.kind]}
          strokeLinecap="round"
          strokeWidth="12"
          opacity="0.9"
        />
      )))}

      <circle cx="130" cy="123" r="60" fill="#FFFDF8" stroke="#D8D2C8" strokeWidth="1.5" />
      {Array.from({ length: 24 }, (_, index) => {
        const minute = index * 60;
        const [x1, y1] = polar(minute, 78);
        const [x2, y2] = polar(minute, index % 6 === 0 ? 88 : 84);
        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8C8F8A" strokeWidth={index % 6 === 0 ? 2 : 1} strokeLinecap="round" />;
      })}
      <circle cx="116" cy="119" r="3" fill="#6D5B4D" />
      <circle cx="144" cy="119" r="3" fill="#6D5B4D" />
      <path d="M119 136 Q130 145 141 136" fill="none" stroke="#6D5B4D" strokeLinecap="round" strokeWidth="2.5" />
      {!compact && <text x="130" y="224" textAnchor="middle" fontSize="10" fill="#7B7E7A">24 小时</text>}
    </svg>
  );
}

export function AppleClockIcon() {
  return <AppleClock compact />;
}
