"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    title: "Rules that apply everywhere",
    description:
      "Write a rule once. It applies to every developer, every repo, every AI tool — automatically. No need to trust that each team configured things correctly.",
  },
  {
    title: "Prove the ROI",
    description:
      "See searches, tokens saved, and active instances across all teams. The data you need to justify AI investment to leadership.",
  },
  {
    title: "Audit-ready from day one",
    description:
      "Every AI interaction is logged. When an auditor asks how you govern your AI tools, you have a complete, searchable answer.",
  },
  {
    title: "Your code stays put",
    description:
      "The cloud only sees numbers and rule names. Never source code, never file contents, never what the developer searched for.",
  },
  {
    title: "Governed workflow, not vague guidance",
    description:
      "Developers keep their AI tools, but Cortex adds an explicit plan, review, iterate, and approve loop that produces evidence instead of ad hoc chat logs.",
  },
  {
    title: "Air-gapped ready",
    description:
      "Complete offline deployment for restricted environments. Zero network traffic. Built-in AI model. Everything in one package.",
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
            Central control, local execution
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Developers keep local execution and high-signal context while the
            enterprise layer adds policy, workflow, audit, and reporting.
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
