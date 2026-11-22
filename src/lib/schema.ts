import { z } from "zod";
export const mode = z.enum([
  "Required",
  "Optional",
  "Prohibited",
  "Reference",
  "Unconfigured",
]);
export const nodeSchema = z.object({
  id: z.string().min(1),
  section: z.string(),
  parent: z.string(),
  text: z.string().min(1),
  mode,
  heading: z.boolean(),
  model: z.string(),
  account: z.string(),
  source: z.string(),
  order: z.number(),
  ref: z.string().optional(),
  category: z.string().optional(),
  workspace: z.string().optional(),
  target: z.string().optional(),
  progress: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional(),
});
export type Item = z.infer<typeof nodeSchema>;
export const riskFields = {
  deposit: "Deposit",
  size: "Account size",
  drawdown: "Available drawdown",
  losses: "Consecutive losses",
  perTrade: "Maximum loss per trade",
  dailyLoss: "Daily loss limit",
  weeklyLoss: "Weekly loss limit",
  dailyProfit: "Daily profit limit",
  maxProfit: "Maximum profit per trade",
  trailing: "Trailing maximum drawdown",
  dailyTrigger: "Daily profit trigger",
  weeklyTrigger: "Weekly profit trigger",
  maxTime: "Maximum minutes in trade",
  tradeLimit: "Daily trade limit",
} as const;
export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["Personal", "Futures"]),
  risk: z.record(z.string(), z.number().positive()),
  windowStart: z.string(),
  windowEnd: z.string(),
  openMinutes: z.number().nonnegative().nullable(),
  instruments: z.string(),
  locked: z.boolean(),
});
export type Account = z.infer<typeof accountSchema>;
export const packSchema = z.object({
  format: z.literal("trading-plan-source-v1"),
  items: z.array(nodeSchema),
  accounts: z.array(accountSchema).min(1),
  conflicts: z.array(z.string()),
  label: z.string(),
  policy: z
    .object({
      days: z.array(z.number().int().min(0).max(6)),
      newsMinutes: z.number().nonnegative(),
      opening: z.string(),
      stopWin: z.boolean(),
      stopLosses: z.number().int().positive(),
      stopFlats: z.number().int().positive(),
      prohibitedModels: z.array(z.string()),
    })
    .nullable(),
});
export type Pack = z.infer<typeof packSchema>;
export const daySchema = z.object({
  key: z.string(),
  account: z.string(),
  date: z.string(),
  fields: z.record(z.string(), z.string()),
  answers: z.record(z.string(), z.enum(["Yes", "No", "N/A"])),
  outcomes: z.array(
    z.object({
      result: z.enum(["Win", "Loss", "Breakeven"]),
      amount: z.number().finite(),
    }),
  ),
  lock: z.string(),
  validation: z
    .object({
      status: z.enum(["Valid", "Invalid", "Incomplete"]),
      reasons: z.array(z.string()),
      at: z.string(),
    })
    .optional(),
  step: z.number().int().min(0).max(8),
});
export type Day = z.infer<typeof daySchema>;
export const prefsSchema = z.object({
  key: z.literal("interface"),
  active: z.string(),
  expanded: z.array(z.string()),
  collapsed: z.boolean(),
  landing: z.string(),
});
export const blankAccount: Account = {
  id: "personal",
  name: "Personal account",
  kind: "Personal",
  risk: {},
  windowStart: "",
  windowEnd: "",
  openMinutes: null,
  instruments: "",
  locked: false,
};
export const emptyPack: Pack = {
  format: "trading-plan-source-v1",
  label: "",
  items: [],
  accounts: [blankAccount],
  conflicts: [],
  policy: null,
};
export const newDay = (account: string, date: string): Day => ({
  key: account + "/" + date,
  account,
  date,
  fields: {},
  answers: {},
  outcomes: [],
  lock: "",
  step: 0,
});
