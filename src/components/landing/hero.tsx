"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const terminalLines = [
  { prompt: true, text: "cortex status" },
  { prompt: false, text: "License:    Acme Corp (connected, expires 2027-04-03)" },
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
      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden shadow-2xl shadow-blue-500/5">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-zinc-600 font-mono">
            terminal — cortex-enterprise
          </span>
        </div>
        <div className="p-5 font-mono text-sm leading-relaxed">
          {terminalLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
              className="flex"
            >
              {line.prompt ? (
                <>
                  <span className="text-blue-400 select-none">$&nbsp;</span>
                  <span className="text-green-400">{line.text}</span>
                </>
              ) : (
                <span className="text-zinc-400">{line.text}&nbsp;</span>
              )}
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ delay: 3, duration: 1, repeat: Infinity }}
            className="mt-1"
          >
            <span className="text-blue-400 select-none">$&nbsp;</span>
            <span className="inline-block w-2 h-4 bg-blue-400" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Gradient orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-600/20 via-violet-600/10 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-zinc-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Open Source &middot; MIT Licensed
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
        >
          <span className="text-white">Govern your AI</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
            coding assistants
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Cortex gives your organization control over what AI tools see,
          measures what they save you, and proves to auditors what they did.
          Source code never leaves the machine.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            href="/sign-up"
            className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 transition-colors text-sm"
          >
            Start Free Trial
          </Link>
          <a
            href="https://github.com/DanielBlomma/cortex-enterprise"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors text-sm font-medium"
          >
            View on GitHub
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <TerminalWindow />
        </motion.div>
      </div>
    </section>
  );
}
