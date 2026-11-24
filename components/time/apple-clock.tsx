"use client";

import type { DisplayTimeBlock } from "@/lib/time-blocks";
import { TIME_BLOCK_COLORS } from "@/lib/time-blocks";

function polar(minute: number, radius: number): [number, number] {
  const angle = (minute / 1440) * Math.PI * 2 - Math.PI / 2;
  return [130 + Math.cos(angle) * radius, 130 + Math.sin(angle) * radius];
}

function sectorPath(startMinute: number, endMinute: number, radius: number): string {
  const [sx, sy] = polar(startMinute, radius);
  const [ex, ey] = polar(endMinute, radius);
  const delta = endMinute - startMinute;
  const largeArc = delta > 720 ? 1 : 0;
  return `M 130 130 L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`;
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
      <circle cx="130" cy="130" r="94" fill="#F5F8FB" stroke="#4E7BAA" strokeWidth="3" />

      {blocks.flatMap((block) => normalizedSegments(block.startMinute, block.endMinute).map(([start, end], index) => (
        <path
          key={`${block.id}-${index}`}
          d={sectorPath(start, end, 92)}
          fill={TIME_BLOCK_COLORS[block.kind]}
          // 使用不透明扇形：同一类别的重叠时间会自然连成一块，不会叠加变深。
          opacity="1"
        />
      )))}

      {Array.from({ length: 24 }, (_, index) => {
        const minute = index * 60;
        const [x1, y1] = polar(minute, 88);
        const [x2, y2] = polar(minute, 94);
        const [tx, ty] = polar(minute, 108);
        return (
          <g key={index}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4E7BAA" strokeWidth={index % 6 === 0 ? 2 : 1.2} strokeLinecap="round" />
            <text x={tx} y={ty + 3} textAnchor="middle" fontSize={index % 6 === 0 ? 9 : 8} fill="#38506B">{index}</text>
          </g>
        );
      })}
      <circle cx="130" cy="130" r="3" fill="#38506B" />
    </svg>
  );
}

export function AppleClockIcon() {
  return <AppleClock compact />;
}
