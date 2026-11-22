"use client";
import { useState } from "react";
import { useWorkspace } from "@/lib/workspace";
import { blankAccount, riskFields, type Account } from "@/lib/schema";
import { db, pref, write } from "@/lib/db";
import { Panel, Input, Select } from "./ui/forms";
import { Button } from "./ui/button";
export function Accounts() {
  const { accounts, account: a, day } = useWorkspace();
  const [name, setName] = useState("");
  const update = (v: Partial<Account>) =>
    write(() => db.accounts.update(a.id, v));
  const protectedRisk = a.locked || day.outcomes.length > 0;
  function updateRisk(k: string, v: string) {
    return write(() =>
      db.transaction("rw", db.accounts, async () => {
        const current = await db.accounts.get(a.id);
        if (!current || current.locked) return;
        const risk = { ...current.risk };
        if (v) risk[k] = Number(v);
        else delete risk[k];
        await db.accounts.update(a.id, { risk });
      }),
    );
  }
  return (
    <div className="stack">
      <Panel title="Account profiles">
        <Select
          label="Active account"
          value={a.id}
          options={accounts.map((x) => [x.id, x.name])}
          onChange={(v) => v && pref({ active: v })}
        />
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const id = crypto.randomUUID();
            void write(() =>
              db.transaction("rw", db.accounts, db.prefs, async () => {
                await db.accounts.add({
                  ...blankAccount,
                  id,
                  name: name.trim(),
                });
                await db.prefs.update("interface", { active: id });
              }),
            );
            setName("");
          }}
        >
          <label className="field">
            New account name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <Button variant="outline" disabled={!name.trim()}>
            Add account
          </Button>
        </form>
      </Panel>
      <Panel title={a.name}>
        <div className="grid2">
          <Input
            label="Account name"
            value={a.name}
            onSave={(v) => v.trim() && update({ name: v.trim() })}
          />
          <Select
            label="Account type"
            value={a.kind}
            options={["Personal", "Futures"]}
            onChange={(v) =>
              (v === "Personal" || v === "Futures") && update({ kind: v })
            }
          />
          <Input
            label="Available instruments (comma-separated)"
            value={a.instruments}
            onSave={(instruments) => update({ instruments })}
          />
          <Input
            label="Opening restriction (minutes)"
            type="number"
            min={0}
            disabled={protectedRisk}
            value={a.openMinutes?.toString() ?? ""}
            onSave={(v) => update({ openMinutes: v === "" ? null : Number(v) })}
          />
          <Input
            type="time"
            label="Window start (New York)"
            value={a.windowStart}
            disabled={protectedRisk}
            onSave={(windowStart) => update({ windowStart })}
          />
          <Input
            type="time"
            label="Window end (New York)"
            value={a.windowEnd}
            disabled={protectedRisk}
            onSave={(windowEnd) => update({ windowEnd })}
          />
        </div>
        <h3>Risk settings</h3>
        <div className="grid3">
          {Object.entries(riskFields)
            .filter(([k]) => a.kind === "Personal" || k !== "deposit")
            .map(([k, l]) => (
              <Input
                key={k}
                label={l}
                type="number"
                min={0.01}
                step={
                  ["tradeLimit", "losses", "maxTime"].includes(k) ? 1 : 0.01
                }
                value={a.risk[k]?.toString() ?? ""}
                placeholder="Unconfigured"
                disabled={protectedRisk}
                onSave={(v) => updateRisk(k, v)}
              />
            ))}
        </div>
        {a.kind === "Futures" && a.risk.drawdown && a.risk.losses ? (
          <p className="muted">
            Drawdown per assumed loss:{" "}
            {(a.risk.drawdown / a.risk.losses).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
            .
          </p>
        ) : null}
        <div className="actions">
          <Button
            variant="outline"
            disabled={day.outcomes.length > 0}
            onClick={() => update({ locked: !a.locked })}
          >
            {a.locked ? "Unlock configuration" : "Lock configuration"}
          </Button>
          <Button
            variant="ghost"
            disabled={accounts.length < 2}
            onClick={() => {
              if (confirm("Delete this account and its saved sessions?"))
                void write(() =>
                  db.transaction(
                    "rw",
                    db.accounts,
                    db.days,
                    db.prefs,
                    async () => {
                      await db.days.where("account").equals(a.id).delete();
                      await db.accounts.delete(a.id);
                      await db.prefs.update("interface", {
                        active: accounts.find((x) => x.id !== a.id)!.id,
                      });
                    },
                  ),
                );
            }}
          >
            Remove account
          </Button>
        </div>
      </Panel>
    </div>
  );
}
