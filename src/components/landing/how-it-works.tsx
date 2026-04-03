"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Terminal, Plug, LayoutDashboard } from "lucide-react";

const steps = [
  {
    icon: Terminal,
    step: "01",
    title: "Install locally",
    description:
      "Each developer installs cortex-enterprise. It indexes your codebase and runs entirely on the local machine. No code leaves the building.",
    code: "npm install -g cortex-enterprise",
  },
  {
    icon: Plug,
    step: "02",
    title: "Connect to cloud",
    description:
      "Point the local instance at your cortex-web dashboard with an API key. Rules sync down, usage stats flow up. Source code stays local.",
    code: `# .context/enterprise.yaml
telemetry:
  endpoint: https://your-portal.com/api/v1/telemetry/push
  api_key: ctx_7kR4mNpQ2xYz...`,
  },
  {
    icon: LayoutDashboard,
    step: "03",
    title: "Manage from dashboard",
    description:
      "Write organization rules, see usage analytics across all teams, generate licenses, and maintain audit trails — all from one place.",
    code: null,
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      className="relative"
    >
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-12 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-px">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: index * 0.2 + 0.4 }}
            className="h-px bg-gradient-to-r from-blue-500/40 to-violet-500/40 origin-left"
          />
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-colors">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/5">
            <step.icon className="h-5 w-5 text-blue-400" />
          </div>
          <span className="text-xs font-mono text-zinc-600">{step.step}</span>
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          {step.description}
        </p>

        {step.code && (
          <div className="rounded-lg bg-[#0a0a0f] border border-white/5 p-3 font-mono text-xs text-zinc-400 overflow-x-auto">
            <pre className="whitespace-pre">{step.code}</pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-32 px-6" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-blue-400 tracking-widest uppercase mb-4 block">
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Three steps to governed AI
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <StepCard key={step.step} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
