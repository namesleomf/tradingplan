import type { Account, Day, Item, Pack } from "./schema";
import { steps } from "../data/navigation";
export const zone = "America/New_York";
const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const nyDate = (time: Date) => dateFormat.format(time);
export const nyTime = (time: Date) =>
  time.toLocaleTimeString("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
export function weekStart(date: string) {
  const d = new Date(date + "T12:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function applicable(item: Item, d: Day) {
  return (
    (!item.account || item.account === d.account) &&
    (!item.model || item.model === d.fields.model) &&
    (!item.workspace || item.workspace === d.fields.workspace)
  );
}
export function responseKey(item: Item, items: Item[]) {
  return item.ref && items.some((i) => i.id === item.ref) ? item.ref : item.id;
}
export function sessionRequirement(item: Item, day: Day) {
  if (item.mode !== "Unconfigured") return item.mode;
  const value = day.fields["applicability-" + item.id];
  return value === "Required" ||
    value === "Optional" ||
    value === "Not applicable"
    ? value
    : "Unconfigured";
}
export type Finding = { status: "Invalid" | "Incomplete"; reason: string };
export function requirements(
  items: Item[],
  d: Day,
  sections: string[],
): Finding[] {
  return items
    .filter(
      (i) =>
        sections.includes(i.section) &&
        !i.heading &&
        applicable(i, d) &&
        !["Optional", "Reference"].includes(i.mode),
    )
    .flatMap((i): Finding[] => {
      const response = d.answers[responseKey(i, items)];
      const mode = sessionRequirement(i, d);
      if (mode === "Optional" || mode === "Not applicable") return [];
      if (mode === "Unconfigured")
        return [
          {
            status: "Incomplete",
            reason: "Review applicability for this session: " + i.text,
          },
        ];
      if (!response || response === "N/A")
        return [{ status: "Incomplete", reason: i.text }];
      if (response === (i.mode === "Prohibited" ? "Yes" : "No"))
        return [{ status: "Invalid", reason: i.text }];
      return [];
    });
}
const minutes = (t: string) =>
  Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const pnl = (d: Day) => d.outcomes.reduce((v, o) => v + o.amount, 0);
function extremes(days: Day[]) {
  let net = 0,
    low = 0,
    high = 0;
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const trade of day.outcomes) {
      net += trade.amount;
      low = Math.min(low, net);
      high = Math.max(high, net);
    }
  }
  return { low, high };
}
export function guardrails(
  pack: Pack,
  a: Account,
  d: Day,
  week: Day[],
  now: Date,
): Finding[] {
  const out: Finding[] = [];
  const fail = (reason: string) => out.push({ status: "Invalid", reason });
  const missing = (reason: string) =>
    out.push({ status: "Incomplete", reason });
  const p = pack.policy,
    r = a.risk,
    t = nyTime(now);
  if (d.lock) fail(d.lock);
  if (week.some((s) => s.fields.weekLock === "yes"))
    fail("Weekly application lockout is active.");
  if (!p) {
    missing("Trading rules are unspecified in the source.");
    return out;
  }
  if (!p.days.includes(new Date(d.date + "T12:00Z").getUTCDay()))
    fail("Trading is closed on this day.");
  if (!a.windowStart || !a.windowEnd)
    missing("Confirm this account’s New York trading window.");
  else if (t < a.windowStart || t >= a.windowEnd)
    fail("Outside the configured trading window.");
  if (a.openMinutes === null)
    missing("Resolve the NYSE opening restriction for this account.");
  else if (
    minutes(t) >= minutes(p.opening) &&
    minutes(t) < minutes(p.opening) + a.openMinutes
  )
    fail("NYSE opening restriction is active.");
  if (d.fields.calendar !== "yes") missing("Review the economic calendar.");
  if (d.fields.news === "event" && d.fields.newsTime) {
    if (Math.abs(minutes(t) - minutes(d.fields.newsTime)) <= p.newsMinutes)
      fail("Within the red-folder news restriction.");
  } else if (d.fields.news !== "clear")
    missing("Confirm red-folder news timing.");
  if (!r.tradeLimit) missing("Set the daily trade limit.");
  else if (d.outcomes.length >= r.tradeLimit)
    fail("Daily trade limit reached.");
  if (p.stopWin && d.outcomes.some((o) => o.result === "Win"))
    fail("Stop after a winning trade.");
  if (d.outcomes.filter((o) => o.result === "Loss").length >= p.stopLosses)
    fail("Losing trade limit reached.");
  if (d.outcomes.filter((o) => o.result === "Breakeven").length >= p.stopFlats)
    fail("Breakeven trade limit reached.");
  const limit = (key: string, profile: number | undefined) => {
    const values = [Number(d.fields[key]), profile || 0].filter((n) => n > 0);
    return values.length ? Math.min(...values) : 0;
  };
  const loss = limit("loss", r.dailyLoss),
    profit = limit("profit", r.dailyProfit);
  const daily = extremes([d]);
  const weekly = extremes([...week.filter((s) => s.key !== d.key), d]);
  if (!loss) missing("Set the account daily loss limit.");
  else if (daily.low <= -loss) fail("Daily loss limit reached.");
  if (!profit) missing("Set the account daily profit limit.");
  else if (daily.high >= profit) fail("Daily profit limit reached.");
  if (r.weeklyLoss && weekly.low <= -r.weeklyLoss)
    fail("Weekly loss limit reached.");
  if (r.dailyTrigger && daily.high >= r.dailyTrigger)
    fail("Daily profit trigger reached.");
  if (r.weeklyTrigger && weekly.high >= r.weeklyTrigger)
    fail("Weekly profit trigger reached.");
  if (r.trailing) {
    if (
      d.fields.currentDrawdown === undefined ||
      d.fields.currentDrawdown === ""
    )
      missing("Enter current trailing drawdown.");
    else if (Number(d.fields.currentDrawdown) >= r.trailing)
      fail("Trailing maximum drawdown reached.");
  }
  if (r.maxTime && Number(d.fields.minutesInTrade) >= r.maxTime)
    fail("Maximum time in trade reached.");
  if (r.maxProfit && d.outcomes.some((o) => o.amount > r.maxProfit))
    fail("Maximum profit per trade exceeded.");
  if (!d.fields.risk || Number(d.fields.risk) <= 0)
    missing("Enter planned risk per trade.");
  else if (
    (r.perTrade && Number(d.fields.risk) > r.perTrade) ||
    (loss && Number(d.fields.risk) > loss + Math.min(0, pnl(d)))
  )
    fail("Planned risk exceeds the remaining allowance.");
  if (!r.perTrade) missing("Confirm the account’s maximum risk per trade.");
  return out;
}
export function validate(
  pack: Pack,
  items: Item[],
  a: Account,
  d: Day,
  week: Day[],
  now: Date,
) {
  const findings = guardrails(pack, a, d, week, now);
  if (!d.fields.model)
    findings.push({ status: "Incomplete", reason: "Select an entry model." });
  if (pack.policy?.prohibitedModels.includes(d.fields.model))
    findings.push({
      status: "Invalid",
      reason: "This entry model is prohibited.",
    });
  if (!d.fields.workspace)
    findings.push({
      status: "Incomplete",
      reason: "Select the workspace setup.",
    });
  if (d.fields.timeframeReviewed !== "yes")
    findings.push({
      status: "Incomplete",
      reason: "Resolve the analysis and execution timeframe for this setup.",
    });
  if (d.fields.prepared !== "yes" || d.fields.riskReviewed !== "yes")
    findings.push({
      status: "Incomplete",
      reason: "Confirm session preparation and account risk review.",
    });
  if (!d.fields.tradingModel)
    findings.push({ status: "Incomplete", reason: "Select a trading model." });
  if (!d.fields.bias || !d.fields.instrument)
    findings.push({
      status: "Incomplete",
      reason: "Select the instrument and directional bias.",
    });
  if (
    d.fields.instrument &&
    !a.instruments
      .split(",")
      .map((s) => s.trim())
      .includes(d.fields.instrument)
  )
    findings.push({
      status: "Invalid",
      reason: "Instrument is unavailable on this account.",
    });
  if (
    !items.some(
      (i) =>
        i.section === "entry-trigger" &&
        applicable(i, d) &&
        i.mode === "Required",
    )
  )
    findings.push({
      status: "Incomplete",
      reason: "Required entry triggers are unconfigured.",
    });
  findings.push(...requirements(items, d, [...steps, "rules"]));
  const unique = findings.filter(
    (f, i) =>
      findings.findIndex(
        (g) => g.reason === f.reason && g.status === f.status,
      ) === i,
  );
  const status: "Valid" | "Invalid" | "Incomplete" = findings.some(
    (f) => f.status === "Invalid",
  )
    ? "Invalid"
    : findings.length
      ? "Incomplete"
      : "Valid";
  return { status, findings: unique };
}
