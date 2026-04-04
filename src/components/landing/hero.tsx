"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

const terminalLines = [
  { prompt: true, text: "cortex status" },
  {
    prompt: false,
    text: "License:    Acme Corp (cloud, expires 2027-04-03)",
  },
  { prompt: false, text: "Repos:      12 / 50 indexed" },
  { prompt: false, text: "Rules:      8 org policies synced" },
  { prompt: false, text: "Telemetry:  last push 3m ago" },
  { prompt: false, text: "" },
  { prompt: true, text: "cortex analytics" },
  { prompt: false, text: "Today:  142 searches, ~45k tokens saved" },
  { prompt: false, text: "Week:   891 searches, ~312k tokens saved" },
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
  useEffect(() => setMounted(true), []);

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

      <div className="relative max-w-3xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-xs uppercase tracking-widest text-zinc-500 mb-8"
        >
          Open Source &middot; MIT Licensed
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] text-white mb-6"
        >
          Know what your AI tools are doing
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-lg text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed"
        >
          Your developers use AI coding assistants every day. Cortex gives you
          control over what they see, measures what they save, and proves to
          auditors what they did.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm text-zinc-500 mb-12"
        >
          Source code never leaves the machine.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <Link
            href="/sign-up"
            className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors text-sm"
          >
            Start Free Trial
          </Link>
          <a
            href="https://github.com/DanielBlomma/cortex-web"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm font-medium"
          >
            View on GitHub
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <TerminalWindow />
        </motion.div>
      </div>
    </section>
  );
}
