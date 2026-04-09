"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export function Header() {
  return (
    <header className="h-14 border-b border-white/5 bg-[#0a0a0f] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            baseTheme: dark,
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "text-sm text-zinc-300 hover:text-white gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors",
              organizationPreviewMainIdentifier:
                "text-sm font-medium !text-white",
              organizationPreviewSecondaryIdentifier: "hidden",
              organizationSwitcherTriggerIcon: "text-zinc-500",
              organizationPreview: "gap-2",
              organizationSwitcherPopoverCard:
                "!bg-[#0d0d14] !border-white/10",
              organizationPreviewTextContainer: "[&>*]:!text-white",
            },
          }}
        />
      </div>
      <UserButton />
    </header>
  );
}
