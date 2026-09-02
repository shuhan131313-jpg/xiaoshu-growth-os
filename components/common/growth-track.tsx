"use client";

import { motion } from "framer-motion";
import { GROWTH_TOTAL } from "@/lib/growth";

/**
 * 成长进度条（简笔画风）：底部土地轨道 + 拟人小树小人 + 右端写实浙大校门。
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

        {/* 浙大校门（写实线稿：台基 + 门柱 + 门楣匾额 + 中式瓦顶起翘） */}
        <g
          stroke="#1A3F90"
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {/* 台基 */}
          <rect x={866} y={142} width={32} height={8} rx={1.5} />
          <rect x={942} y={142} width={32} height={8} rx={1.5} />
          {/* 门柱（下宽上窄，带收分） */}
          <path d="M874,142 L879,84 L891,84 L896,142 Z" />
          <path d="M944,142 L949,84 L961,84 L966,142 Z" />
          {/* 柱身竖纹（石材质感） */}
          <path d="M885,142 L885,84" strokeWidth={1} />
          <path d="M955,142 L955,84" strokeWidth={1} />
          {/* 柱头 */}
          <rect x={872} y={78} width={26} height={7} rx={1.5} />
          <rect x={942} y={78} width={26} height={7} rx={1.5} />
          {/* 门楣横梁 */}
          <rect x={860} y={64} width={120} height={15} rx={2} />
          {/* 匾额（居中留白，校名置于图形下方不压框） */}
          <rect x={898} y={67} width={44} height={9} rx={2} strokeWidth={1.5} />
          {/* 屋檐：中式瓦顶 + 两端起翘 */}
          <path d="M852,64 C 874,52 896,45 920,45 C 944,45 966,52 988,64" />
          <path d="M852,64 L988,64" />
          <path d="M852,64 C 847,61 845,57 847,53" />
          <path d="M988,64 C 993,61 995,57 993,53" />
          {/* 屋脊与宝顶 */}
          <path d="M888,46 L952,46" strokeWidth={2} />
          <circle cx={920} cy={42} r={3.5} />
          {/* 瓦楞 */}
          <path d="M872,61 L872,56" strokeWidth={1} />
          <path d="M886,61 L886,51" strokeWidth={1} />
          <path d="M900,61 L900,48" strokeWidth={1} />
          <path d="M920,61 L920,46" strokeWidth={1} />
          <path d="M940,61 L940,48" strokeWidth={1} />
          <path d="M954,61 L954,51" strokeWidth={1} />
          <path d="M968,61 L968,56" strokeWidth={1} />
        </g>
        {/* 校名置于校门图形下方，不压门框 */}
        <text
          x={920}
          y={172}
          fontSize={13}
          fontWeight={700}
          fill="#1A3F90"
          textAnchor="middle"
        >
          浙大
        </text>

        {/* 拟人小树小人：有表情、有手脚的走路姿态 */}
        <motion.g
          initial={false}
          animate={{ x: treeX }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <g transform={`translate(0,${trackY})`}>
            <motion.g
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* 腿脚（走路姿态） */}
              <g stroke="#C9A43F" strokeWidth={2.6} strokeLinecap="round" fill="none">
                <path d="M-3,-13 L-8,-2" />
                <path d="M-11,-1 L-4,-1" />
                <path d="M3,-13 L8,-2" />
                <path d="M4,-1 L11,-1" />
              </g>
              {/* 手臂：左手挥手，右手自然伸出 */}
              <g stroke="#C9A43F" strokeWidth={2.4} strokeLinecap="round" fill="none">
                <path d="M-5,-29 C-12,-32 -15,-27 -16,-21" />
                <path d="M5,-29 C10,-27 12,-23 13,-19" />
              </g>
              {/* 身体 / 树干（暖黄） */}
              <rect x={-5} y={-38} width={10} height={27} rx={5} fill="#C9A43F" />
              {/* 头顶小芽，保留小树特征 */}
              <path
                d="M0,-64 C1,-70 3,-72 7,-72"
                stroke="#1A3F90"
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
              />
              {/* 两侧叶簇（像耳朵/头发，更拟人） */}
              <circle cx={-13} cy={-57} r={7} fill="#1A3F90" fillOpacity={0.7} />
              <circle cx={13} cy={-57} r={6.5} fill="#1A3F90" fillOpacity={0.7} />
              {/* 头 / 树冠（克莱因蓝） */}
              <circle cx={0} cy={-50} r={16} fill="#1A3F90" fillOpacity={0.92} />
              <circle
                cx={0}
                cy={-50}
                r={16}
                fill="none"
                stroke="#122C66"
                strokeWidth={1.5}
              />
              {/* 表情：眼睛 + 腮红 + 微笑 */}
              <circle cx={-6} cy={-52} r={2.6} fill="#FFFFFF" />
              <circle cx={6} cy={-52} r={2.6} fill="#FFFFFF" />
              <circle cx={-10.5} cy={-46} r={2.4} fill="#E6C260" fillOpacity={0.9} />
              <circle cx={10.5} cy={-46} r={2.4} fill="#E6C260" fillOpacity={0.9} />
              <path
                d="M-5,-45 Q0,-40 5,-45"
                stroke="#FFFFFF"
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
              />
            </motion.g>
          </g>
        </motion.g>
      </svg>
      <p className="mt-1 text-center text-[11px] text-ink-faint">
        小树正在一步一步，走向浙大校门 🌿
      </p>
    </div>
  );
}
