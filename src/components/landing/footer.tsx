import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-400">Cortex</span>
          <span className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <a
            href="https://github.com/DanielBlomma/cortex"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub — MIT License
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
