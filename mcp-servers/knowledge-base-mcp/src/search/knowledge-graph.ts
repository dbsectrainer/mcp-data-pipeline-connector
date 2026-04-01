/**
 * Knowledge Graph Relationship Management and Traversal
 * BE EASY ENTERPRISES LLC
 *
 * Manages relationships between knowledge artifacts and supports
 * multi-hop graph traversal queries.
 */

import type {
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  EntityType,
  RelationshipType,
} from "../types.js";

// ---------------------------------------------------------------------------
// Knowledge Graph
// ---------------------------------------------------------------------------

export class KnowledgeGraph {
  private nodes = new Map<string, KnowledgeGraphNode>();
  private edges: KnowledgeGraphEdge[] = [];
  private adjacencyList = new Map<string, KnowledgeGraphEdge[]>();

  // -------------------------------------------------------------------------
  // Node operations
  // -------------------------------------------------------------------------

  addNode(node: KnowledgeGraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }

  getNode(id: string): KnowledgeGraphNode | undefined {
    return this.nodes.get(id);
  }

  getNodesByType(entityType: EntityType): KnowledgeGraphNode[] {
    return Array.from(this.nodes.values()).filter(
      (n) => n.entityType === entityType,
    );
  }

  // -------------------------------------------------------------------------
  // Edge operations
  // -------------------------------------------------------------------------

  addEdge(edge: KnowledgeGraphEdge): void {
    this.edges.push(edge);

    // Ensure both nodes have adjacency entries
    if (!this.adjacencyList.has(edge.source)) {
      this.adjacencyList.set(edge.source, []);
    }
    if (!this.adjacencyList.has(edge.target)) {
      this.adjacencyList.set(edge.target, []);
    }

    this.adjacencyList.get(edge.source)!.push(edge);
    // Bidirectional lookup
    this.adjacencyList.get(edge.target)!.push(edge);
  }

  getEdgesFor(nodeId: string): KnowledgeGraphEdge[] {
    return this.adjacencyList.get(nodeId) ?? [];
  }

  // -------------------------------------------------------------------------
  // Traversal
  // -------------------------------------------------------------------------

  /**
   * Breadth-first traversal from a starting node, optionally filtered by
   * entity type and relationship type, up to a maximum depth.
   */
  query(params: {
    entityId?: string;
    entityType?: EntityType;
    relationshipType?: RelationshipType;
    depth?: number;
  }): { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] } {
    const maxDepth = Math.min(params.depth ?? 2, 10);

    // If an entity ID is given, traverse from that node
    if (params.entityId) {
      return this.bfsTraverse(
        params.entityId,
        maxDepth,
        params.relationshipType,
        params.entityType,
      );
    }

    // If only entity type is given, return all matching nodes and their edges
    if (params.entityType) {
      const matchingNodes = this.getNodesByType(params.entityType);
      const matchingEdges = this.edges.filter((e) => {
        if (params.relationshipType && e.relationship !== params.relationshipType) {
          return false;
        }
        return matchingNodes.some(
          (n) => n.id === e.source || n.id === e.target,
        );
      });

      return { nodes: matchingNodes, edges: matchingEdges };
    }

    // If only relationship type is given, return all edges of that type
    if (params.relationshipType) {
      const matchingEdges = this.edges.filter(
        (e) => e.relationship === params.relationshipType,
      );
      const nodeIds = new Set<string>();
      for (const e of matchingEdges) {
        nodeIds.add(e.source);
        nodeIds.add(e.target);
      }
      const matchingNodes = Array.from(nodeIds)
        .map((id) => this.nodes.get(id))
        .filter((n): n is KnowledgeGraphNode => n !== undefined);

      return { nodes: matchingNodes, edges: matchingEdges };
    }

    // No filters: return the full graph
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
    };
  }

  /**
   * Return summary statistics about the graph.
   */
  stats(): {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
  } {
    const nodesByType: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      nodesByType[node.entityType] = (nodesByType[node.entityType] ?? 0) + 1;
    }

    const edgesByType: Record<string, number> = {};
    for (const edge of this.edges) {
      edgesByType[edge.relationship] = (edgesByType[edge.relationship] ?? 0) + 1;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      nodesByType,
      edgesByType,
    };
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private bfsTraverse(
    startId: string,
    maxDepth: number,
    relationshipFilter?: RelationshipType,
    entityTypeFilter?: EntityType,
  ): { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] } {
    const visitedNodes = new Set<string>();
    const collectedEdges: KnowledgeGraphEdge[] = [];
    const queue: Array<{ id: string; depth: number }> = [
      { id: startId, depth: 0 },
    ];

    visitedNodes.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      const edges = this.adjacencyList.get(current.id) ?? [];
      for (const edge of edges) {
        if (relationshipFilter && edge.relationship !== relationshipFilter) {
          continue;
        }

        const neighbourId =
          edge.source === current.id ? edge.target : edge.source;

        // Optionally filter by entity type of the neighbour
        if (entityTypeFilter) {
          const neighbour = this.nodes.get(neighbourId);
          if (neighbour && neighbour.entityType !== entityTypeFilter) continue;
        }

        collectedEdges.push(edge);

        if (!visitedNodes.has(neighbourId)) {
          visitedNodes.add(neighbourId);
          queue.push({ id: neighbourId, depth: current.depth + 1 });
        }
      }
    }

    const resultNodes = Array.from(visitedNodes)
      .map((id) => this.nodes.get(id))
      .filter((n): n is KnowledgeGraphNode => n !== undefined);

    return { nodes: resultNodes, edges: collectedEdges };
  }
}
