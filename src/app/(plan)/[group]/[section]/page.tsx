import { notFound } from "next/navigation";
import { pages } from "@/data/navigation";
import { SectionPage } from "@/components/section-page";
type Props = { params: Promise<{ group: string; section: string }> };
export function generateStaticParams() {
  return pages.map((p) => ({ group: p.path, section: p.id }));
}
export const dynamicParams = false;
export async function generateMetadata({ params }: Props) {
  const { group, section } = await params;
  return {
    title: pages.find((x) => x.path === group && x.id === section)?.title,
  };
}
export default async function Page({ params }: Props) {
  const { group, section } = await params;
  const p = pages.find((x) => x.path === group && x.id === section);
  if (!p) notFound();
  return <SectionPage id={p.id} />;
}
