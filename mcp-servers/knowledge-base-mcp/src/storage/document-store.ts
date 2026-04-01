/**
 * Document Storage and Retrieval with Indexing
 * BE EASY ENTERPRISES LLC
 *
 * In-memory document store with tag and category indices.
 * Production deployments should swap in a persistent backend.
 */

import { randomUUID } from "node:crypto";
import type {
  Document,
  DocumentCategory,
  Classification,
  LessonLearned,
  Playbook,
  PlaybookCategory,
  PlaybookStep,
  Domain,
} from "../types.js";
import { computeChecksum } from "../utils/text-processor.js";

// ---------------------------------------------------------------------------
// Document Store
// ---------------------------------------------------------------------------

export class DocumentStore {
  private documents = new Map<string, Document>();
  private tagIndex = new Map<string, Set<string>>();
  private categoryIndex = new Map<string, Set<string>>();

  async store(params: {
    title: string;
    content: string;
    category: DocumentCategory;
    tags: string[];
    classification: Classification;
    metadata?: Record<string, unknown>;
  }): Promise<Document> {
    const now = new Date().toISOString();
    const checksum = await computeChecksum(params.content);
    const doc: Document = {
      id: randomUUID(),
      title: params.title,
      content: params.content,
      category: params.category,
      tags: params.tags,
      classification: params.classification,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
      version: 1,
      checksum,
    };

    this.documents.set(doc.id, doc);
    this.indexDocument(doc);
    return doc;
  }

  get(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getAll(): Document[] {
    return Array.from(this.documents.values());
  }

  getByCategory(category: DocumentCategory): Document[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.documents.get(id))
      .filter((d): d is Document => d !== undefined);
  }

  getByTag(tag: string): Document[] {
    const ids = this.tagIndex.get(tag.toLowerCase());
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.documents.get(id))
      .filter((d): d is Document => d !== undefined);
  }

  search(params: {
    categories?: DocumentCategory[];
    tags?: string[];
    classification?: Classification;
  }): Document[] {
    let results = this.getAll();

    if (params.categories && params.categories.length > 0) {
      const catSet = new Set(params.categories);
      results = results.filter((d) => catSet.has(d.category));
    }

    if (params.tags && params.tags.length > 0) {
      const tagSet = new Set(params.tags.map((t) => t.toLowerCase()));
      results = results.filter((d) =>
        d.tags.some((t) => tagSet.has(t.toLowerCase())),
      );
    }

    return results;
  }

  count(): number {
    return this.documents.size;
  }

  private indexDocument(doc: Document): void {
    // Category index
    if (!this.categoryIndex.has(doc.category)) {
      this.categoryIndex.set(doc.category, new Set());
    }
    this.categoryIndex.get(doc.category)!.add(doc.id);

    // Tag index
    for (const tag of doc.tags) {
      const key = tag.toLowerCase();
      if (!this.tagIndex.has(key)) {
        this.tagIndex.set(key, new Set());
      }
      this.tagIndex.get(key)!.add(doc.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Lesson Learned Store
// ---------------------------------------------------------------------------

export class LessonLearnedStore {
  private lessons = new Map<string, LessonLearned>();

  store(params: {
    projectId: string;
    title: string;
    context: string;
    challenge: string;
    solution: string;
    outcome: string;
    recommendations: string[];
    tags: string[];
    domain?: Domain;
    projectType?: string;
  }): LessonLearned {
    const lesson: LessonLearned = {
      id: randomUUID(),
      projectId: params.projectId,
      title: params.title,
      context: params.context,
      challenge: params.challenge,
      solution: params.solution,
      outcome: params.outcome,
      recommendations: params.recommendations,
      tags: params.tags,
      domain: params.domain,
      projectType: params.projectType,
      createdAt: new Date().toISOString(),
    };

    this.lessons.set(lesson.id, lesson);
    return lesson;
  }

  get(id: string): LessonLearned | undefined {
    return this.lessons.get(id);
  }

  getAll(): LessonLearned[] {
    return Array.from(this.lessons.values());
  }

  query(params: {
    domain?: string;
    keywords?: string[];
    projectType?: string;
    dateRange?: { start: string; end: string };
  }): LessonLearned[] {
    let results = this.getAll();

    if (params.domain) {
      results = results.filter((l) => l.domain === params.domain);
    }

    if (params.projectType) {
      results = results.filter((l) => l.projectType === params.projectType);
    }

    if (params.keywords && params.keywords.length > 0) {
      const lowerKeywords = params.keywords.map((k) => k.toLowerCase());
      results = results.filter((l) => {
        const text =
          `${l.title} ${l.context} ${l.challenge} ${l.solution} ${l.tags.join(" ")}`.toLowerCase();
        return lowerKeywords.some((kw) => text.includes(kw));
      });
    }

    if (params.dateRange) {
      const start = new Date(params.dateRange.start).getTime();
      const end = new Date(params.dateRange.end).getTime();
      results = results.filter((l) => {
        const ts = new Date(l.createdAt).getTime();
        return ts >= start && ts <= end;
      });
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Playbook Store
// ---------------------------------------------------------------------------

export class PlaybookStore {
  private playbooks = new Map<string, Playbook>();

  create(params: {
    title: string;
    category: PlaybookCategory;
    steps: PlaybookStep[];
  }): Playbook {
    const now = new Date().toISOString();
    const playbook: Playbook = {
      id: randomUUID(),
      title: params.title,
      category: params.category,
      steps: params.steps,
      tags: [],
      archived: false,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.playbooks.set(playbook.id, playbook);
    return playbook;
  }

  get(id: string): Playbook | undefined {
    return this.playbooks.get(id);
  }

  list(params?: {
    category?: PlaybookCategory;
    includeArchived?: boolean;
  }): Playbook[] {
    let results = Array.from(this.playbooks.values());

    if (!params?.includeArchived) {
      results = results.filter((p) => !p.archived);
    }

    if (params?.category) {
      results = results.filter((p) => p.category === params.category);
    }

    return results;
  }

  update(
    id: string,
    params: {
      title?: string;
      steps?: PlaybookStep[];
      category?: PlaybookCategory;
    },
  ): Playbook | undefined {
    const existing = this.playbooks.get(id);
    if (!existing) return undefined;

    const updated: Playbook = {
      ...existing,
      title: params.title ?? existing.title,
      steps: params.steps ?? existing.steps,
      category: params.category ?? existing.category,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };

    this.playbooks.set(id, updated);
    return updated;
  }

  archive(id: string): Playbook | undefined {
    const existing = this.playbooks.get(id);
    if (!existing) return undefined;

    const archived: Playbook = {
      ...existing,
      archived: true,
      updatedAt: new Date().toISOString(),
    };

    this.playbooks.set(id, archived);
    return archived;
  }
}
