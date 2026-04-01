/**
 * Knowledge Base MCP Server — Tests
 * BE EASY ENTERPRISES LLC
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DocumentStore,
  LessonLearnedStore,
  PlaybookStore,
} from "../src/storage/document-store.js";
import { InMemoryVectorStore } from "../src/storage/vector-store.js";
import { SemanticEngine } from "../src/search/semantic-engine.js";
import { KnowledgeGraph } from "../src/search/knowledge-graph.js";
import { TemplateManager } from "../src/templates/template-manager.js";
import {
  tokenize,
  termFrequency,
  cosineSimilarity,
  computeChecksum,
  generateSnippet,
} from "../src/utils/text-processor.js";
import {
  isAccessPermitted,
  filterByClassification,
  defaultClassificationForCategory,
  sanitizeForAudience,
} from "../src/utils/classification.js";

// ---------------------------------------------------------------------------
// Text Processor
// ---------------------------------------------------------------------------

describe("text-processor", () => {
  it("tokenizes text and removes stop words", () => {
    const tokens = tokenize("The quick brown fox jumps over the lazy dog");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("over");
    expect(tokens).toContain("quick");
    expect(tokens).toContain("brown");
    expect(tokens).toContain("fox");
  });

  it("computes term frequency", () => {
    const tf = termFrequency(["hello", "world", "hello"]);
    expect(tf.get("hello")).toBeCloseTo(2 / 3);
    expect(tf.get("world")).toBeCloseTo(1 / 3);
  });

  it("computes cosine similarity for identical vectors", () => {
    const v = new Map([["a", 1], ["b", 2]]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("computes cosine similarity for orthogonal vectors", () => {
    const a = new Map([["a", 1]]);
    const b = new Map([["b", 1]]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("generates a snippet around query tokens", () => {
    const content = "Lorem ipsum dolor sit amet, cybersecurity is critical for modern enterprises.";
    const snippet = generateSnippet(content, ["cybersecurity"], 60);
    expect(snippet).toContain("cybersecurity");
  });

  it("computes checksum", async () => {
    const hash = await computeChecksum("hello world");
    expect(hash).toHaveLength(64); // SHA-256 hex
    // Same input should yield same hash
    const hash2 = await computeChecksum("hello world");
    expect(hash).toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

describe("classification", () => {
  it("permits access at or below max level", () => {
    expect(isAccessPermitted("public", "internal")).toBe(true);
    expect(isAccessPermitted("internal", "internal")).toBe(true);
    expect(isAccessPermitted("confidential", "internal")).toBe(false);
    expect(isAccessPermitted("restricted", "confidential")).toBe(false);
  });

  it("filters items by classification", () => {
    const items = [
      { name: "a", classification: "public" as const },
      { name: "b", classification: "confidential" as const },
      { name: "c", classification: "internal" as const },
    ];
    const result = filterByClassification(items, "internal");
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toEqual(["a", "c"]);
  });

  it("assigns default classification by category", () => {
    expect(defaultClassificationForCategory("policy")).toBe("confidential");
    expect(defaultClassificationForCategory("architecture")).toBe("confidential");
    expect(defaultClassificationForCategory("playbook")).toBe("internal");
    expect(defaultClassificationForCategory("reference")).toBe("internal");
  });

  it("sanitizes content for audience", () => {
    const content = "Public info. <!-- classification:restricted -->SECRET DATA<!-- /classification:restricted --> More public.";
    const cleaned = sanitizeForAudience(content, "client");
    expect(cleaned).not.toContain("SECRET DATA");
    expect(cleaned).toContain("[REDACTED]");
    expect(cleaned).toContain("Public info.");
  });
});

// ---------------------------------------------------------------------------
// Document Store
// ---------------------------------------------------------------------------

describe("DocumentStore", () => {
  let store: DocumentStore;

  beforeEach(() => {
    store = new DocumentStore();
  });

  it("stores and retrieves a document", async () => {
    const doc = await store.store({
      title: "Test Document",
      content: "This is test content.",
      category: "reference",
      tags: ["test"],
      classification: "internal",
    });

    expect(doc.id).toBeTruthy();
    expect(doc.version).toBe(1);

    const retrieved = store.get(doc.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe("Test Document");
  });

  it("indexes by category", async () => {
    await store.store({
      title: "Policy A",
      content: "Policy content.",
      category: "policy",
      tags: [],
      classification: "confidential",
    });
    await store.store({
      title: "Playbook B",
      content: "Playbook content.",
      category: "playbook",
      tags: [],
      classification: "internal",
    });

    const policies = store.getByCategory("policy");
    expect(policies).toHaveLength(1);
    expect(policies[0].title).toBe("Policy A");
  });

  it("indexes by tag", async () => {
    await store.store({
      title: "Tagged Doc",
      content: "Content.",
      category: "reference",
      tags: ["security", "cloud"],
      classification: "internal",
    });

    expect(store.getByTag("security")).toHaveLength(1);
    expect(store.getByTag("SECURITY")).toHaveLength(1); // case-insensitive
    expect(store.getByTag("unknown")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Lesson Learned Store
// ---------------------------------------------------------------------------

describe("LessonLearnedStore", () => {
  let store: LessonLearnedStore;

  beforeEach(() => {
    store = new LessonLearnedStore();
  });

  it("stores and queries lessons", () => {
    store.store({
      projectId: "PROJ-001",
      title: "Cloud Migration Challenges",
      context: "Migrating legacy systems to AWS",
      challenge: "Data consistency during migration",
      solution: "Implemented CDC with Debezium",
      outcome: "Zero data loss migration",
      recommendations: ["Use CDC for real-time sync"],
      tags: ["cloud", "migration"],
    });

    const results = store.query({ keywords: ["cloud"] });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Cloud Migration Challenges");
  });

  it("filters by domain", () => {
    store.store({
      projectId: "P1",
      title: "Lesson A",
      context: "ctx",
      challenge: "ch",
      solution: "sol",
      outcome: "out",
      recommendations: [],
      tags: [],
      domain: "cybersecurity",
    });
    store.store({
      projectId: "P2",
      title: "Lesson B",
      context: "ctx",
      challenge: "ch",
      solution: "sol",
      outcome: "out",
      recommendations: [],
      tags: [],
      domain: "cloud",
    });

    expect(store.query({ domain: "cybersecurity" })).toHaveLength(1);
    expect(store.query({ domain: "cloud" })).toHaveLength(1);
    expect(store.query({ domain: "ai_ml" })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Playbook Store
// ---------------------------------------------------------------------------

describe("PlaybookStore", () => {
  let store: PlaybookStore;

  beforeEach(() => {
    store = new PlaybookStore();
  });

  it("creates and retrieves a playbook", () => {
    const pb = store.create({
      title: "Incident Response",
      category: "incident_response",
      steps: [
        { order: 1, description: "Identify the incident" },
        { order: 2, description: "Contain the threat" },
      ],
    });

    expect(pb.id).toBeTruthy();
    expect(pb.archived).toBe(false);
    expect(store.get(pb.id)).toBeDefined();
  });

  it("updates a playbook and increments version", () => {
    const pb = store.create({
      title: "Original",
      category: "deployment",
      steps: [],
    });

    const updated = store.update(pb.id, { title: "Updated Title" });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe("Updated Title");
    expect(updated!.version).toBe(2);
  });

  it("archives a playbook", () => {
    const pb = store.create({
      title: "To Archive",
      category: "audit",
      steps: [],
    });

    const archived = store.archive(pb.id);
    expect(archived!.archived).toBe(true);

    // Archived playbooks excluded from default list
    expect(store.list()).toHaveLength(0);
    expect(store.list({ includeArchived: true })).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Vector Store (In-Memory)
// ---------------------------------------------------------------------------

describe("InMemoryVectorStore", () => {
  it("upserts and searches vectors", async () => {
    const vs = new InMemoryVectorStore();
    await vs.upsert({ id: "a", vector: [1, 0, 0], metadata: { label: "x" } });
    await vs.upsert({ id: "b", vector: [0, 1, 0], metadata: { label: "y" } });
    await vs.upsert({ id: "c", vector: [0.9, 0.1, 0], metadata: { label: "z" } });

    const results = await vs.search([1, 0, 0], 2);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("a"); // highest similarity
    expect(results[0].score).toBeCloseTo(1);
  });

  it("deletes vectors", async () => {
    const vs = new InMemoryVectorStore();
    await vs.upsert({ id: "a", vector: [1, 0], metadata: {} });
    expect(await vs.count()).toBe(1);
    await vs.delete("a");
    expect(await vs.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Semantic Engine
// ---------------------------------------------------------------------------

describe("SemanticEngine", () => {
  it("returns search results ranked by relevance", () => {
    const engine = new SemanticEngine();
    const docs = [
      {
        id: "1",
        title: "Kubernetes Security Best Practices",
        content:
          "This document covers security hardening for Kubernetes clusters including network policies, RBAC, and pod security standards.",
        category: "reference" as const,
        tags: ["kubernetes", "security"],
        classification: "internal" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        checksum: "abc",
      },
      {
        id: "2",
        title: "Company Vacation Policy",
        content: "All employees are entitled to 20 days of paid vacation per year.",
        category: "policy" as const,
        tags: ["hr"],
        classification: "internal" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        checksum: "def",
      },
    ];

    const results = engine.search("kubernetes security hardening", docs);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].documentId).toBe("1");
  });

  it("respects classification filter", () => {
    const engine = new SemanticEngine();
    const docs = [
      {
        id: "1",
        title: "Public Guide",
        content: "Public information about our services.",
        category: "reference" as const,
        tags: [],
        classification: "public" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        checksum: "a",
      },
      {
        id: "2",
        title: "Restricted Architecture",
        content: "Top secret architecture details.",
        category: "architecture" as const,
        tags: [],
        classification: "restricted" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        checksum: "b",
      },
    ];

    const results = engine.search("architecture", docs, {
      classificationMax: "internal",
    });

    // Should not include restricted doc
    const ids = results.map((r) => r.documentId);
    expect(ids).not.toContain("2");
  });
});

// ---------------------------------------------------------------------------
// Knowledge Graph
// ---------------------------------------------------------------------------

describe("KnowledgeGraph", () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
  });

  it("adds nodes and edges and queries by entity ID", () => {
    graph.addNode({ id: "doc-1", entityType: "document", label: "Doc 1" });
    graph.addNode({ id: "tmpl-1", entityType: "template", label: "Template 1" });
    graph.addEdge({
      source: "doc-1",
      target: "tmpl-1",
      relationship: "references",
    });

    const result = graph.query({ entityId: "doc-1", depth: 1 });
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  it("filters by entity type", () => {
    graph.addNode({ id: "a", entityType: "document", label: "A" });
    graph.addNode({ id: "b", entityType: "playbook", label: "B" });

    const result = graph.query({ entityType: "document" });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("a");
  });

  it("filters by relationship type", () => {
    graph.addNode({ id: "x", entityType: "document", label: "X" });
    graph.addNode({ id: "y", entityType: "document", label: "Y" });
    graph.addEdge({ source: "x", target: "y", relationship: "depends_on" });
    graph.addEdge({ source: "x", target: "y", relationship: "references" });

    const result = graph.query({ relationshipType: "depends_on" });
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].relationship).toBe("depends_on");
  });

  it("reports graph stats", () => {
    graph.addNode({ id: "a", entityType: "document", label: "A" });
    graph.addNode({ id: "b", entityType: "playbook", label: "B" });
    graph.addEdge({ source: "a", target: "b", relationship: "related_to" });

    const stats = graph.stats();
    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Template Manager
// ---------------------------------------------------------------------------

describe("TemplateManager", () => {
  it("loads starter templates for each domain", () => {
    const tm = new TemplateManager();
    const all = tm.getAll();
    expect(all.length).toBeGreaterThanOrEqual(7);
  });

  it("retrieves templates by domain and use case", () => {
    const tm = new TemplateManager();
    const results = tm.getTemplates({
      domain: "cybersecurity",
      useCase: "zero trust",
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].domain).toBe("cybersecurity");
  });

  it("boosts matches by technology stack", () => {
    const tm = new TemplateManager();
    const results = tm.getTemplates({
      domain: "cloud",
      useCase: "landing zone",
      technologyStack: ["Terraform"],
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
