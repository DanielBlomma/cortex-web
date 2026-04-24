const DEFAULT_LOCALE = "en";

function sanitizeLocale(locale?: string | null): string {
  const trimmed = locale?.trim();
  if (!trimmed || trimmed === "*") {
    return DEFAULT_LOCALE;
  }

  const candidate = trimmed.replaceAll("_", "-");

  try {
    const [canonicalLocale] = Intl.getCanonicalLocales(candidate);
    if (!canonicalLocale) {
      return DEFAULT_LOCALE;
    }

    return Intl.DateTimeFormat.supportedLocalesOf([canonicalLocale]).length > 0
      ? canonicalLocale
      : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function resolveLocale(explicitLocale?: string): string {
  if (explicitLocale) return sanitizeLocale(explicitLocale);

  if (typeof document !== "undefined") {
    const documentLocale = sanitizeLocale(document.documentElement.lang);
    if (documentLocale) return documentLocale;
  }

  if (typeof navigator !== "undefined") {
    const navigatorLocale = sanitizeLocale(
      navigator.languages?.[0] ?? navigator.language,
    );
    if (navigatorLocale) return navigatorLocale;
  }

  return DEFAULT_LOCALE;
}

function parseDate(value: string | Date): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(
  value: string | Date,
  explicitLocale?: string,
): string {
  const parsed = parseDate(value);
  if (!parsed) return "";

  return new Intl.DateTimeFormat(resolveLocale(explicitLocale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function formatDateTime(
  value: string | Date,
  explicitLocale?: string,
): string {
  const parsed = parseDate(value);
  if (!parsed) return "";

  return new Intl.DateTimeFormat(resolveLocale(explicitLocale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
