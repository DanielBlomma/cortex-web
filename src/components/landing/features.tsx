"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    title: "Roll out AI without policy drift",
    description:
      "Set the enterprise guardrails once and keep them consistent across teams, repos, and AI tools. Cortex removes the guesswork from distributed configuration.",
  },
  {
    title: "Make the AI investment legible",
    description:
      "Show adoption, active instances, token savings, and rollout health in language leadership can use to justify continued investment.",
  },
  {
    title: "Turn governance into evidence",
    description:
      "Bring together workflow snapshots, audit events, reviews, and violations so security and audit teams can inspect a real operating model instead of a slide deck.",
  },
  {
    title: "Keep your code where it belongs",
    description:
      "The enterprise layer receives counts, rule identifiers, and operational evidence. It does not need your source code, file contents, or prompt history to do its job.",
  },
  {
    title: "Support compliance conversations earlier",
    description:
      "Use Cortex to support evidence and control narratives around GDPR, NIS2, ISO 27001, and ISO 42001 while keeping shared responsibility explicit.",
  },
  {
    title: "Fit both cloud and restricted environments",
    description:
      "Run a cloud dashboard for standard enterprise rollout or deploy air-gapped for restricted environments that still need governed AI development.",
  },
];

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="features"
      className="relative py-40 px-6 overflow-hidden"
      ref={ref}
      style={{
        backgroundImage: "url(/images/gov.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
            Features
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Why teams buy Cortex Enterprise
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            This is not just a local coding tool. It is a control plane for
            rolling out AI development with clearer accountability, stronger
            evidence, and less friction between engineering and governance.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800 rounded-lg overflow-hidden border border-zinc-800"
        >
          {features.map((feature) => (
            <div key={feature.title} className="bg-zinc-950 p-8">
              <h3 className="text-base font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
