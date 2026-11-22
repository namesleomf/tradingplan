import {
  BookOpen,
  Brain,
  CalendarDays,
  Flag,
  Layers,
  ScanLine,
  ShieldCheck,
  NotebookPen,
  ArrowUpRight,
} from "lucide-react";
import { groups, pages, today } from "@/data/navigation";
import type { Item, Pack } from "@/lib/schema";

const icons = [
  Brain,
  Flag,
  CalendarDays,
  Layers,
  ScanLine,
  ShieldCheck,
  NotebookPen,
];
function Entries({ items, parent = "" }: { items: Item[]; parent?: string }) {
  return (
    <ul className="board-entries">
      {items
        .filter((i) => i.parent === parent)
        .map((i) => (
          <li key={i.id} className={i.heading ? "entry-heading" : ""}>
            {i.heading ? (
              <>
                <strong data-source={i.id}>{i.text}</strong>
                <Entries items={items} parent={i.id} />
              </>
            ) : (
              <span data-source={i.id}>{i.text}</span>
            )}
          </li>
        ))}
    </ul>
  );
}
export function PlanBoard({ pack, access }: { pack: Pack; access: string }) {
  const sessionLink = (url: string) =>
    url + (access === "local" ? "" : "#reader=" + access);
  return (
    <main className="plan-board" id="top">
      <header className="board-mast">
        <div className="board-brand">
          <span className="brand-icon">
            <BookOpen size={20} />
          </span>
          Trading Plan
        </div>
        <a className="board-action" href={sessionLink(today)}>
          Today’s Plan <ArrowUpRight size={15} />
        </a>
      </header>
      <div className="board-page">
        <header className="board-heading">
          <div>
            <h1>Full trading plan</h1>
            <p>
              {pages.length} sections <span>·</span>{" "}
              {pack.items.filter((i) => !i.ref).length} source entries
            </p>
          </div>
          <fieldset className="board-view">
            <legend>Card detail</legend>
            <div>
              <label>
                <input
                  type="radio"
                  name="board-view"
                  id="board-compact"
                  defaultChecked
                />
                Compact
              </label>
              <label>
                <input type="radio" name="board-view" id="board-full" />
                All entries
              </label>
            </div>
          </fieldset>
        </header>
        <nav className="board-index" aria-label="Jump to a group">
          {groups.map(([title, id]) => (
            <a key={id} href={"#group-" + id}>
              {title}
            </a>
          ))}
        </nav>
        <div className="board-groups">
          {groups.map(([name, group], idx) => {
            const Icon = icons[idx];
            return (
              <section
                className="board-group"
                key={group}
                id={"group-" + group}
              >
                <h2>
                  <Icon size={18} />
                  {name}
                </h2>
                <div className="board-grid">
                  {pages
                    .filter((p) => p.path === group)
                    .map((p) => {
                      const items = pack.items.filter(
                          (i) => i.section === p.id,
                        ),
                        preview = items.filter((i) => !i.heading).slice(0, 5),
                        long = items.length > 6;
                      return (
                        <article
                          key={p.id}
                          id={"card-" + p.id}
                          className={
                            "board-card " +
                            (items.length > 60
                              ? "board-xl"
                              : items.length > 25
                                ? "board-lg"
                                : "")
                          }
                        >
                          <header>
                            <h3>{p.title}</h3>
                            <a
                              href={sessionLink(p.url)}
                              aria-label={"Open " + p.title}
                            >
                              <ArrowUpRight size={16} />
                            </a>
                          </header>
                          {p.id === "entry-trigger" && (
                            <p className="board-note">
                              Confirmations linked from Entry Model.
                            </p>
                          )}
                          {long ? (
                            <>
                              <div className="board-preview">
                                <ul>
                                  {preview.map((i) => (
                                    <li key={i.id}>
                                      {i.parent && (
                                        <small>
                                          {
                                            items.find(
                                              (parent) =>
                                                parent.id === i.parent,
                                            )?.text
                                          }{" "}
                                          ·{" "}
                                        </small>
                                      )}
                                      {i.text}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <details className="board-more">
                                <summary>
                                  View all {items.length} entries
                                </summary>
                                <div className="board-tree">
                                  <Entries items={items} />
                                </div>
                              </details>
                              <div className="board-expanded">
                                <Entries items={items} />
                              </div>
                            </>
                          ) : (
                            <Entries items={items} />
                          )}
                        </article>
                      );
                    })}
                </div>
              </section>
            );
          })}
        </div>
        <footer className="board-footer">
          <span>{pack.label}</span>
          <a href="#top">Back to top</a>
        </footer>
      </div>
    </main>
  );
}
