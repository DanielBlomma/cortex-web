"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    step: "01",
    title: "Install locally",
    description:
      "Each developer installs Cortex. It indexes your codebase and runs entirely on their machine. No code leaves the building.",
    code: "npm install -g @danielblomma/cortex-enterprise",
    download: true,
  },
  {
    step: "02",
    title: "Connect to your dashboard",
    description:
      "Point the local instance at your dashboard with an API key. Rules sync down, usage stats flow up. Source code stays local.",
    code: `# .context/enterprise.yaml
telemetry:
  endpoint: https://your-portal.com/api/v1/telemetry/push
  api_key: ctx_7kR4mNpQ2xYz...`,
  },
  {
    step: "03",
    title: "Manage from one place",
    description:
      "Write organization rules, see usage across all teams, generate licenses, and maintain audit trails — all from one dashboard.",
    code: null,
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-40 px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Three steps to governed AI
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-zinc-800 rounded-lg overflow-hidden border border-zinc-800"
        >
          {steps.map((step) => (
            <div key={step.step} className="bg-zinc-950 p-8">
              <span className="text-xs font-mono text-zinc-600 mb-4 block">
                {step.step}
              </span>

              <h3 className="text-lg font-semibold text-white mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                {step.description}
              </p>

              {step.code && (
                <div className="space-y-3">
                  <div className="rounded-md bg-[#0a0a0f] border border-zinc-800 p-3 font-mono text-xs text-zinc-500 overflow-x-auto">
                    <pre className="whitespace-pre">{step.code}</pre>
                  </div>
                  {"download" in step && step.download && (
                    <a
                      href="https://github.com/DanielBlomma/cortex-enterprise/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Or download from GitHub Releases &rarr;
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
