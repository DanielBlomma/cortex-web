"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  KeyRound,
  BarChart3,
  ShieldCheck,
  Users,
  ScrollText,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Policy Management",
    description:
      "Write organization-wide rules that automatically sync to every developer. AI assistants get governed context without devs changing their workflow.",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    description:
      "See searches, tokens saved, and active instances across all teams. The data you need to justify AI investment to leadership.",
  },
  {
    icon: KeyRound,
    title: "License Management",
    description:
      "Generate Ed25519-signed licenses for Connected and Air-Gapped deployments. Track status, expiry, and renewals from one place.",
  },
  {
    icon: ScrollText,
    title: "Audit Trail",
    description:
      "Every AI interaction is logged. Exportable reports for SOC2, ISO 27001, and internal compliance reviews.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Role-based access control with admin, developer, and readonly roles. SSO integration with your company identity provider.",
  },
  {
    icon: Globe,
    title: "Air-Gapped Support",
    description:
      "Generate offline license files for restricted environments. Full lifecycle tracking without any network requirement.",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-all duration-300"
    >
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/5 mb-4">
        <feature.icon className="h-5 w-5 text-blue-400" />
      </div>

      <h3 className="text-base font-semibold text-white mb-2">
        {feature.title}
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-32 px-6" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-blue-400 tracking-widest uppercase mb-4 block">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything you need to govern AI at scale
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Central control, local execution. Your developers use AI normally —
            Cortex handles governance in the background.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
