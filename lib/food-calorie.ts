export interface FoodCalorieEntry {
  aliases: string[];
  kcalPer100: number;
  liquid?: boolean;
  /** 未写数量时采用的普通一份；只用于粗略估算。 */
  defaultAmount: number;
  defaultUnit: "g" | "ml";
  portions?: Partial<Record<"个" | "只" | "根" | "片" | "碗" | "杯" | "勺" | "块", number>>;
}

/** 常见食品的粗略平均值；只用于“≈”估算，不替代包装或食品成分表。 */
export const FOOD_CALORIE_DATABASE: readonly FoodCalorieEntry[] = [
  { aliases: ["熟米饭", "米饭"], kcalPer100: 116, defaultAmount: 150, defaultUnit: "g", portions: { 碗: 150 } },
  { aliases: ["生米", "大米"], kcalPer100: 346, defaultAmount: 75, defaultUnit: "g", portions: { 碗: 75 } },
  { aliases: ["面条", "挂面", "拌面"], kcalPer100: 110, defaultAmount: 200, defaultUnit: "g", portions: { 碗: 200 } },
  { aliases: ["馒头"], kcalPer100: 223, defaultAmount: 80, defaultUnit: "g", portions: { 个: 80 } },
  { aliases: ["包子"], kcalPer100: 220, defaultAmount: 100, defaultUnit: "g", portions: { 个: 100 } },
  { aliases: ["面包", "吐司"], kcalPer100: 265, defaultAmount: 35, defaultUnit: "g", portions: { 片: 35 } },
  { aliases: ["燕麦"], kcalPer100: 380, defaultAmount: 30, defaultUnit: "g", portions: { 杯: 30, 勺: 10 } },
  { aliases: ["鸡蛋", "蛋"], kcalPer100: 144, defaultAmount: 50, defaultUnit: "g", portions: { 个: 50, 只: 50 } },
  { aliases: ["牛奶"], kcalPer100: 54, liquid: true, defaultAmount: 250, defaultUnit: "ml", portions: { 杯: 250 } },
  { aliases: ["酸奶"], kcalPer100: 72, liquid: true, defaultAmount: 200, defaultUnit: "ml", portions: { 杯: 200 } },
  { aliases: ["豆浆"], kcalPer100: 31, liquid: true, defaultAmount: 250, defaultUnit: "ml", portions: { 杯: 250 } },
  { aliases: ["豆腐"], kcalPer100: 81, defaultAmount: 100, defaultUnit: "g", portions: { 块: 100 } },
  { aliases: ["鸡胸肉", "鸡肉"], kcalPer100: 167, defaultAmount: 100, defaultUnit: "g", portions: { 块: 100 } },
  { aliases: ["猪肉"], kcalPer100: 242, defaultAmount: 100, defaultUnit: "g", portions: { 块: 100 } },
  { aliases: ["牛肉"], kcalPer100: 250, defaultAmount: 100, defaultUnit: "g", portions: { 块: 100 } },
  { aliases: ["鱼", "鱼肉"], kcalPer100: 120, defaultAmount: 100, defaultUnit: "g", portions: { 块: 100 } },
  { aliases: ["虾", "虾仁"], kcalPer100: 93, defaultAmount: 100, defaultUnit: "g", portions: { 个: 20, 只: 20 } },
  { aliases: ["苹果"], kcalPer100: 53, defaultAmount: 200, defaultUnit: "g", portions: { 个: 200, 只: 200 } },
  { aliases: ["香蕉"], kcalPer100: 93, defaultAmount: 120, defaultUnit: "g", portions: { 个: 120, 根: 120 } },
  { aliases: ["橙子", "橘子"], kcalPer100: 48, defaultAmount: 180, defaultUnit: "g", portions: { 个: 180 } },
  { aliases: ["西瓜"], kcalPer100: 31, defaultAmount: 300, defaultUnit: "g", portions: { 碗: 300 } },
  { aliases: ["土豆"], kcalPer100: 77, defaultAmount: 150, defaultUnit: "g", portions: { 个: 150 } },
  { aliases: ["番茄", "西红柿"], kcalPer100: 18, defaultAmount: 150, defaultUnit: "g", portions: { 个: 150 } },
  { aliases: ["黄瓜"], kcalPer100: 15, defaultAmount: 150, defaultUnit: "g", portions: { 根: 150 } },
  { aliases: ["青菜", "白菜", "生菜"], kcalPer100: 20, defaultAmount: 200, defaultUnit: "g", portions: { 碗: 200 } },
  { aliases: ["饼干", "小饼干", "曲奇"], kcalPer100: 480, defaultAmount: 30, defaultUnit: "g", portions: { 片: 10, 块: 10 } },
  { aliases: ["蛋糕"], kcalPer100: 350, defaultAmount: 80, defaultUnit: "g", portions: { 块: 80 } },
  { aliases: ["薯片"], kcalPer100: 530, defaultAmount: 50, defaultUnit: "g" },
  { aliases: ["巧克力"], kcalPer100: 550, defaultAmount: 20, defaultUnit: "g", portions: { 块: 10 } },
  { aliases: ["坚果"], kcalPer100: 600, defaultAmount: 20, defaultUnit: "g", portions: { 勺: 10 } },
  { aliases: ["可乐", "汽水"], kcalPer100: 42, liquid: true, defaultAmount: 250, defaultUnit: "ml", portions: { 杯: 250 } },
  { aliases: ["果汁"], kcalPer100: 45, liquid: true, defaultAmount: 250, defaultUnit: "ml", portions: { 杯: 250 } },
];

export interface FoodCalorieEstimate {
  kcal: number | null;
  matched: string[];
  partial: boolean;
}

function chineseNumber(value: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
  const map: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (value === "半") return 0.5;
  return map[value] ?? null;
}

function parseQuantity(text: string, entry: FoodCalorieEntry): { amount: number; unit: string } | null {
  const match = text.match(/(\d+(?:\.\d+)?|半|一|二|两|三|四|五|六|七|八|九|十)\s*(公斤|千克|kg|克|g|毫升|ml|个|只|根|片|碗|杯|勺|块)/i);
  if (!match) return null;
  const amount = chineseNumber(match[1]);
  if (amount == null) return null;
  return { amount, unit: match[2].toLowerCase() };
}

function caloriesForQuantity(entry: FoodCalorieEntry, quantity: { amount: number; unit: string }): number | null {
  const { amount, unit } = quantity;
  if (["克", "g"].includes(unit)) return entry.kcalPer100 * amount / 100;
  if (["公斤", "千克", "kg"].includes(unit)) return entry.kcalPer100 * amount * 10;
  if (["毫升", "ml"].includes(unit)) return entry.liquid ? entry.kcalPer100 * amount / 100 : null;
  const portionGrams = entry.portions?.[unit as keyof NonNullable<FoodCalorieEntry["portions"]>];
  return portionGrams ? entry.kcalPer100 * amount * portionGrams / 100 : null;
}

function caloriesForDefault(entry: FoodCalorieEntry): number {
  return entry.kcalPer100 * entry.defaultAmount / 100;
}

export function estimateFoodCalories(content: string): FoodCalorieEstimate {
  const text = content.trim().toLowerCase();
  if (!text || text === "蛋白质达标" || text === "水达标") return { kcal: null, matched: [], partial: false };
  const candidates = FOOD_CALORIE_DATABASE.flatMap((entry) => entry.aliases.map((alias) => ({ entry, alias })))
    .sort((left, right) => right.alias.length - left.alias.length);
  const usedRanges: [number, number][] = [];
  const matched: string[] = [];
  let total = 0;
  let found = false;
  for (const candidate of candidates) {
    let start = text.indexOf(candidate.alias);
    while (start >= 0) {
      const end = start + candidate.alias.length;
      const overlaps = usedRanges.some(([from, to]) => start < to && end > from);
      if (!overlaps) {
        const before = text.slice(Math.max(0, start - 12), start);
        const after = text.slice(end, end + 16);
        const quantity = parseQuantity(after, candidate.entry) ?? parseQuantity(before, candidate.entry);
        // 相邻食物的数量可能出现在同一小段文字里；单位不适用于当前食物时，回退到普通一份。
        const kcal = quantity ? (caloriesForQuantity(candidate.entry, quantity) ?? caloriesForDefault(candidate.entry)) : caloriesForDefault(candidate.entry);
        if (kcal != null && Number.isFinite(kcal)) {
          total += kcal;
          found = true;
          matched.push(candidate.alias);
          usedRanges.push([start, end]);
        }
      }
      start = text.indexOf(candidate.alias, start + 1);
    }
  }
  return { kcal: found ? Math.round(total) : null, matched, partial: found && matched.length > 1 };
}

export function isFoodMarker(content: string): boolean {
  return content === "蛋白质达标" || content === "水达标";
}

export function effectiveFoodCalories(record: { content: string; calorieManual?: number; calorieEstimate?: number }): number | null {
  if (typeof record.calorieManual === "number" && Number.isFinite(record.calorieManual)) return record.calorieManual;
  if (typeof record.calorieEstimate === "number" && Number.isFinite(record.calorieEstimate)) return record.calorieEstimate;
  return estimateFoodCalories(record.content).kcal;
}
