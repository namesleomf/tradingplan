"use client";
import { useLiveQuery } from "dexie-react-hooks";
import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { db, initialize, useSave, write } from "./db";
import { newDay } from "./schema";
import { nyDate, weekStart } from "./rules";
async function read(date: string) {
  const prefs = await db.prefs.get("interface");
  if (!prefs) return;
  const [accounts, items, pack, days] = await Promise.all([
    db.accounts.toArray(),
    db.items.orderBy("id").toArray(),
    db.originals.toCollection().first(),
    db.days.where("account").equals(prefs.active).toArray(),
  ]);
  const account = accounts.find((a) => a.id === prefs.active);
  if (!account || !pack) return;
  return {
    prefs,
    items: items.sort((a, b) => a.order - b.order),
    accounts,
    pack,
    account,
    day: days.find((x) => x.date === date) ?? newDay(account.id, date),
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
  const data = useLiveQuery(() => read(date), [date]);
  const error = useSave((s) => s.error);
  useEffect(() => {
    void write(initialize);
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 10000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  if (!data)
    return (
      <div className="loading" role="status">
        {error || "Opening your trading plan…"}
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
