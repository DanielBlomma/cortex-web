"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
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
          We&apos;re onboarding early teams now. Request an invite to get
          access to the cloud dashboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="mailto:daniel.blomma@gmail.com?subject=Request%20Invite"
            className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors text-sm"
          >
            Request Invite
          </a>
          <a
            href="https://github.com/DanielBlomma/cortex"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors text-sm font-medium"
          >
            GitHub — MIT License
          </a>
        </div>
      </motion.div>
    </section>
  );
}
