# Parser Roadmap

## Status

The Cortex ingest pipeline supports multiple source languages through pluggable parser modules in `scripts/parsers/`. This document captures which parsers are canonical today and what is planned, so behavioral parity between languages is an explicit decision rather than an accident.

The standing rule is **parser parity**: a fix or enrichment that improves one language's chunk/call/import extraction must be carried over to all supported languages, so no language becomes a second-class citizen in search and graph results.

## Current parser stack

| Language          | Module(s)                                                  | Implementation             | Notes                                                                 |
| ----------------- | ---------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| JavaScript / TypeScript | `scripts/parsers/javascript.mjs` (+ `javascript/*.mjs`) | acorn + acorn-typescript   | Modular: `ast`, `chunks`, `calls`, `imports`. Canonical.              |
| C#                | `scripts/parsers/dotnet/CSharpParser/`                     | Roslyn sidecar             | Published-DLL execution path, cached.                                 |
| VB.NET            | `scripts/parsers/dotnet/VbNetParser/` + `vbnet.mjs`        | Roslyn sidecar             | Same publish-DLL pattern as C#. Canonical for VB.                     |
| Rust              | `scripts/parsers/rust.mjs` (regex) + `rust-treesitter.mjs` | regex **or** tree-sitter   | **Pilot for tree-sitter.** Dispatcher in `rust-dispatch.mjs`.         |
| C++               | `scripts/parsers/cpp.mjs` (clang) + `cpp-treesitter.mjs`   | clang **or** tree-sitter   | Dispatcher in `cpp-dispatch.mjs`.                                     |
| Bash, Go, Java, Python, Ruby | `<lang>-treesitter.mjs` + `<lang>-dispatch.mjs`     | tree-sitter only           | Pass-through dispatchers; no regex parser yet (`CORTEX_<LANG>_PARSER=regex` is rejected). |

## Tree-sitter pilot (Rust)

Rust is the pilot language for tree-sitter–based parsing in Cortex. The motivation is richer chunk/call/import accuracy than what regex can deliver, especially for impl blocks, macros, and qualified call paths. The pilot validates:

1. The shared `tree-sitter/base.mjs` infrastructure (WASM grammar loading, query execution, error collection, source-size guardrails).
2. A dispatcher pattern (`rust-dispatch.mjs`) that lets users force `regex` or `tree-sitter` via `CORTEX_RUST_PARSER`, with safe auto-fallback.
3. Behavioral parity between the regex parser and the tree-sitter parser through a shared test suite.

While the pilot is in flight the regex parser remains the default fallback — projects without WASM support keep working unchanged.

## Tree-sitter rollout — status

All six follow-up languages (`bash`, `cpp`, `go`, `java`, `python`, `ruby`) now have `<lang>-treesitter.mjs` modules and `<lang>-dispatch.mjs` entry points. `scripts/ingest.mjs` imports every language through its dispatcher.

C++ has a clang-bridge fallback (`cpp.mjs`); the other five have no regex counterpart yet, so their dispatchers are pass-throughs that reject `CORTEX_<LANG>_PARSER=regex` with a clear error. The dispatcher slot exists so a future regex parser can be added without changing `ingest.mjs`.

Open follow-ups:

- Add regex fallbacks for `bash`, `go`, `java`, `python`, `ruby` if we need to support environments where WASM is unavailable.
- Once regex fallbacks exist, deprecate them in favor of tree-sitter for any language whose tree-sitter parser reaches feature parity.

## Parity checklist before adding a new language to the tree-sitter dispatcher

- [ ] `<lang>-treesitter.mjs` produces the same chunk shape as the regex parser (`{ name, kind, signature, body, startLine, endLine, language, exported, calls, imports }`).
- [ ] `<lang>-dispatch.mjs` honors `CORTEX_<LANG>_PARSER=regex|tree-sitter` and auto-falls-back when WASM is unavailable.
- [ ] Behavior is exercised by the existing language test suite (regex tests run against the tree-sitter module).
- [ ] `CORTEX_TREE_SITTER_MAX_BYTES` skip path returns the same shape as a successful empty parse so callers don't need to special-case.
- [ ] `scripts/ingest.mjs` `CHUNK_PARSERS` map points at the dispatcher, not the leaf parser.
