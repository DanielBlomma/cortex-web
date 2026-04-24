"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

function getScopeKey(orgId: string | null | undefined, userId: string | null | undefined) {
  if (orgId) return orgId;
  if (userId) return `personal_${userId}`;
  return "anonymous";
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoaded, orgId, userId } = useAuth();
  const scopeKey = getScopeKey(orgId, userId);
  const previousScopeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (previousScopeRef.current === null) {
      previousScopeRef.current = scopeKey;
      return;
    }

    if (previousScopeRef.current !== scopeKey) {
      previousScopeRef.current = scopeKey;
      router.refresh();
    }
  }, [isLoaded, router, scopeKey]);

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main key={scopeKey} className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
