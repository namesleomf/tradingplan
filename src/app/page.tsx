"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { overviewPath } from "@/lib/source";
import { db } from "@/lib/db";
import { today, pages } from "@/data/navigation";
export default function Home() {
  const r = useRouter();
  useEffect(() => {
    async function open() {
      if (
        location.hash.startsWith("#plan=") ||
        location.hash.startsWith("#reader=")
      ) {
        const url = await overviewPath();
        if (url) {
          location.replace(url);
          return;
        }
      }
      const prefs = await Promise.race([
        db.prefs.get("interface"),
        new Promise<undefined>((resolve) => setTimeout(resolve, 1200)),
      ]);
      r.replace(
        (pages.find((p) => p.url === prefs?.landing)?.url ?? today) +
          location.hash,
      );
    }
    void open().catch(() => r.replace(today + location.hash));
  }, [r]);
  return (
    <main className="loading">
      Opening your plan…
      <noscript>
        {" "}
        Open the private full-plan page to read all sections without JavaScript.
      </noscript>
    </main>
  );
}
