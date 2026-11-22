"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  Route,
  NotebookPen,
  SlidersHorizontal,
  ShieldCheck,
  ListChecks,
  ChevronRight,
  LockKeyhole,
  BookOpen,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { changeDay, field } from "@/lib/db";
import { guardrails, nyTime, pnl, zone } from "@/lib/rules";
import { Panel, Input, Select } from "./ui/forms";
import { Checkbox } from "./ui/forms";
import { Button } from "./ui/button";
import { entryModels } from "@/data/navigation";
import { Checklist } from "./checklist";
export function ContextFields() {
  const { day, account, items } = useWorkspace(),
    f = day.fields,
    set = (k: string, v: string) => field(day, k, v);
  const conditions = items
    .filter((i) => i.section === "market-condition" && !i.heading)
    .map((i) => i.text.replace(/^-\s*/, ""));
  const models = items
    .filter(
      (i) => i.section === "strategy" && !i.heading && !i.text.startsWith("-"),
    )
    .map((i) => i.text);
  return (
    <div className="grid2">
      <Select
        label="Trading instrument"
        value={f.instrument || ""}
        options={account.instruments
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)}
        onChange={(v) => set("instrument", v)}
        placeholder="Select instrument"
      />
      <Select
        label="Directional bias"
        value={f.bias || ""}
        options={["Bullish", "Bearish", "Neutral"]}
        onChange={(v) => set("bias", v)}
        placeholder="Select bias"
      />
      <Select
        label="Market condition"
        value={f.condition || ""}
        options={conditions}
        onChange={(v) => set("condition", v)}
        placeholder="Select condition"
      />
      <Select
        label="Trading model"
        value={f.tradingModel || ""}
        options={models}
        onChange={(v) => set("tradingModel", v)}
        placeholder="Select model"
      />
      <Select
        label="Entry model"
        value={f.model || ""}
        options={entryModels}
        onChange={(v) => set("model", v)}
        placeholder="Select entry model"
      />
    </div>
  );
}
export function RiskInputs() {
  const { day, account } = useWorkspace();
  return (
    <div className="grid3">
      {[
        ["risk", "Planned risk", account.risk.perTrade],
        ["loss", "Daily loss limit", account.risk.dailyLoss],
        ["profit", "Daily profit limit", account.risk.dailyProfit],
      ].map(([k, l, base]) => (
        <Input
          key={k}
          label={String(l)}
          type="number"
          min={0.01}
          step={0.01}
          prefix="$"
          disabled={(account.locked && k !== "risk") || day.outcomes.length > 0}
          placeholder={base ? String(base) : "Unconfigured"}
          value={day.fields[k] || ""}
          onSave={(v) => field(day, String(k), v)}
        />
      ))}
    </div>
  );
}
export function CalendarReview() {
  const { day } = useWorkspace();
  return (
    <div className="stack">
      <label className="item-label">
        <Checkbox
          checked={day.fields.calendar === "yes"}
          onChange={(checked) => field(day, "calendar", checked ? "yes" : "")}
        />
        I reviewed the economic calendar
      </label>
      <Select
        label="Red-folder news"
        value={day.fields.news || ""}
        options={[
          ["clear", "No relevant event"],
          ["event", "Event scheduled"],
        ]}
        onChange={(v) => field(day, "news", v)}
      />
      {day.fields.news === "event" && (
        <Input
          label="Event time in New York"
          type="time"
          value={day.fields.newsTime || ""}
          onSave={(v) => field(day, "newsTime", v)}
        />
      )}
    </div>
  );
}
export function SessionLimits() {
  const { pack, account, day, week, now } = useWorkspace();
  const findings = guardrails(pack, account, day, week, now).filter(
    (f) => f.status === "Invalid",
  );
  return findings.length ? (
    <div className="notice">
      <LockKeyhole size={17} />
      <div>
        <b>Trading restricted</b>
        <ul>
          {findings.map((f, i) => (
            <li key={i}>{f.reason}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;
}
export function SessionControls() {
  const { day, account } = useWorkspace();
  const [result, setResult] = useState("Loss"),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState("");
  return (
    <div className="stack">
      <SessionLimits />
      <p>
        {day.outcomes.length} of {account.risk.tradeLimit ?? "unconfigured"}{" "}
        trades recorded · Net P&amp;L{" "}
        {pnl(day).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}
      </p>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const value =
            result === "Breakeven"
              ? 0
              : Number(amount) * (result === "Loss" ? -1 : 1);
          void changeDay(day, (s) => {
            s.outcomes.push({
              result: result as "Win" | "Loss" | "Breakeven",
              amount: value,
            });
          });
          setAmount("");
        }}
      >
        <Select
          label="Recorded outcome"
          value={result}
          options={["Win", "Loss", "Breakeven"]}
          onChange={(v) => setResult(v || "Loss")}
        />
        {result !== "Breakeven" && (
          <label className="field">
            Amount ($)
            <input
              type="number"
              min=".01"
              step=".01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        )}
        <Button variant="outline">Record outcome</Button>
      </form>
      {day.lock ? (
        <Button
          variant="outline"
          onClick={() =>
            confirm(
              "Release the manual session lock? Other restrictions still apply.",
            ) &&
            changeDay(day, (s) => {
              s.lock = "";
            })
          }
        >
          Release manual lock
        </Button>
      ) : (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void changeDay(day, (s) => {
              s.lock = reason.trim() || "Manual session lock.";
            });
            setReason("");
          }}
        >
          <label className="field">
            Lockout reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for ending this session"
            />
          </label>
          <Button variant="outline">
            <LockKeyhole size={14} /> Lock session
          </Button>
        </form>
      )}
    </div>
  );
}
export function Today() {
  const { day, pack, account, now } = useWorkspace();
  const confirms = [
    ["prepared", "Session preparation complete"],
    ["riskReviewed", "Account risk limits reviewed"],
    ["calendar", "Economic calendar reviewed"],
  ];
  const completed = confirms.filter(([k]) => day.fields[k] === "yes").length;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <CalendarDays size={14} />
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: zone,
            })}
          </div>
          <h1>Today’s Plan</h1>
          <p>Prepare your session and define the setups you’ll take today.</p>
        </div>
        <Button asChild>
          <Link href="/workflow">
            <Route size={16} />
            Guided workflow
          </Link>
        </Button>
      </div>
      {!pack.label && (
        <div className="import-line">
          <BookOpen size={16} />
          <span>Load your trading plan to use its checklists and rules.</span>
          <Link href="/settings#import">
            Import plan <ChevronRight size={14} />
          </Link>
        </div>
      )}
      <div className="today-grid">
        <div className="stack">
          <Panel icon={<SlidersHorizontal />} title="Session plan">
            <ContextFields />
          </Panel>
          <Panel icon={<ShieldCheck />} title="Risk parameters">
            <RiskInputs />
          </Panel>
          <Panel icon={<NotebookPen />} title="Daily notes">
            <Input
              label="Session notes"
              multiline
              value={day.fields.notes || ""}
              placeholder="Record your bias, areas of interest, or reminders for today…"
              onSave={(v) => field(day, "notes", v)}
            />
          </Panel>
          <details className="fold">
            <summary>
              <BookOpen size={16} />
              Original daily plan
              <ChevronRight size={15} />
            </summary>
            <Checklist section="todays-plan" />
          </details>
          <details className="fold">
            <summary>
              <ListChecks size={16} />
              Trade counter & lockout
              <ChevronRight size={15} />
            </summary>
            <SessionControls />
          </details>
        </div>
        <div className="stack">
          <section className="session-card">
            <div className="eyebrow">
              <Clock3 size={14} />
              Trading window
            </div>
            <div className="clock">
              {nyTime(now)}
              <small> ET</small>
            </div>
            <div className="muted">New York local time</div>
            <hr />
            <dl>
              <div>
                <dt>Start</dt>
                <dd>{account.windowStart || "Unconfigured"}</dd>
              </div>
              <div>
                <dt>End</dt>
                <dd>{account.windowEnd || "Unconfigured"}</dd>
              </div>
            </dl>
            <Link href="/trading-session/trading-window">
              View trading window <ChevronRight size={14} />
            </Link>
          </section>
          <Panel
            icon={<ListChecks />}
            title="Confirmations"
            aside={
              <span className="count">
                {completed} / {confirms.length}
              </span>
            }
          >
            <div className="check-progress" aria-hidden="true">
              <span
                style={{ width: (completed / confirms.length) * 100 + "%" }}
              />
            </div>
            {confirms.map(([k, v]) => (
              <label className="confirm" key={k}>
                <Checkbox
                  checked={day.fields[k] === "yes"}
                  onChange={(checked) => field(day, k, checked ? "yes" : "")}
                />
                {v}
              </label>
            ))}
          </Panel>
          <SessionLimits />
          <div className="rail-links">
            <h2>Session references</h2>
            {[
              ["Before a Trade", "/trading-session/before-a-trade"],
              ["Chart Analysis", "/market-framework/chart-analysis"],
              ["Risk Settings", "/risk-management/risk-settings"],
            ].map(([l, u]) => (
              <Link href={u} key={u}>
                {l}
                <ChevronRight size={14} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
