"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DashboardHelpContent } from "@/lib/dashboard/help-content";

export function DashboardInfoButton({
  content,
  variant = "icon",
  label = "What is this?",
  className,
}: {
  content: DashboardHelpContent;
  variant?: "icon" | "pill";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant === "pill" ? "outline" : "ghost"}
        size={variant === "pill" ? "xs" : "icon-xs"}
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className={cn(
          variant === "pill"
            ? "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            : "text-zinc-500 hover:text-white",
          className
        )}
      >
        <Info className="h-3.5 w-3.5" />
        {variant === "pill" && <span>{label}</span>}
        {variant === "icon" && <span className="sr-only">{label}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#0d0d14] text-zinc-200 sm:max-w-xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-white">{content.title}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {content.summary}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {content.sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h3 className="text-sm font-medium text-white">
                  {section.title}
                </h3>
                <ul className="space-y-2 text-sm text-zinc-300">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
