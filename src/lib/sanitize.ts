/**
 * Known prompt injection patterns that could manipulate AI behavior
 * when returned as code context.
 */
const INJECTION_PATTERNS = [
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS/i,
  /DISREGARD\s+(ALL\s+)?PREVIOUS/i,
  /SYSTEM\s*:/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
  /YOU\s+ARE\s+NOW\s+IN/i,
  /NEW\s+INSTRUCTIONS?\s*:/i,
  /OVERRIDE\s*:/i,
  /FORGET\s+(ALL\s+)?PREVIOUS/i,
  /DO\s+NOT\s+FOLLOW\s+PREVIOUS/i,
];

/**
 * Check if a string contains known prompt injection patterns.
 */
export function detectPromptInjection(text: string): {
  detected: boolean;
  patterns: string[];
} {
  const matched: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      matched.push(pattern.source);
    }
  }
  return { detected: matched.length > 0, patterns: matched };
}

/**
 * Sanitize a string by wrapping detected injection patterns in a warning marker.
 * This preserves the original content for audit but signals to AI that the
 * content may be adversarial.
 */
export function sanitizeForAI(text: string): string {
  let result = text;
  for (const pattern of INJECTION_PATTERNS) {
    result = result.replace(
      pattern,
      "[CORTEX_WARNING: potential prompt injection removed]"
    );
  }
  return result;
}
