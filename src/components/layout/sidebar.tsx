"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import {
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Key,
  CreditCard,
  FileText,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/violations", label: "Violations", icon: ShieldAlert },
  { href: "/dashboard/policies", label: "Policies / Rules", icon: ShieldCheck },
  { href: "/dashboard/reports", label: "Compliance", icon: FileText },
  { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 border-r border-white/5 bg-[#0a0a0f] p-4">
        <Link href="/" className="flex items-center gap-2 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-white">Cortex</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-white/5 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
              "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>
      </aside>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-white/10 bg-[#0d0d14] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Settings</DialogTitle>
          </DialogHeader>
          <OrganizationProfile
            appearance={{
              baseTheme: dark,
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "bg-transparent shadow-none border-0",
              },
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
