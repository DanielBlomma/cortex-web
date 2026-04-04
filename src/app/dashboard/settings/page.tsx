"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Organization settings and member management.
        </p>
      </div>
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
    </div>
  );
}
