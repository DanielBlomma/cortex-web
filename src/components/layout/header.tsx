"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { dark } from "@clerk/themes";

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname;

  return (
    <header className="h-14 border-b border-white/5 bg-[#0a0a0f] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl={currentUrl}
          afterSelectPersonalUrl={currentUrl}
          appearance={{
            baseTheme: dark,
            variables: {
              colorBackground: "#0d0d14",
              colorText: "#ffffff",
              colorTextSecondary: "#a1a1aa",
              colorInputBackground: "#1a1a24",
              colorInputText: "#ffffff",
              colorNeutral: "#ffffff",
            },
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "text-sm text-zinc-300 hover:text-white gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors",
              organizationSwitcherTriggerIcon: "text-zinc-500",
            },
          }}
        />
      </div>
      <UserButton />
    </header>
  );
}
