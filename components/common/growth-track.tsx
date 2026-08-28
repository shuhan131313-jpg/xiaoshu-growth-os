"use client";

import { motion } from "framer-motion";
import { GROWTH_TOTAL } from "@/lib/growth";

/**
 * 成长进度条（简笔画风）：底部土地轨道 + 小树小人 + 右端浙大校门。
 * 树的位置由已完成步数 step（0..200）决定，越靠近右端越接近浙大。
 */
export function GrowthTrack({ step }: { step: number }) {
  const frac = Math.max(0, Math.min(1, step / GROWTH_TOTAL));
  const X0 = 60; // 起跑线
  const X1 = 920; // 校门处
  const trackY = 150; // 地面线
  const treeX = X0 + frac * (X1 - X0);

  return (
    <div className="mb-5">
      <svg
        viewBox="0 0 1000 180"
        className="w-full"
        role="img"
        aria-label="成长进度：小树逐步走向浙大校门"
      >
        {/* 土地填充 */}
        <path
          d={`M${X0 - 10},${trackY} C 160,134 260,166 360,150 S 560,134 660,150 S 860,166 970,150 L 970,178 L ${X0 - 10},178 Z`}
          fill="#1A3F90"
          fillOpacity={0.08}
        />
        {/* 轨道线 */}
        <path
          d={`M${X0 - 10},${trackY} C 160,134 260,166 360,150 S 560,134 660,150 S 860,166 970,150`}
          fill="none"
          stroke="#1A3F90"
          strokeOpacity={0.55}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* 起点小标 */}
        <text x={X0 - 6} y={trackY + 18} fontSize={12} fill="#9AA1A8" textAnchor="start">
          出发
        </text>

        {/* 浙大校门（简笔画） */}
        <g stroke="#1A3F90" strokeWidth={3} fill="none" strokeLinejoin="round">
          {/* 门柱 */}
          <rect x={888} y={70} width={12} height={80} rx={2} />
          <rect x={950} y={70} width={12} height={80} rx={2} />
          {/* 门楣 */}
          <rect x={876} y={58} width={96} height={16} rx={3} />
          {/* 屋顶坡面 */}
          <path d="M866,58 L934,30 L1002,58" />
        </g>
        <text
          x={894}
          y={112}
          fontSize={15}
          fontWeight={700}
          fill="#1A3F90"
          textAnchor="middle"
        >
          浙大
        </text>

        {/* 小树小人 */}
        <motion.g
          initial={false}
          animate={{ x: treeX }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <g transform={`translate(0,${trackY})`}>
            {/* 树干（暖黄） */}
            <rect x={-3} y={-36} width={6} height={36} rx={3} fill="#C9A43F" />
            {/* 树冠（克莱因蓝） */}
            <circle cx={0} cy={-46} r={17} fill="#1A3F90" fillOpacity={0.9} />
            <circle cx={0} cy={-46} r={17} fill="none" stroke="#122C66" strokeWidth={1.5} />
            {/* 高光小叶 */}
            <circle cx={-9} cy={-52} r={7} fill="#1A3F90" fillOpacity={0.55} />
            <circle cx={9} cy={-38} r={6} fill="#1A3F90" fillOpacity={0.55} />
          </g>
        </motion.g>
      </svg>
      <p className="mt-1 text-center text-[11px] text-ink-faint">
        小树正在一步一步，走向浙大校门 🌿
      </p>
    </div>
  );
}
