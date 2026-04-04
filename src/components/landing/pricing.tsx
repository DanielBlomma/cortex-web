"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Community",
    price: "Free",
    period: null,
    monthly: null,
    description:
      "Open source, MIT licensed. Run Cortex locally with no cloud dependency.",
    cta: "Get Started",
    ctaHref: "https://github.com/DanielBlomma/cortex-web",
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
    name: "Cloud",
    price: "$30",
    period: "per developer / month",
    monthly: null,
    description:
      "Cloud dashboard for teams. Central rules, analytics, and compliance.",
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
    price: "$25,000",
    period: "per year",
    monthly: "$2,200/mo billed monthly",
    description:
      "Complete offline deployment. Zero network traffic. Built-in AI model.",
    cta: "Contact Sales",
    ctaHref: "mailto:sales@cortex.dev",
    ctaExternal: true,
    highlighted: false,
    features: [
      "Everything in Cloud",
      "Zero network traffic",
      "Built-in AI model",
      "Offline license validation",
      "Secure package delivery",
      "Dedicated support channel",
      "Custom SLA",
    ],
  },
];

function PricingCard({ plan }: { plan: (typeof plans)[0] }) {
  const button = (
    <span
      className={`block text-center py-2.5 rounded-full text-sm font-medium transition-colors mb-8 ${
        plan.highlighted
          ? "bg-white text-black hover:bg-zinc-200"
          : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
      }`}
    >
      {plan.cta}
    </span>
  );

  return (
    <div
      className={`flex flex-col p-8 ${
        plan.highlighted ? "bg-zinc-900" : "bg-zinc-950"
      }`}
    >
      {plan.highlighted && (
        <span className="text-xs uppercase tracking-widest text-zinc-400 mb-4">
          Most Popular
        </span>
      )}

      <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
      <p className="text-sm text-zinc-500 mb-6">{plan.description}</p>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white tracking-tight">
          {plan.price}
        </span>
        {plan.period && (
          <span className="text-sm text-zinc-500 ml-1">/ {plan.period}</span>
        )}
        {plan.monthly && (
          <p className="text-xs text-zinc-600 mt-1">{plan.monthly}</p>
        )}
      </div>

      {plan.ctaExternal ? (
        <a
          href={plan.ctaHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {button}
        </a>
      ) : (
        <Link href={plan.ctaHref}>{button}</Link>
      )}

      <ul className="space-y-3 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0" />
            <span className="text-zinc-400">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="py-40 px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Start free, scale with your team
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            The Community edition is free and open source. Add cloud governance
            when your team needs it.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-800 rounded-lg overflow-hidden border border-zinc-800"
        >
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
