"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    step: "01",
    title: "Start with a controlled pilot",
    description:
      "Onboard one team or one business-critical repo first. Developers keep working locally, while leadership gets visibility into adoption, savings, and risk before broad rollout.",
    supporting: "Good for proving value before procurement expands scope.",
  },
  {
    step: "02",
    title: "Set guardrails once",
    description:
      "Publish policy, workflow expectations, and review controls centrally. Cortex keeps those controls consistent across repos and AI tools instead of relying on every team to configure them correctly.",
    supporting: "One enterprise policy layer, many developer workflows.",
  },
  {
    step: "03",
    title: "Show the evidence",
    description:
      "When security, audit, or procurement asks how AI is governed, Cortex gives you telemetry, reviews, workflow snapshots, audit trails, and repo-level violations in one place.",
    supporting: "The conversation shifts from promises to evidence.",
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
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            A faster path from AI experimentation to approved rollout
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            The public site should answer a buyer&apos;s question quickly:
            how do we adopt AI coding at speed without creating a governance
            gap?
          </p>
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

              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                {step.supporting}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
