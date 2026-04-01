/**
 * Text Processing, Tokenization, and Embedding Utilities
 * BE EASY ENTERPRISES LLC
 */

/** Common English stop words to exclude from TF-IDF calculations. */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "was", "are",
  "be", "has", "had", "have", "not", "no", "will", "can", "do", "does",
  "did", "its", "as", "if", "each", "which", "their", "there", "then",
  "than", "so", "up", "out", "about", "into", "over", "after", "been",
  "also", "just", "more", "some", "other", "would", "what", "when", "who",
]);

/**
 * Tokenize text into normalized terms, stripping punctuation and stop words.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Compute term-frequency map for a list of tokens.
 */
export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  // Normalize by total token count.
  const total = tokens.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / total);
  }
  return tf;
}

/**
 * Compute inverse-document-frequency for a corpus of TF maps.
 */
export function inverseDocumentFrequency(
  corpus: Map<string, number>[],
): Map<string, number> {
  const docCount = corpus.length || 1;
  const df = new Map<string, number>();

  for (const tfMap of corpus) {
    for (const term of tfMap.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((docCount + 1) / (count + 1)) + 1);
  }
  return idf;
}

/**
 * Compute TF-IDF vector for a single document given a pre-computed IDF map.
 */
export function tfidfVector(
  tf: Map<string, number>,
  idf: Map<string, number>,
): Map<string, number> {
  const vec = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) ?? 0;
    vec.set(term, tfVal * idfVal);
  }
  return vec;
}

/**
 * Cosine similarity between two sparse vectors represented as Maps.
 */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, valA] of a) {
    magA += valA * valA;
    const valB = b.get(term);
    if (valB !== undefined) {
      dot += valA * valB;
    }
  }
  for (const valB of b.values()) {
    magB += valB * valB;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Generate a snippet of `maxLength` characters around the first occurrence of
 * any of the given highlight terms.
 */
export function generateSnippet(
  content: string,
  queryTokens: string[],
  maxLength = 300,
): string {
  const lower = content.toLowerCase();
  let bestIndex = 0;
  for (const token of queryTokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1) {
      bestIndex = idx;
      break;
    }
  }

  const start = Math.max(0, bestIndex - Math.floor(maxLength / 2));
  const end = Math.min(content.length, start + maxLength);
  let snippet = content.slice(start, end).trim();

  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Extract highlight fragments from content that match query tokens.
 */
export function extractHighlights(
  content: string,
  queryTokens: string[],
  maxHighlights = 5,
): string[] {
  const highlights: string[] = [];
  const lower = content.toLowerCase();

  for (const token of queryTokens) {
    if (highlights.length >= maxHighlights) break;
    const idx = lower.indexOf(token);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(content.length, idx + token.length + 40);
      let fragment = content.slice(start, end).trim();
      if (start > 0) fragment = "..." + fragment;
      if (end < content.length) fragment = fragment + "...";
      highlights.push(fragment);
    }
  }

  return highlights;
}

/**
 * Compute a simple SHA-256-style checksum using the built-in crypto module.
 * Falls back to a basic hash if crypto is unavailable.
 */
export async function computeChecksum(content: string): Promise<string> {
  try {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(content, "utf-8").digest("hex");
  } catch {
    // Fallback: simple djb2 hash for environments without crypto.
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = (hash * 33) ^ content.charCodeAt(i);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}
