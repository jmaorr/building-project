import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout";
import { CommandPalette } from "@/components/command-palette";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user needs to complete onboarding
  const user = await getCurrentUser();

  if (user) {
    const org = await getActiveOrganization();
    if (!org) {
      // User exists but has no organization - redirect to onboarding
      redirect("/onboarding");
    }
  }

  return (
    <AppShell>
      {children}
      <CommandPalette />
    </AppShell>
  );
}

