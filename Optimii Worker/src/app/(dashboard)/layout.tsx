import { AppShell } from "@/components/layout";
import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <CommandPalette />
    </AppShell>
  );
}





