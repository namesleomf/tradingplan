"use client";
import { ChevronRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { changeDay, field } from "@/lib/db";
import { applicable, responseKey, sessionRequirement } from "@/lib/rules";
import type { Item } from "@/lib/schema";
import { Checkbox } from "./ui/forms";
export function Checklist({
  section,
  all = false,
}: {
  section: string;
  all?: boolean;
}) {
  const { items, day } = useWorkspace();
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
    <div className={all ? "checklist checklist-cards" : "checklist"}>
      {nodes.length ? (
        tree("")
      ) : (
        <p className="muted">No applicable items for this selection.</p>
      )}
    </div>
  );
}
function Row({ item }: { item: Item }) {
  const { day, items } = useWorkspace(),
    id = responseKey(item, items),
    value = day.answers[id];
  const mode = sessionRequirement(item, day);
  const set = (v: string) =>
    changeDay(day, (s) => {
      if (v === "Yes" || v === "No" || v === "N/A") s.answers[id] = v;
      else delete s.answers[id];
    });
  if (!applicable(item, day))
    return (
      <div className="item-row">
        <span>{item.text}</span>
        <small>{item.model || item.workspace || item.account}</small>
      </div>
    );
  return (
    <div className="item-row">
      <label className="item-label">
        <Checkbox
          checked={value === "Yes"}
          onChange={(v) => set(v ? "Yes" : "")}
        />
        <span>{item.text}</span>
      </label>
      {item.mode === "Unconfigured" && (
        <select
          aria-label={"Applicability today for " + item.text}
          className="item-status"
          value={day.fields["applicability-" + item.id] || ""}
          onChange={(e) =>
            field(day, "applicability-" + item.id, e.target.value)
          }
        >
          <option value="">Applicability today</option>
          {["Required", "Optional", "Not applicable"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      )}
      {mode !== "Reference" && mode !== "Not applicable" && (
        <select
          aria-label={"Response for " + item.text}
          className="item-status"
          value={value || ""}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">{mode}</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          {mode === "Optional" && <option>N/A</option>}
        </select>
      )}
    </div>
  );
}
