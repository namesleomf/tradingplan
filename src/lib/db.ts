"use client";
import Dexie, { type Table } from "dexie";
import { create } from "zustand";
import { z } from "zod";
import {
  accountSchema,
  daySchema,
  emptyPack,
  newDay,
  nodeSchema,
  packSchema,
  prefsSchema,
  type Account,
  type Item,
  type Day,
  type Pack,
} from "./schema";
import initial from "@/data/initial.json";
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
const original = () => packSchema.parse(initial ?? emptyPack);
export async function initialize() {
  await db.transaction("rw", db.tables, async () => {
    if (await db.prefs.get("interface")) return;
    const pack = original();
    await db.originals.put(pack);
    await db.items.bulkPut(pack.items);
    await db.accounts.bulkPut(pack.accounts);
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
  format: z.literal("trading-plan-backup-v1"),
  original: packSchema,
  items: z.array(nodeSchema),
  accounts: z.array(accountSchema).min(1),
  days: z.array(daySchema),
  prefs: prefsSchema,
});
function checkItems(items: Item[]) {
  const map = new Map(items.map((i) => [i.id, i]));
  if (map.size !== items.length) throw Error("Duplicate plan item ID.");
  for (const i of items) {
    if (!pages.some((p) => p.id === i.section))
      throw Error("Unknown plan section.");
    let n: Item | undefined = i;
    const seen = new Set();
    while (n?.parent) {
      if (seen.has(n.id)) throw Error("Circular section.");
      seen.add(n.id);
      n = map.get(n.parent);
      if (!n?.heading || n.section !== i.section)
        throw Error("Invalid subsection.");
    }
    if (i.ref && !map.has(i.ref)) throw Error("Missing linked requirement.");
  }
}
export async function importData(raw: unknown) {
  const isBackup =
    typeof raw === "object" &&
    raw !== null &&
    "format" in raw &&
    raw.format === "trading-plan-backup-v1";
  const b = isBackup ? backup.parse(raw) : null;
  const pack = b?.original ?? packSchema.parse(raw);
  checkItems(pack.items);
  const items = b?.items ?? pack.items;
  checkItems(items);
  const accounts = b?.accounts ?? pack.accounts,
    ids = new Set(accounts.map((a) => a.id));
  if (ids.size !== accounts.length) throw Error("Duplicate account ID.");
  const prefs = b?.prefs ?? { ...defaultPrefs, active: accounts[0].id };
  if (
    !ids.has(prefs.active) ||
    !pages.some((p) => p.url === prefs.landing) ||
    b?.days.some(
      (d) => !ids.has(d.account) || d.key !== d.account + "/" + d.date,
    )
  )
    throw Error("Invalid backup relationships.");
  await db.transaction("rw", db.tables, async () => {
    for (const t of db.tables) await t.clear();
    await db.originals.put(pack);
    await db.items.bulkPut(items);
    await db.accounts.bulkPut(accounts);
    await db.days.bulkPut(b?.days ?? []);
    await db.prefs.put(prefs);
  });
}
export async function exportData() {
  return db.transaction("r", db.tables, async () => ({
    format: "trading-plan-backup-v1",
    original: await db.originals.toCollection().first(),
    items: await db.items.toArray(),
    accounts: await db.accounts.toArray(),
    days: await db.days.toArray(),
    prefs: await db.prefs.get("interface"),
  }));
}
export async function restore() {
  await db.transaction("rw", db.items, db.originals, db.days, async () => {
    const p = await db.originals.toCollection().first();
    if (!p) return;
    await db.items.clear();
    await db.items.bulkPut(p.items);
    await db.days.toCollection().modify((s) => {
      s.answers = {};
    });
  });
}
