"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, initialize } from "@/lib/db";
import { today, pages } from "@/data/navigation";
export default function Home() {
  const r = useRouter();
  useEffect(() => {
    async function open() {
      await initialize();
      const prefs = await db.prefs.get("interface");
      r.replace(pages.find((p) => p.url === prefs?.landing)?.url ?? today);
    }
    void open().catch(() => r.replace(today));
  }, [r]);
  return <main className="loading">Opening your plan…</main>;
}
