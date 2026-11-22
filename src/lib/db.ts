"use client";
import Dexie, { type Table } from "dexie";
import { create } from "zustand";
import { z } from "zod";
import {
  accountSchema,
  daySchema,
  newDay,
  prefsSchema,
  type Account,
  type Item,
  type Day,
  type Pack,
} from "./schema";
import { pages, today } from "@/data/navigation";
type Prefs = z.infer<typeof prefsSchema>;
class PlanDB extends Dexie {
  items!: Table<Item, string>;
  accounts!: Table<Account, string>;
  days!: Table<Day, string>;
  prefs!: Table<Prefs, string>;
  originals!: Table<Pack, string>;
  constructor() {
    super("paper-white-trading-plan");
    this.version(1).stores({
      items: "id,section,parent",
      accounts: "id",
      days: "key,account,date",
      prefs: "key",
      originals: "format",
    });
  }
}
export const db = new PlanDB();
const defaultPrefs: Prefs = {
  key: "interface",
  active: "personal",
  expanded: ["trading-session"],
  collapsed: false,
  landing: today,
};
// Legacy source tables are retained for older workspaces. The app reads the plan from the release.
export async function initialize(pack: Pack) {
  await db.transaction("rw", db.accounts, db.prefs, async () => {
    const profiles = new Set(await db.accounts.toCollection().primaryKeys());
    await db.accounts.bulkPut(pack.accounts.filter((a) => !profiles.has(a.id)));
    if (!(await db.prefs.get("interface")))
      await db.prefs.put({ ...defaultPrefs, active: pack.accounts[0].id });
  });
}
export const useSave = create<{
  pending: number;
  error: string;
  ready: boolean;
}>(() => ({ pending: 0, error: "", ready: false }));
export async function write(fn: () => Promise<unknown>) {
  useSave.setState((s) => ({ pending: s.pending + 1 }));
  try {
    await fn();
    return true;
  } catch (e) {
    useSave.setState({
      error: e instanceof Error ? e.message : "Unable to save on this device.",
    });
    return false;
  } finally {
    useSave.setState((s) => ({ pending: s.pending - 1 }));
  }
}
export const pref = (v: Partial<Prefs>) =>
  write(() => db.prefs.update("interface", v));
export const changeDay = (d: Day, edit: (current: Day) => void) =>
  write(() =>
    db.transaction("rw", db.days, async () => {
      const current = (await db.days.get(d.key)) ?? newDay(d.account, d.date);
      edit(current);
      await db.days.put(current);
    }),
  );
export const field = (d: Day, k: string, v: string) =>
  changeDay(d, (s) => {
    s.fields[k] = v;
  });
const backup = z.object({
  format: z.enum(["trading-plan-sessions-v2", "trading-plan-backup-v1"]),
  accounts: z.array(accountSchema).min(1),
  days: z.array(daySchema),
  prefs: prefsSchema,
});
export async function restoreSessions(raw: unknown) {
  // Older backups may carry edited rules; only session data and local profiles are restored.
  const b = backup.parse(raw);
  const ids = new Set(b.accounts.map((a) => a.id));
  if (
    ids.size !== b.accounts.length ||
    !ids.has(b.prefs.active) ||
    !pages.some((p) => p.url === b.prefs.landing) ||
    b.days.some(
      (d) => !ids.has(d.account) || d.key !== d.account + "/" + d.date,
    )
  )
    throw Error("Invalid session backup.");
  await db.transaction("rw", db.days, db.accounts, db.prefs, async () => {
    await db.accounts.bulkPut(b.accounts);
    await db.days.clear();
    await db.days.bulkPut(b.days);
    await db.prefs.put(b.prefs);
  });
}
export async function exportData() {
  return db.transaction("r", db.accounts, db.days, db.prefs, async () => ({
    format: "trading-plan-sessions-v2",
    accounts: await db.accounts.toArray(),
    days: await db.days.toArray(),
    prefs: await db.prefs.get("interface"),
  }));
}
