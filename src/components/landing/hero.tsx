"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const terminalLines = [
  { prompt: true, text: "cortex enterprise summary" },
  {
    prompt: false,
    text: "Pilot:           42 developers across 9 repos",
  },
  { prompt: false, text: "Coverage:        100% policy sync on managed hosts" },
  { prompt: false, text: "Evidence:        audit, reviews, violations, workflow" },
  { prompt: false, text: "Compliance:      GDPR, NIS2, ISO 27001, ISO 42001" },
  { prompt: false, text: "" },
  { prompt: true, text: "cortex enterprise roi" },
  { prompt: false, text: "Usage:           891 governed AI searches this week" },
  { prompt: false, text: "Efficiency:      ~312k tokens saved with local context" },
  { prompt: false, text: "Status:          rollout ready for security review" },
];

const buyerSignals = [
  "Local execution by default",
  "Central policy control",
  "Audit-ready evidence",
  "Air-gapped deployment option",
];

const proofCards = [
  {
    label: "For security leaders",
    value: "Keep code local while proving which controls ran, where, and when.",
  },
  {
    label: "For engineering leadership",
    value: "Show adoption, token savings, review outcomes, and repo-level rollout health.",
  },
  {
    label: "For compliance teams",
    value: "Support evidence collection for GDPR, NIS2, ISO 27001, and ISO 42001.",
  },
];

function TerminalWindow() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <span className="ml-2 text-xs text-zinc-600 font-mono">
            terminal — cortex-enterprise
          </span>
        </div>
        <div className="p-5 font-mono text-sm leading-relaxed">
          {terminalLines.map((line, i) => (
            <div key={i} className="flex">
              {line.prompt ? (
                <>
                  <span className="text-zinc-500 select-none">$&nbsp;</span>
                  <span className="text-white">{line.text}</span>
                </>
              ) : (
                <span className="text-zinc-500">{line.text}&nbsp;</span>
              )}
            </div>
          ))}
          <div className="mt-1">
            <span className="text-zinc-500 select-none">$&nbsp;</span>
            <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Background video — client-only to avoid hydration mismatch */}
      {mounted && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        >
          <source src="/images/heromovie.mp4" type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />

      <div
        id="why-cortex"
        className="relative max-w-6xl mx-auto grid gap-16 items-center lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="text-center lg:text-left">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-xs uppercase tracking-widest text-zinc-500 mb-8"
        >
          Open source local runtime, enterprise control plane
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.02] text-white mb-6"
        >
          Roll out AI coding assistants without losing control
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-lg text-zinc-400 max-w-2xl mx-auto lg:mx-0 mb-5 leading-relaxed"
        >
          Cortex Enterprise gives security, platform, and engineering leaders
          one place to govern AI development, prove ROI, and show audit-ready
          evidence while developers keep working locally in the tools they
          already use.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm text-zinc-500 mb-8 max-w-2xl mx-auto lg:mx-0"
        >
          Built to support evidence and control expectations around GDPR, NIS2,
          ISO 27001, and ISO 42001 without forcing your source code into the
          cloud.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-12"
        >
          {buyerSignals.map((signal) => (
            <span
              key={signal}
              className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-300"
            >
              {signal}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
        >
          <a
            href="mailto:daniel.blomma@gmail.com?subject=Book%20Cortex%20Enterprise%20Intro"
            className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors text-sm"
          >
            Book Intro
          </a>
          <a
            href="#pricing"
            className="px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm font-medium"
          >
            See Pricing
          </a>
          <a
            href="https://github.com/DanielBlomma/cortex"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm font-medium"
          >
            View Open Source
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="grid gap-3 sm:grid-cols-3"
        >
          {proofCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 text-left"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-3">
                {card.label}
              </p>
              <p className="text-sm leading-relaxed text-zinc-300">
                {card.value}
              </p>
            </div>
          ))}
        </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative"
        >
          <TerminalWindow />
        </motion.div>
      </div>
    </section>
  );
}
