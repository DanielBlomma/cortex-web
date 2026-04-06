"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Download, Copy, Check, Terminal, Apple, Monitor } from "lucide-react";

const installMethods = [
  {
    label: "npm (recommended)",
    icon: Terminal,
    command: "npm install -g @danielblomma/cortex-enterprise",
    description: "Works on macOS, Linux, and Windows with Node.js 18+",
  },
  {
    label: "macOS",
    icon: Apple,
    command: "brew install danielblomma/tap/cortex-enterprise",
    description: "Homebrew tap — installs the latest stable release",
  },
  {
    label: "Binary",
    icon: Monitor,
    command: null,
    description: "Download pre-built binaries for your platform",
    href: "https://github.com/DanielBlomma/cortex-enterprise/releases/latest",
  },
];

export function DownloadSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [copied, setCopied] = useState<number | null>(null);

  const copyCommand = (cmd: string, idx: number) => {
    void navigator.clipboard.writeText(cmd);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section id="download" className="py-32 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-mono text-blue-400 tracking-widest uppercase mb-4 block">
            Get Started
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Install cortex-enterprise
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            cortex-enterprise runs locally on each developer&apos;s machine. It
            indexes your codebase, gives AI assistants smart context, enforces
            your organization&apos;s policies, and reports usage back to this
            dashboard. Source code never leaves the machine.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          {installMethods.map((method, i) => (
            <div
              key={method.label}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 shrink-0 w-40">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center">
                  <method.icon className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-white">
                  {method.label}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {method.command ? (
                  <div className="relative group">
                    <pre className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 pr-12 text-sm text-zinc-300 font-mono overflow-x-auto">
                      {method.command}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyCommand(method.command!, i)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {copied === i ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-zinc-400" />
                      )}
                    </button>
                  </div>
                ) : (
                  <a
                    href={method.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download from GitHub Releases
                  </a>
                )}
                <p className="text-xs text-zinc-600 mt-2">
                  {method.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-3">
            What happens after install?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-400">
            <div>
              <span className="text-white font-medium">1. Index</span>
              <p className="mt-1">
                Cortex scans your repo and builds a local search index. This
                stays on your machine.
              </p>
            </div>
            <div>
              <span className="text-white font-medium">2. Connect</span>
              <p className="mt-1">
                Add your API key to{" "}
                <code className="text-zinc-300 bg-white/[0.06] px-1 py-0.5 rounded text-xs">
                  .context/enterprise.yaml
                </code>{" "}
                to sync policies and report usage.
              </p>
            </div>
            <div>
              <span className="text-white font-medium">3. Work</span>
              <p className="mt-1">
                AI assistants automatically get better context. Policies enforce
                in the background. No workflow changes.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
