"use client";
import { useEffect, useState } from "react";
import { Settings2, Database, Download, Upload } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { pages } from "@/data/navigation";
import {
  pref,
  write,
  restore,
  exportData,
  importData,
  changeDay,
} from "@/lib/db";
import { Panel, Select } from "./ui/forms";
import { Checkbox } from "./ui/forms";
import { Button } from "./ui/button";
import { Editor } from "./checklist";
import { Accounts } from "./accounts";
export function SettingsPage() {
  const { prefs, day, pack } = useWorkspace();
  const [tab, setTab] = useState("Accounts"),
    [section, setSection] = useState("psychology"),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (location.hash === "#import") setTab("Data");
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Settings2 size={14} />
            Workspace
          </div>
          <h1>Settings</h1>
          <p>Manage your accounts, plan content and local data.</p>
        </div>
      </div>
      <div className="tabs">
        {["Accounts", "Plan editor", "Data", "Interface"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Accounts" && <Accounts />}
      {tab === "Plan editor" && (
        <div className="stack">
          <Select
            label="Plan section"
            value={section}
            options={pages.map((p) => [p.id, p.title])}
            onChange={(v) => v && setSection(v)}
          />
          <Editor section={section} />
        </div>
      )}
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
          <Panel title="Plan data" icon={<Database />}>
            <p>{pack.label || "No source plan imported."}</p>
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
                Import plan or backup
                <input
                  type="file"
                  accept=".json,application/json"
                  aria-label="Import plan or backup"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    if (
                      !confirm(
                        "Replace local plan data, accounts and sessions with this file?",
                      )
                    )
                      return;
                    try {
                      await importData(JSON.parse(await f.text()));
                      setMessage("Import complete.");
                    } catch (err) {
                      setMessage(
                        "Import failed. " +
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
          <Panel title="Restore and reset">
            <div className="actions">
              <Button
                variant="outline"
                onClick={() =>
                  confirm(
                    "Restore plan text and requirements from the imported original and clear checklist answers?",
                  ) && write(restore)
                }
              >
                Restore original plan
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  confirm(
                    "Clear today’s checklist answers and confirmations for this account?",
                  ) &&
                  changeDay(day, (s) => {
                    s.answers = {};
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
