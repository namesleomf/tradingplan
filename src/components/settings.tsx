"use client";
import { useState } from "react";
import { Settings2, Database, Download, Upload } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { pages } from "@/data/navigation";
import { pref, exportData, restoreSessions, changeDay } from "@/lib/db";
import { Panel, Select } from "./ui/forms";
import { Checkbox } from "./ui/forms";
import { Button } from "./ui/button";
import { Accounts } from "./accounts";
export function SettingsPage() {
  const { prefs, day, pack } = useWorkspace();
  const [tab, setTab] = useState("Accounts"),
    [message, setMessage] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Settings2 size={14} />
            Workspace
          </div>
          <h1>Settings</h1>
          <p>Review your accounts, session data and navigation preferences.</p>
        </div>
      </div>
      <div className="tabs">
        {["Accounts", "Data", "Interface"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Accounts" && <Accounts />}
      {tab === "Interface" && (
        <Panel title="Navigation preferences">
          <Select
            label="Default landing page"
            value={prefs.landing}
            options={pages.map((p) => [p.url, p.title])}
            onChange={(v) => v && pref({ landing: v })}
          />
          <label className="confirm">
            <Checkbox
              checked={prefs.collapsed}
              onChange={(checked) => pref({ collapsed: checked })}
            />
            Use icon-only sidebar
          </label>
        </Panel>
      )}
      {tab === "Data" && (
        <div className="stack">
          <Panel title="Session backup" icon={<Database />}>
            <div className="actions">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const blob = new Blob(
                      [JSON.stringify(await exportData(), null, 2)],
                      { type: "application/json" },
                    );
                    const url = URL.createObjectURL(blob),
                      a = document.createElement("a");
                    a.href = url;
                    a.download = "trading-plan-backup.json";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  } catch {
                    setMessage("Unable to export data.");
                  }
                }}
              >
                <Download size={14} />
                Export backup
              </Button>
              <label className="button outline file-button">
                <Upload size={14} />
                Restore session backup
                <input
                  type="file"
                  accept=".json,application/json"
                  aria-label="Restore session backup"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    if (
                      !confirm(
                        "Replace saved sessions and preferences with this backup?",
                      )
                    )
                      return;
                    try {
                      await restoreSessions(JSON.parse(await f.text()));
                      setMessage("Sessions restored.");
                    } catch (err) {
                      setMessage(
                        "Restore failed. " +
                          (err instanceof Error
                            ? err.message
                            : "Invalid file."),
                      );
                    }
                  }}
                />
              </label>
            </div>
            <p role="status" className="muted">
              {message}
            </p>
          </Panel>
          <Panel title="Source coverage">
            <p>
              {pack.items.filter((i) => !i.ref).length} original entries ·{" "}
              {pack.items.filter((i) => i.ref).length} linked references
            </p>
            {pack.conflicts.map((t) => (
              <p key={t} className="review-note">
                {t}
              </p>
            ))}
            {pack.label && (
              <details className="tree">
                <summary>Browse source mapping</summary>
                {pages.map((p) => (
                  <details className="tree" key={p.id}>
                    <summary>{p.title}</summary>
                    {pack.items
                      .filter((i) => i.section === p.id)
                      .map((i) => (
                        <p key={i.id}>
                          <small>
                            {i.source} · {i.id}
                          </small>
                          <br />
                          {i.text}
                        </p>
                      ))}
                  </details>
                ))}
              </details>
            )}
          </Panel>
          <Panel title="Daily checklist">
            <div className="actions">
              <Button
                variant="outline"
                onClick={() =>
                  confirm(
                    "Clear today’s checklist answers and confirmations for this account?",
                  ) &&
                  changeDay(day, (s) => {
                    s.answers = {};
                    for (const key of Object.keys(s.fields))
                      if (key.startsWith("applicability-"))
                        delete s.fields[key];
                    s.step = 0;
                    for (const k of [
                      "calendar",
                      "news",
                      "newsTime",
                      "riskReviewed",
                      "prepared",
                    ])
                      delete s.fields[k];
                  })
                }
              >
                Reset daily checklists
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
