"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const sent = [
  '"Cortex was used 47 times today"',
  '"Estimated 12,000 tokens saved"',
  '"Index is 94% fresh"',
  '"These 3 rules were applied"',
];

const neverSent = [
  "Your source code",
  "File contents",
  "What the developer searched for",
  "The AI\u2019s generated code",
];

export function Trust() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-40 px-6" ref={ref}>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Your code never leaves the machine
          </h2>
          <p className="text-zinc-400">
            The cloud only sees numbers and rule names. Here&apos;s exactly what
            that means.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800 rounded-lg overflow-hidden border border-zinc-800"
        >
          <div className="bg-zinc-950 p-8">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-6">
              What is sent
            </h3>
            <ul className="space-y-4">
              {sent.map((item) => (
                <li key={item} className="text-sm text-zinc-500 font-mono">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-950 p-8">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-6">
              What is never sent
            </h3>
            <ul className="space-y-4">
              {neverSent.map((item) => (
                <li key={item} className="text-sm text-white font-medium">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
