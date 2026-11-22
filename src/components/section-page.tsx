"use client";
import Link from "next/link";
import { BookOpen, ListChecks } from "lucide-react";
import { pages, entryModels } from "@/data/navigation";
import { useWorkspace } from "@/lib/workspace";
import { changeDay, field } from "@/lib/db";
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
import { Checklist } from "./checklist";
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
export function SectionBody({
  id,
  library = false,
}: {
  id: string;
  library?: boolean;
}) {
  const { day, account } = useWorkspace();
  const f = day.fields;
  const setup = [
    "validate-poi",
    "trading-model",
    "entry-model",
    "entry-confluence",
    "entry-trigger",
  ].includes(id);
  const sourceChecklist = (
    <Panel
      title={
        id === "entry-trigger"
          ? "Model-specific triggers"
          : id === "goals"
            ? "Trading goals"
            : "From your trading plan"
      }
    >
      {id === "entry-trigger" && (
        <p className="muted">
          The source column is blank. These confirmations come from Entry Model.
        </p>
      )}
      <Checklist section={id} all={library} />
    </Panel>
  );
  return (
    <div className="stack">
      {library && sourceChecklist}
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
          <Link href="/settings">Review the session window</Link>
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
          <Link href="/settings">Review the session risk limits</Link>
        </Panel>
      )}
      {!library && sourceChecklist}
      {setup && <Result />}
    </div>
  );
}
export function SectionPage({ id }: { id: string }) {
  const { day } = useWorkspace();
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
      </div>
      <div className="stack">
        <SectionBody id={id} library />
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
    </>
  );
}
