"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      className="relative py-40 px-6 overflow-hidden"
      ref={ref}
      style={{
        backgroundImage: "url(/images/analyt.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/75" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
          Ready to govern your AI tools?
        </h2>
        <p className="text-zinc-400 max-w-lg mx-auto mb-10">
          Start with the free Community edition. Upgrade to Cloud when your
          team needs central management.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
        </div>
      </motion.div>
    </section>
  );
}
