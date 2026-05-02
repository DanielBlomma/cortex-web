import { cn } from "@/lib/utils";

type CortexLogoProps = {
  className?: string;
  markClassName?: string;
  titleClassName?: string;
  taglineClassName?: string;
  compact?: boolean;
};

const nodes = [
  { x: 32, y: 6, lineX: 32, lineY: 15, fill: "url(#cortex-node-1)" },
  { x: 49, y: 13, lineX: 42.5, lineY: 19.5, fill: "url(#cortex-node-2)" },
  { x: 58, y: 32, lineX: 49, lineY: 32, fill: "url(#cortex-node-3)" },
  { x: 49, y: 51, lineX: 42.5, lineY: 44.5, fill: "url(#cortex-node-4)" },
  { x: 32, y: 58, lineX: 32, lineY: 49, fill: "url(#cortex-node-5)" },
  { x: 15, y: 51, lineX: 21.5, lineY: 44.5, fill: "url(#cortex-node-6)" },
  { x: 6, y: 32, lineX: 15, lineY: 32, fill: "url(#cortex-node-7)" },
  { x: 15, y: 13, lineX: 21.5, lineY: 19.5, fill: "url(#cortex-node-8)" },
];

function CortexMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("h-11 w-11 shrink-0 drop-shadow-[0_0_28px_rgba(99,102,241,0.38)]", className)}
    >
      <defs>
        <radialGradient id="cortex-core" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#fdfbff" />
          <stop offset="38%" stopColor="#dac2ff" />
          <stop offset="72%" stopColor="#9c6dff" />
          <stop offset="100%" stopColor="#4f46e5" />
        </radialGradient>
        <linearGradient id="cortex-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="cortex-line" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="cortex-node-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d0fe" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="cortex-node-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="cortex-node-3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="cortex-node-4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="cortex-node-5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="cortex-node-6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="cortex-node-7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d0fe" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="cortex-node-8" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="28" fill="rgba(79,70,229,0.06)" />

      {nodes.map((node, index) => (
        <g key={`${node.x}-${node.y}-${index}`}>
          <line
            x1="32"
            y1="32"
            x2={node.lineX}
            y2={node.lineY}
            stroke="url(#cortex-line)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle
            cx={node.x}
            cy={node.y}
            r="4.4"
            fill={node.fill}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="0.8"
          />
        </g>
      ))}

      <circle cx="32" cy="32" r="17" fill="url(#cortex-ring)" opacity="0.24" />
      <circle cx="32" cy="32" r="15" fill="rgba(79,70,229,0.12)" stroke="url(#cortex-ring)" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="9.5" fill="url(#cortex-core)" />
      <circle cx="32" cy="32" r="3" fill="#ffffff" opacity="0.96" />
    </svg>
  );
}

export function CortexLogo({
  className,
  markClassName,
  titleClassName,
  taglineClassName,
  compact = false,
}: CortexLogoProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compact ? "gap-2.5" : "gap-3.5",
        className,
      )}
    >
      <CortexMark className={markClassName} />
      <div className="min-w-0">
        <div
          className={cn(
            "font-semibold uppercase tracking-[0.34em] text-white",
            compact ? "text-[0.8rem]" : "text-sm",
            titleClassName,
          )}
        >
          Cortex
        </div>
        <div
          className={cn(
            "mt-1 bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent",
            compact ? "text-[11px]" : "text-xs",
            taglineClassName,
          )}
        >
          Cortex is running.
        </div>
      </div>
    </div>
  );
}
