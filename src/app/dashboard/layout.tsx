import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getOwnerId } from "@/lib/auth/owner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await getOwnerId();

  if (!owner) {
    redirect("/sign-in");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
