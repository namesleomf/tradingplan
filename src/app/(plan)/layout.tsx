import { Workspace } from "@/lib/workspace";
import { Shell } from "@/components/shell";
export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Workspace>
      <Shell>{children}</Shell>
    </Workspace>
  );
}
