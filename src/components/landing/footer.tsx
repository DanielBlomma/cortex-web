import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <span className="text-sm text-zinc-500">
            Cortex &copy; {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <a
            href="https://github.com/DanielBlomma/cortex-enterprise"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <Link href="/sign-in" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <a
            href="mailto:sales@cortex.dev"
            className="hover:text-white transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
