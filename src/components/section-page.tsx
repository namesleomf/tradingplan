"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, Pencil, Check, ListChecks } from "lucide-react";
import { pages, entryModels } from "@/data/navigation";
import { useWorkspace } from "@/lib/workspace";
import { changeDay, field, write, db } from "@/lib/db";
import { validate } from "@/lib/rules";
import { Panel, Select, Input } from "./ui/forms";
import { Checkbox } from "./ui/forms";
import { Button } from "./ui/button";
import {
  CalendarReview,
  ContextFields,
  RiskInputs,
  SessionControls,
  Today,
} from "./session";
import { Checklist, Editor } from "./checklist";
export function Result() {
  const { pack, items, account, day, week, now } = useWorkspace(),
    r = validate(pack, items, account, day, week, now);
  return (
    <section className="result">
      <div className="eyebrow">
        <ListChecks size={14} />
        Setup validation
      </div>
      <h2>Setup {r.status.toLowerCase()}</h2>
      {r.findings.length ? (
        <details>
          <summary>{r.findings.length} conditions to review</summary>
          <ul>
            {r.findings.map((f, i) => (
              <li key={i}>
                <b>{f.status}</b> · {f.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p>All applicable mandatory conditions are satisfied.</p>
      )}
      <div className="validation-actions">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            changeDay(day, (s) => {
              s.validation = {
                status: r.status,
                at: new Date().toISOString(),
                reasons: r.findings.map((f) => f.reason),
              };
            })
          }
        >
          Save validation
        </Button>
        {day.validation && (
          <small>
            Last saved: {day.validation.status} ·{" "}
            {new Date(day.validation.at).toLocaleTimeString("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            ET
          </small>
        )}
        <Link href="/mindset/rules">Review rules</Link>
      </div>
    </section>
  );
}
function Goals() {
  const { items } = useWorkspace();
  return (
    <div className="stack">
      {items
        .filter((i) => i.section === "goals" && !i.heading)
        .map((i) => {
          const save = (key: string, value: string) =>
            write(() => db.items.update(i.id, { [key]: value }));
          return (
            <Panel key={i.id} title={i.text}>
              <div className="grid2">
                {[
                  ["target", "Target"],
                  ["progress", "Manual progress"],
                  ["description", "Description"],
                  ["notes", "Notes"],
                ].map(([k, l]) => (
                  <Input
                    key={k}
                    label={l}
                    value={i[k as "target"] || ""}
                    onSave={(v) => save(k, v)}
                  />
                ))}
              </div>
              <label className="confirm">
                <Checkbox
                  checked={i.completed || false}
                  onChange={(checked) =>
                    write(() => db.items.update(i.id, { completed: checked }))
                  }
                />
                Goal complete
              </label>
            </Panel>
          );
        })}
      {!items.some((i) => i.section === "goals") && (
        <p className="muted">
          Add a goal in the plan editor or import your source plan.
        </p>
      )}
    </div>
  );
}
export function SectionBody({ id }: { id: string }) {
  const { day, account } = useWorkspace();
  const f = day.fields;
  const setup = [
    "validate-poi",
    "trading-model",
    "entry-model",
    "entry-confluence",
    "entry-trigger",
  ].includes(id);
  return (
    <div className="stack">
      {id === "workflow-setup" && (
        <Panel title="Workspace">
          <Select
            label="Setup in use"
            value={f.workspace || ""}
            options={["Office", "Laptop only"]}
            onChange={(v) => field(day, "workspace", v)}
          />
        </Panel>
      )}
      {id === "entry-model" && (
        <Panel title="Timeframe review">
          <p className="muted">
            Compare the execution timeframe for this model with the Trading Days
            &amp; Time Frames rules.
          </p>
          <Input
            label="Applicable execution timeframe and rationale"
            value={f.execution || ""}
            onSave={(v) =>
              changeDay(day, (s) => {
                s.fields.execution = v;
                delete s.fields.timeframeReviewed;
              })
            }
          />
          <label className="confirm">
            <Checkbox
              disabled={!f.execution}
              checked={f.timeframeReviewed === "yes"}
              onChange={(checked) =>
                field(day, "timeframeReviewed", checked ? "yes" : "")
              }
            />
            I resolved the timeframe for this setup
          </label>
        </Panel>
      )}
      {["market-condition", "trading-pairs", "trading-model"].includes(id) && (
        <Panel title="Session selection">
          <ContextFields />
        </Panel>
      )}
      {["entry-model", "entry-trigger", "entry-confluence"].includes(id) && (
        <Panel title="Model selection">
          <Select
            label="Entry model"
            value={f.model || ""}
            options={entryModels}
            onChange={(v) => field(day, "model", v)}
          />
        </Panel>
      )}
      {id === "news" && (
        <Panel title="Calendar review">
          <CalendarReview />
        </Panel>
      )}
      {id === "trading-window" && (
        <Panel title="Active account window">
          <p>
            {account.windowStart || "Unconfigured"} –{" "}
            {account.windowEnd || "Unconfigured"} · New York
          </p>
          <Link href="/settings">Configure account window</Link>
        </Panel>
      )}
      {id === "lockouts" && (
        <Panel title="Session lockout">
          <SessionControls />
          <label className="confirm">
            <Checkbox
              checked={f.weekLock === "yes"}
              onChange={(checked) =>
                field(day, "weekLock", checked ? "yes" : "")
              }
            />
            Block this account for the trading week
          </label>
        </Panel>
      )}
      {id.startsWith("risk-") && (
        <Panel title="Active risk profile">
          <p>
            {account.name} · {account.kind}
          </p>
          <RiskInputs />
          {account.risk.trailing && (
            <Input
              type="number"
              min={0}
              label="Current trailing drawdown"
              value={f.currentDrawdown || ""}
              onSave={(v) => field(day, "currentDrawdown", v)}
            />
          )}
          {account.risk.maxTime && (
            <Input
              type="number"
              min={0}
              label="Minutes in active trade"
              value={f.minutesInTrade || ""}
              onSave={(v) => field(day, "minutesInTrade", v)}
            />
          )}
          <Link href="/settings">Manage account risk settings</Link>
        </Panel>
      )}
      {id === "goals" ? (
        <Goals />
      ) : (
        <Panel
          title={
            id === "entry-trigger"
              ? "Model-specific triggers"
              : "Plan checklist"
          }
        >
          <Checklist section={id} />
        </Panel>
      )}
      {setup && <Result />}
    </div>
  );
}
export function SectionPage({ id }: { id: string }) {
  const { day } = useWorkspace();
  const [edit, setEdit] = useState(false);
  const page = pages.find((p) => p.id === id)!;
  if (id === "todays-plan") return <Today />;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <BookOpen size={14} />
            {page.group}
          </div>
          <h1>{page.title}</h1>
        </div>
        <Button variant="outline" onClick={() => setEdit(!edit)}>
          {edit ? <Check size={14} /> : <Pencil size={14} />}{" "}
          {edit ? "Finish editing" : "Edit section"}
        </Button>
      </div>
      {edit ? (
        <Editor section={id} />
      ) : (
        <div className="stack">
          <SectionBody id={id} />
          <Panel title="Session notes">
            <Input
              label="Notes for this section"
              multiline
              value={day.fields["note-" + id] || ""}
              placeholder="Add a note…"
              onSave={(v) => field(day, "note-" + id, v)}
            />
          </Panel>
        </div>
      )}
    </>
  );
}
