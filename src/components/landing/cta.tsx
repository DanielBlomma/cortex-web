"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 px-6" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center relative"
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-blue-600/10 rounded-3xl blur-3xl -z-10" />

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to govern your AI tools?
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-8">
            Start with the free Community edition. Upgrade to Connected when
            your team needs central management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
          </div>
        </div>
      </motion.div>
    </section>
  );
}
