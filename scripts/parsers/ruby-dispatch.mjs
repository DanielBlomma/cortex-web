/**
 * Ruby parser dispatcher.
 *
 * Today only the tree-sitter parser exists for Ruby. The dispatcher
 * pattern is kept symmetric with rust-dispatch.mjs / cpp-dispatch.mjs so
 * a future regex parser can slot in without touching ingest.mjs, and so
 * the parity rule (every supported language goes through a dispatcher)
 * is maintained.
 *
 *   CORTEX_RUBY_PARSER=tree-sitter → force tree-sitter (default)
 *   CORTEX_RUBY_PARSER=regex       → currently rejected (no regex parser)
 *   unset / other                  → tree-sitter
 */

const choice = process.env.CORTEX_RUBY_PARSER;

let activeParser = null;
let resolvePromise = null;

async function resolveParser() {
  if (activeParser) return activeParser;
  if (resolvePromise) return resolvePromise;
  resolvePromise = (async () => {
    if (choice === "regex") {
      throw new Error(
        "CORTEX_RUBY_PARSER=regex is not supported: no regex Ruby parser is bundled. " +
          "Unset the variable or set it to 'tree-sitter'."
      );
    }
    activeParser = await import("./ruby-treesitter.mjs");
    return activeParser;
  })();
  return resolvePromise;
}

export async function parseCode(code, filePath, language = "ruby") {
  const parser = await resolveParser();
  return parser.parseCode(code, filePath, language);
}

export async function isAvailable() {
  const parser = await resolveParser();
  if (typeof parser.isAvailable === "function") {
    const result = parser.isAvailable();
    return result && typeof result.then === "function" ? await result : result;
  }
  return typeof parser.parseCode === "function";
}
