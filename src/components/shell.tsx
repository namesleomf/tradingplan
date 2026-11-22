"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  Flag,
  CalendarDays,
  Layers,
  ScanLine,
  ShieldCheck,
  NotebookPen,
  PanelLeft,
  Settings,
  ChevronDown,
  ChevronRight,
  Route,
  Wallet,
  Check,
  HardDrive,
  Clock3,
  Menu,
  X,
} from "lucide-react";
import { groups, pages, today } from "@/data/navigation";
import { pref, useSave } from "@/lib/db";
import { useWorkspace } from "@/lib/workspace";
import { nyTime } from "@/lib/rules";
import { Button } from "./ui/button";
const icons = [
  Brain,
  Flag,
  CalendarDays,
  Layers,
  ScanLine,
  ShieldCheck,
  NotebookPen,
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { prefs, accounts, account, now } = useWorkspace(),
    page = pages.find((p) => p.url === path);
  const side = useRef<HTMLElement>(null);
  const [drawer, setDrawer] = useState(false);
  const pending = useSave((s) => s.pending),
    error = useSave((s) => s.error);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement as HTMLElement | null;
    const nav = side.current;
    const links = () =>
      Array.from(
        nav?.querySelectorAll<HTMLElement>("a[href],button:not([disabled])") ??
          [],
      ).filter((e) => e.offsetParent !== null);
    links()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const targets = links();
      if (e.shiftKey && document.activeElement === targets[0]) {
        e.preventDefault();
        targets.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === targets.at(-1)) {
        e.preventDefault();
        targets[0]?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [drawer]);
  const title =
    page?.title ?? (path === "/settings" ? "Settings" : "Guided Workflow");
  function toggleGroup(id: string) {
    const values = prefs.expanded.includes(id)
      ? prefs.expanded.filter((x) => x !== id)
      : [...prefs.expanded, id];
    void pref({
      expanded: prefs.collapsed
        ? [...new Set([...prefs.expanded, id])]
        : values,
      collapsed: false,
    });
  }
  return (
    <div
      className={
        "shell " +
        (prefs.collapsed ? "compact " : "") +
        (drawer ? "drawer-open" : "")
      }
    >
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      {drawer && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside ref={side} className="sidebar" aria-label="Plan navigation">
        <Link
          href={today}
          onClick={() => setDrawer(false)}
          className="brand"
          title="Trading Plan"
        >
          <span className="brand-icon">
            <BookOpen size={20} />
          </span>
          <span className="brand-text">Trading Plan</span>
        </Link>
        <nav
          className="side-scroll"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setDrawer(false);
          }}
        >
          <div className="nav-caption">Workspace</div>
          <Link
            className={"nav-line quick " + (path === today ? "active" : "")}
            aria-current={path === today ? "page" : undefined}
            href={today}
            title="Today's Plan"
          >
            <CalendarDays /> <span>Today’s Plan</span>
          </Link>
          <Link
            className={
              "nav-line quick " + (path === "/workflow" ? "active" : "")
            }
            href="/workflow"
            title="Guided Workflow"
          >
            <Route />
            <span>Guided Workflow</span>
          </Link>
          <div className="side-divider" />
          <div className="nav-caption">Plan library</div>
          {groups.map(([name, id], i) => {
            const Icon = icons[i],
              open = prefs.expanded.includes(id);
            return (
              <div key={id}>
                <button
                  className="nav-line"
                  onClick={() => toggleGroup(id)}
                  title={name}
                  aria-expanded={open && !prefs.collapsed}
                >
                  <Icon />
                  <span>{name}</span>
                  {open ? (
                    <ChevronDown className="chev" />
                  ) : (
                    <ChevronRight className="chev" />
                  )}
                </button>
                {open && (
                  <div className="subnav">
                    {pages
                      .filter((p) => p.path === id)
                      .map((p) => (
                        <Link
                          key={p.id}
                          href={p.url}
                          className={path === p.url ? "selected" : ""}
                          aria-current={path === p.url ? "page" : undefined}
                        >
                          {p.title}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <footer className="side-footer">
          <Link
            className="nav-line"
            href="/settings"
            onClick={() => setDrawer(false)}
            title="Settings"
          >
            <Settings />
            <span>Settings</span>
          </Link>
          <div className="local">
            <HardDrive size={14} />
            <span>Local workspace</span>
          </div>
        </footer>
      </aside>
      <div className="main-col" inert={drawer}>
        <header className="topbar">
          <Button
            size="icon"
            variant="ghost"
            className="desktop-toggle"
            aria-label="Toggle sidebar"
            onClick={() => pref({ collapsed: !prefs.collapsed })}
          >
            <PanelLeft />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setDrawer(!drawer)}
          >
            {drawer ? <X /> : <Menu />}
          </Button>
          <div className="crumb">
            <span>{page?.group ?? "Workspace"}</span>
            <ChevronRight size={13} />
            <b>{title}</b>
          </div>
          <div className="top-right">
            <label className="account-switch">
              <Wallet size={15} />
              <select
                aria-label="Active trading account"
                value={account.id}
                onChange={(e) => pref({ active: e.target.value })}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </label>
            <Link href="/settings" aria-label="Open settings">
              <Settings size={17} />
            </Link>
          </div>
        </header>
        <main id="content" className="content" key={account.id}>
          {children}
        </main>
        <footer className="main-footer">
          <span>
            <Check size={14} />
            {error
              ? "Save error"
              : pending
                ? "Saving…"
                : "Saved on this device"}
          </span>
          <span>
            <Clock3 size={13} />
            {nyTime(now)} New York
          </span>
        </footer>
      </div>
    </div>
  );
}
