import "../board.css";
import { notFound } from "next/navigation";
import { readWorkbook } from "@/lib/reader-server";
import { PlanBoard } from "@/components/plan-board";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Full plan",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
} as const;
export default async function PlanReader({
  params,
}: {
  params: Promise<{ access: string }>;
}) {
  const { access } = await params;
  const pack = readWorkbook(access);
  if (!pack) notFound();
  return <PlanBoard pack={pack} access={access} />;
}
