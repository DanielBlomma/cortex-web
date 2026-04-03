"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="h-14 border-b border-white/5 bg-[#0a0a0f] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "text-sm text-zinc-300 hover:text-white",
            },
          }}
        />
      </div>
      <UserButton />
    </header>
  );
}
