"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Community",
    price: "Free",
    period: "forever",
    description: "Open source, MIT licensed. Run Cortex locally with no cloud dependency.",
    cta: "Get Started",
    ctaHref: "https://github.com/DanielBlomma/cortex-enterprise",
    ctaExternal: true,
    highlighted: false,
    features: [
      "Local code indexing",
      "AI context filtering",
      "Project-level rules",
      "Local audit logs",
      "Community support",
    ],
  },
  {
    name: "Connected",
    price: "$30",
    period: "per developer / month",
    description:
      "Cloud dashboard for teams. Central rules, analytics, and compliance across all developers.",
    cta: "Start Free Trial",
    ctaHref: "/sign-up",
    ctaExternal: false,
    highlighted: true,
    features: [
      "Everything in Community",
      "Cloud dashboard & analytics",
      "Central policy management",
      "Telemetry aggregation",
      "License management",
      "Role-based access control",
      "SSO / SAML",
      "Audit trail export",
      "Priority support",
    ],
  },
  {
    name: "Air-Gapped",
    price: "Custom",
    period: "annual site license",
    description:
      "Complete offline deployment. Zero network traffic. Built-in AI model. Secure delivery.",
    cta: "Contact Sales",
    ctaHref: "mailto:sales@cortex.dev",
    ctaExternal: true,
    highlighted: false,
    features: [
      "Everything in Connected",
      "Zero network traffic",
      "Built-in AI model",
      "Offline license validation",
      "Secure package delivery",
      "Dedicated support channel",
      "Custom SLA",
    ],
  },
];

function PricingCard({
  plan,
  index,
}: {
  plan: (typeof plans)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className={`relative rounded-xl border p-6 flex flex-col ${
        plan.highlighted
          ? "border-blue-500/30 bg-gradient-to-b from-blue-500/[0.08] to-transparent scale-[1.02]"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
        <p className="text-sm text-zinc-500 mb-4">{plan.description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{plan.price}</span>
          {plan.period !== "forever" && (
            <span className="text-sm text-zinc-500">/ {plan.period}</span>
          )}
        </div>
      </div>

      {plan.ctaExternal ? (
        <a
          href={plan.ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors mb-6 ${
            plan.highlighted
              ? "bg-white text-black hover:bg-zinc-200"
              : "border border-white/10 text-zinc-300 hover:bg-white/5"
          }`}
        >
          {plan.cta}
        </a>
      ) : (
        <Link
          href={plan.ctaHref}
          className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors mb-6 ${
            plan.highlighted
              ? "bg-white text-black hover:bg-zinc-200"
              : "border border-white/10 text-zinc-300 hover:bg-white/5"
          }`}
        >
          {plan.cta}
        </Link>
      )}

      <ul className="space-y-3 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <span className="text-zinc-400">{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="py-32 px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-blue-400 tracking-widest uppercase mb-4 block">
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start free, scale with your team
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            The Community edition is free and open source. Add cloud governance
            when your team needs it.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <PricingCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
