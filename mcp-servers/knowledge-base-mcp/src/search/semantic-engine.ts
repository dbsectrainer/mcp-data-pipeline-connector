/**
 * Semantic Search Engine
 * BE EASY ENTERPRISES LLC
 *
 * Provides semantic search with TF-IDF fallback and optional vector similarity
 * when an embedding backend is available.
 */

import type { Document, Classification, DocumentCategory } from "../types.js";
import type { SearchResult } from "../types.js";
import {
  tokenize,
  termFrequency,
  inverseDocumentFrequency,
  tfidfVector,
  cosineSimilarity,
  generateSnippet,
  extractHighlights,
} from "../utils/text-processor.js";
import { isAccessPermitted } from "../utils/classification.js";
import type { VectorStoreBackend } from "../storage/vector-store.js";

// ---------------------------------------------------------------------------
// Semantic Engine
// ---------------------------------------------------------------------------

export class SemanticEngine {
  private vectorStore: VectorStoreBackend | null;

  constructor(vectorStore?: VectorStoreBackend) {
    this.vectorStore = vectorStore ?? null;
  }

  /**
   * Search across a set of documents using TF-IDF similarity.
   * Falls back to keyword overlap when the corpus is very small.
   */
  search(
    query: string,
    documents: Document[],
    options: {
      categories?: DocumentCategory[];
      tags?: string[];
      classificationMax?: Classification;
      limit?: number;
      similarityThreshold?: number;
    } = {},
  ): SearchResult[] {
    const {
      categories,
      tags,
      classificationMax = "restricted",
      limit = 20,
      similarityThreshold = 0.05,
    } = options;

    // Pre-filter documents
    let filtered = documents;

    if (categories && categories.length > 0) {
      const catSet = new Set(categories);
      filtered = filtered.filter((d) => catSet.has(d.category));
    }

    if (tags && tags.length > 0) {
      const tagSet = new Set(tags.map((t) => t.toLowerCase()));
      filtered = filtered.filter((d) =>
        d.tags.some((t) => tagSet.has(t.toLowerCase())),
      );
    }

    filtered = filtered.filter((d) =>
      isAccessPermitted(d.classification, classificationMax),
    );

    if (filtered.length === 0) return [];

    // Build TF-IDF corpus
    const queryTokens = tokenize(query);
    const queryTf = termFrequency(queryTokens);

    const docTfs = filtered.map((d) =>
      termFrequency(tokenize(`${d.title} ${d.content}`)),
    );

    const idf = inverseDocumentFrequency([queryTf, ...docTfs]);
    const queryVec = tfidfVector(queryTf, idf);

    // Score each document
    const scored: Array<{ doc: Document; score: number }> = [];

    for (let i = 0; i < filtered.length; i++) {
      const docVec = tfidfVector(docTfs[i], idf);
      const score = cosineSimilarity(queryVec, docVec);
      if (score >= similarityThreshold) {
        scored.push({ doc: filtered[i], score });
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Build results
    return scored.slice(0, limit).map(({ doc, score }) => ({
      documentId: doc.id,
      title: doc.title,
      snippet: generateSnippet(doc.content, queryTokens),
      score: Math.round(score * 10000) / 10000,
      category: doc.category,
      classification: doc.classification,
      tags: doc.tags,
      highlights: extractHighlights(doc.content, queryTokens),
    }));
  }

  /**
   * Generate a simple bag-of-words embedding (placeholder for real model).
   * In production, call the EMBEDDING_API_URL for dense vectors.
   */
  generateEmbedding(text: string): number[] {
    const tokens = tokenize(text);
    const vocab = new Map<string, number>();
    let idx = 0;
    for (const t of tokens) {
      if (!vocab.has(t)) {
        vocab.set(t, idx++);
      }
    }

    const dims = Math.max(vocab.size, 64);
    const vec = new Array<number>(dims).fill(0);
    const tf = termFrequency(tokens);
    for (const [term, val] of tf) {
      const i = vocab.get(term);
      if (i !== undefined && i < dims) {
        vec[i] = val;
      }
    }

    return vec;
  }
}
