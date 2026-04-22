type OperationsWarning = {
  code: "schema_unavailable";
  detail: string;
};

type PgLikeError = {
  code?: string;
  message?: string;
};

const RECOVERABLE_DB_ERROR_CODES = new Set([
  "42P01", // undefined_table
  "42703", // undefined_column
  "42P07", // duplicate_table in inconsistent rollout windows
]);

function asPgLikeError(error: unknown): PgLikeError {
  if (!error || typeof error !== "object") return {};
  const candidate = error as { code?: unknown; message?: unknown };
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message:
      typeof candidate.message === "string" ? candidate.message : undefined,
  };
}

export function isRecoverableOperationsError(error: unknown): boolean {
  const { code, message } = asPgLikeError(error);
  if (code && RECOVERABLE_DB_ERROR_CODES.has(code)) return true;
  if (!message) return false;

  return (
    message.includes("does not exist") ||
    message.includes("column") ||
    message.includes("relation")
  );
}

export function createSchemaWarning(error: unknown): OperationsWarning {
  const { code, message } = asPgLikeError(error);
  return {
    code: "schema_unavailable",
    detail: [code, message].filter(Boolean).join(": ") || "unknown database error",
  };
}

export async function settleOperationsQuery<T>(
  label: string,
  query: Promise<T>,
  fallback: T,
  warnings: OperationsWarning[],
): Promise<T> {
  try {
    return await query;
  } catch (error) {
    if (!isRecoverableOperationsError(error)) {
      throw error;
    }

    const warning = createSchemaWarning(error);
    warnings.push(warning);
    console.error(
      `[operations.summary] Falling back for ${label} because production schema is behind: ${warning.detail}`,
    );
    return fallback;
  }
}

export type { OperationsWarning };
