"use client";
import { useLiveQuery } from "dexie-react-hooks";
import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { db, initialize, useSave } from "./db";
import { newDay, type Account, type Pack } from "./schema";
import { nyDate, weekStart } from "./rules";
import { loadPlan } from "./source";
async function read(date: string, pack: Pack) {
  const prefs = await db.prefs.get("interface");
  if (!prefs) return;
  const [stored, days] = await Promise.all([
    db.accounts.toArray(),
    db.days.where("account").equals(prefs.active).toArray(),
  ]);
  const accounts = [
    ...pack.accounts.map((source) => {
      const local = stored.find((a) => a.id === source.id);
      return {
        ...source,
        risk: { ...local?.risk, ...source.risk },
        windowStart: source.windowStart || local?.windowStart || "",
        windowEnd: source.windowEnd || local?.windowEnd || "",
        openMinutes: source.openMinutes ?? local?.openMinutes ?? null,
      };
    }),
    ...stored.filter((a) => !pack.accounts.some((s) => s.id === a.id)),
  ];
  const profile = accounts.find((a) => a.id === prefs.active);
  if (!profile) return;
  const day = days.find((x) => x.date === date) ?? newDay(profile.id, date);
  const source = pack.accounts.find((a) => a.id === profile.id) ?? profile;
  const f = day.fields;
  const account: Account = {
    ...profile,
    windowStart:
      source.windowStart || f["profile-windowStart"] || profile.windowStart,
    windowEnd: source.windowEnd || f["profile-windowEnd"] || profile.windowEnd,
    openMinutes:
      source.openMinutes ??
      (f["profile-openMinutes"]
        ? Number(f["profile-openMinutes"])
        : profile.openMinutes),
    risk: {
      ...profile.risk,
      ...(!source.risk.perTrade && Number(f["profile-perTrade"]) > 0
        ? { perTrade: Number(f["profile-perTrade"]) }
        : {}),
    },
  };
  return {
    prefs,
    items: pack.items,
    accounts,
    pack,
    account,
    day,
    week: days.filter((d) => d.date >= weekStart(date) && d.date <= date),
  };
}
type State = NonNullable<Awaited<ReturnType<typeof read>>> & { now: Date };
const Context = createContext<State | null>(null);
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw Error("Workspace unavailable");
  return value;
}
export function Workspace({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  const date = nyDate(now);
  const [pack, setPack] = useState<Pack | null>(null);
  const [sourceError, setSourceError] = useState("");
  const data = useLiveQuery(
    () => (pack ? read(date, pack) : undefined),
    [date, pack],
  );
  const error = useSave((s) => s.error);
  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const source = await loadPlan();
        await initialize(source);
        if (active) setPack(source);
      } catch (e) {
        if (active)
          setSourceError(
            e instanceof Error ? e.message : "Unable to open the plan.",
          );
      }
    }
    void start();
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 10000);
    window.addEventListener("focus", tick);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  if (!data)
    return (
      <div className="loading" role="status">
        {sourceError || error || "Opening your trading plan…"}
        {error && <button onClick={() => location.reload()}>Retry</button>}
      </div>
    );
  return (
    <Context.Provider value={{ ...data, now }}>
      {error && (
        <div className="storageError" role="alert">
          Local save failed. {error}{" "}
          <button onClick={() => useSave.setState({ error: "" })}>
            Dismiss
          </button>
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
