"use client";
import { useWorkspace } from "@/lib/workspace";
import { riskFields } from "@/lib/schema";
import { Panel, Select, Input } from "./ui/forms";
import { pref, field } from "@/lib/db";
export function Accounts() {
  const { accounts, account, pack, day } = useWorkspace();
  const original = pack.accounts.find((a) => a.id === account.id) ?? account;
  return (
    <div className="stack">
      <Panel title="Account profile">
        <Select
          label="Active account"
          value={account.id}
          options={accounts.map((a) => [a.id, a.name])}
          onChange={(v) => v && pref({ active: v })}
        />
        <dl className="source-profile">
          {Object.entries(original.risk).map(([key, value]) => (
            <div key={key}>
              <dt>{riskFields[key as keyof typeof riskFields] ?? key}</dt>
              <dd>{value.toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Session risk review">
        <p className="muted">
          Record the limits and trading window that apply to this account today.
        </p>
        <div className="grid2">
          {(
            [
              ["windowStart", "Window start (New York)", "time"],
              ["windowEnd", "Window end (New York)", "time"],
              ["openMinutes", "Opening restriction (minutes)", "number"],
              ["perTrade", "Maximum risk per trade ($)", "number"],
            ] as const
          ).map(([key, label, type]) => {
            const fixed =
              key === "perTrade" ? original.risk.perTrade : original[key];
            const effective =
              key === "perTrade" ? account.risk.perTrade : account[key];
            return (
              <Input
                key={key}
                label={label}
                type={type}
                min={key === "openMinutes" ? 0 : 0.01}
                step={key === "perTrade" ? 0.01 : 1}
                disabled={
                  (fixed !== undefined && fixed !== null && fixed !== "") ||
                  day.outcomes.length > 0
                }
                value={day.fields["profile-" + key] ?? String(effective ?? "")}
                onSave={(v) => field(day, "profile-" + key, v)}
              />
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
