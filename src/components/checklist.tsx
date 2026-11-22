"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { changeDay, db, write } from "@/lib/db";
import { applicable, responseKey } from "@/lib/rules";
import type { Item } from "@/lib/schema";
import { Panel, Input } from "./ui/forms";
import { Checkbox } from "./ui/forms";
export function Checklist({
  section,
  all = false,
}: {
  section: string;
  all?: boolean;
}) {
  const { items, day, pack } = useWorkspace();
  const nodes = items.filter(
    (i) => i.section === section && (all || applicable(i, day)),
  );
  function tree(parent: string): React.ReactNode {
    return nodes
      .filter((i) => i.parent === parent)
      .map((i) =>
        i.heading ? (
          <details className="tree" key={i.id} open>
            <summary>
              <ChevronRight size={14} />
              {i.text}
            </summary>
            <div>{tree(i.id)}</div>
          </details>
        ) : (
          <Row key={i.id} item={i} />
        ),
      );
  }
  return (
    <div className="checklist">
      {nodes.length ? (
        tree("")
      ) : (
        <p className="muted">
          {pack.label
            ? "No applicable items for this selection."
            : "Import your source plan in Settings to load this section."}
        </p>
      )}
    </div>
  );
}
function Row({ item }: { item: Item }) {
  const { day, items } = useWorkspace(),
    id = responseKey(item, items),
    value = day.answers[id];
  const set = (v: string) =>
    changeDay(day, (s) => {
      if (v === "Yes" || v === "No" || v === "N/A") s.answers[id] = v;
      else delete s.answers[id];
    });
  return (
    <div className="item-row">
      <label className="item-label">
        <Checkbox
          checked={value === "Yes"}
          onChange={(v) => set(v ? "Yes" : "")}
        />
        <span>{item.text}</span>
      </label>
      {item.mode !== "Reference" && (
        <select
          aria-label={"Response for " + item.text}
          className="item-status"
          value={value || ""}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">{item.mode}</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          {item.mode === "Optional" && <option>N/A</option>}
        </select>
      )}
    </div>
  );
}
export function Editor({ section }: { section: string }) {
  const { items, accounts } = useWorkspace();
  const nodes = items.filter((i) => i.section === section);
  const [editing, setEditing] = useState<string | null>(null);
  function add(parent: string, heading: boolean) {
    const id = crypto.randomUUID();
    void write(() =>
      db.items.add({
        id,
        section,
        parent,
        text: heading ? "New subsection" : "New item",
        mode: heading ? "Reference" : "Required",
        heading,
        model: "",
        account: "",
        order: Math.max(0, ...nodes.map((i) => i.order)) + 1,
        source: "User entry",
      }),
    ).then((ok) => {
      if (ok) setEditing(id);
    });
  }
  function remove(item: Item) {
    if (!confirm("Delete this item, its subsections and linked references?"))
      return;
    void write(() =>
      db.transaction("rw", db.items, async () => {
        const current = await db.items.toArray();
        const ids = new Set([item.id]);
        for (let n = 0; n < current.length; n++) {
          const size = ids.size;
          for (const i of current)
            if (ids.has(i.parent) || ids.has(i.ref || "")) ids.add(i.id);
          if (size === ids.size) break;
        }
        await db.items.bulkDelete([...ids]);
      }),
    );
  }
  function move(i: Item, direction: number) {
    const siblings = nodes.filter((x) => x.parent === i.parent),
      other = siblings[siblings.findIndex((x) => x.id === i.id) + direction];
    if (other)
      void write(() =>
        db.transaction("rw", db.items, async () => {
          await db.items.update(i.id, { order: other.order });
          await db.items.update(other.id, { order: i.order });
        }),
      );
  }
  function tree(parent: string): React.ReactNode {
    const children = nodes.filter((i) => i.parent === parent);
    return children.map((i, index) => (
      <div className="editor-node" key={i.id}>
        <div className="edit-line">
          <button
            className="text-button"
            onClick={() => setEditing(editing === i.id ? null : i.id)}
          >
            {i.text}
          </button>
          <div className="actions">
            <button
              aria-label={"Move " + i.text + " up"}
              disabled={!index}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              aria-label={"Move " + i.text + " down"}
              disabled={index === children.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
          </div>
        </div>
        {editing === i.id && (
          <div className="edit-fields">
            <Input
              label="Text"
              value={i.text}
              onSave={(text) =>
                text.trim() && write(() => db.items.update(i.id, { text }))
              }
            />
            {!i.heading && (
              <>
                <label className="field">
                  Requirement
                  <select
                    value={i.mode}
                    onChange={(e) =>
                      write(() =>
                        db.items.update(i.id, {
                          mode: e.target.value as Item["mode"],
                        }),
                      )
                    }
                  >
                    {[
                      "Required",
                      "Optional",
                      "Prohibited",
                      "Reference",
                      "Unconfigured",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Linked checklist response
                  <select
                    value={i.ref || ""}
                    onChange={(e) =>
                      write(() =>
                        db.items.update(i.id, {
                          ref: e.target.value || undefined,
                        }),
                      )
                    }
                  >
                    <option value="">Independent response</option>
                    {items
                      .filter((n) => n.id !== i.id && !n.heading && !n.ref)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.section} · {n.text}
                        </option>
                      ))}
                  </select>
                </label>
                <Input
                  label="Category"
                  value={i.category || ""}
                  onSave={(category) =>
                    write(() => db.items.update(i.id, { category }))
                  }
                />
                <label className="field">
                  Account scope
                  <select
                    value={i.account}
                    onChange={(e) =>
                      write(() =>
                        db.items.update(i.id, { account: e.target.value }),
                      )
                    }
                  >
                    <option value="">All accounts</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Entry model scope
                  <select
                    value={i.model}
                    onChange={(e) =>
                      write(() =>
                        db.items.update(i.id, { model: e.target.value }),
                      )
                    }
                  >
                    <option value="">All models</option>
                    {["Type 1", "Type 2(a)", "Type 2(b)", "Type 3"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <small>{i.source}</small>
            <div className="actions">
              {i.heading && (
                <>
                  <button onClick={() => add(i.id, false)}>Add item</button>
                  <button onClick={() => add(i.id, true)}>
                    Add subsection
                  </button>
                </>
              )}
              <button onClick={() => remove(i)}>Delete</button>
            </div>
          </div>
        )}
        {i.heading && <div className="indent">{tree(i.id)}</div>}
      </div>
    ));
  }
  return (
    <Panel title="Plan editor">
      <div className="actions">
        <button onClick={() => add("", true)}>Add subsection</button>
        <button onClick={() => add("", false)}>Add item</button>
      </div>
      {tree("")}
    </Panel>
  );
}
