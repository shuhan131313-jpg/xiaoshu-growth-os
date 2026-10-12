import type { AccountRecord } from "./db/db";

export interface AccountEditInput {
  date: string;
  type: AccountRecord["type"];
  amount: string | number;
  note?: string;
}

/** 统一校验并规范化记账编辑字段，金额保留两位小数。 */
export function normalizeAccountEdit(input: AccountEditInput) {
  const parsedAmount = Number(input.amount);
  if (!input.date || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
  return {
    date: input.date,
    type: input.type,
    amount: Math.round(parsedAmount * 100) / 100,
    note: input.note?.trim() || undefined,
  };
}

/** 收支余额始终由现有记录派生，不单独保存易失真的余额字段。 */
export function sumAccountRecords(rows: AccountRecord[]) {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === "income") income += row.amount;
    else expense += row.amount;
  }
  income = Math.round(income * 100) / 100;
  expense = Math.round(expense * 100) / 100;
  return { income, expense, balance: Math.round((income - expense) * 100) / 100 };
}
