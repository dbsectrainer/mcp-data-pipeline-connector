/**
 * Vector Embedding Storage for Semantic Search
 * BE EASY ENTERPRISES LLC
 *
 * Interface-based design supporting pluggable vector DB backends
 * (Qdrant, Pinecone, Weaviate, or in-memory for dev).
 */

// ---------------------------------------------------------------------------
// Vector Store Interface
// ---------------------------------------------------------------------------

export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorStoreBackend {
  /** Insert or update a vector entry. */
  upsert(entry: VectorEntry): Promise<void>;

  /** Remove a vector by ID. */
  delete(id: string): Promise<boolean>;

  /** Search for the top-k nearest neighbours. */
  search(
    queryVector: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]>;

  /** Return total number of stored vectors. */
  count(): Promise<number>;
}

// ---------------------------------------------------------------------------
// In-Memory Backend (development / testing)
// ---------------------------------------------------------------------------

export class InMemoryVectorStore implements VectorStoreBackend {
  private store = new Map<string, VectorEntry>();

  async upsert(entry: VectorEntry): Promise<void> {
    this.store.set(entry.id, entry);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async search(
    queryVector: number[],
    topK: number,
    _filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const entry of this.store.values()) {
      const score = this.cosineSim(queryVector, entry.vector);
      results.push({ id: entry.id, score, metadata: entry.metadata });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  /** Return all stored entries (useful for testing). */
  entries(): VectorEntry[] {
    return Array.from(this.store.values());
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private cosineSim(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a vector store backend.  Defaults to in-memory; extend to support
 * external services via VECTOR_DB_URL environment variable.
 */
export function createVectorStore(): VectorStoreBackend {
  // Future: inspect process.env.VECTOR_DB_URL to instantiate Qdrant / Pinecone
  // client.  For now, return the in-memory implementation.
  return new InMemoryVectorStore();
}
