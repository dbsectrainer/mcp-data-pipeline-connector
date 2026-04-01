/**
 * Immutable audit trail logging utility.
 * BE EASY ENTERPRISES LLC
 *
 * Provides tamper-evident logging for all compliance operations.
 * Each entry includes an integrity hash chained to the previous entry,
 * forming an append-only, verifiable audit log.
 */

import { createHash } from "node:crypto";
import type { AuditTrailEntry } from "../types.js";

// ---------------------------------------------------------------------------
// In-memory audit trail (production would use an append-only data store)
// ---------------------------------------------------------------------------

const auditTrail: AuditTrailEntry[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create and append a new audit trail entry.
 * Returns the created entry with its integrity hash.
 */
export function createAuditTrailEntry(
  action: string,
  actor: string,
  resource: string,
  resourceId: string,
  details?: Record<string, unknown>,
): AuditTrailEntry {
  const timestamp = new Date().toISOString();
  const id = `ATR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const previousHash =
    auditTrail.length > 0
      ? auditTrail[auditTrail.length - 1].integrity
      : "GENESIS";

  const payload = JSON.stringify({
    id,
    timestamp,
    action,
    actor,
    resource,
    resourceId,
    details: details ?? {},
    previousHash,
  });

  const integrity = createHash("sha256").update(payload).digest("hex");

  const entry: AuditTrailEntry = {
    id,
    timestamp,
    action,
    actor,
    resource,
    resourceId,
    details,
    integrity,
  };

  auditTrail.push(entry);
  return entry;
}

/**
 * Retrieve the full audit trail.
 */
export function getAuditTrail(): readonly AuditTrailEntry[] {
  return auditTrail;
}

/**
 * Retrieve audit trail entries filtered by resource and/or action.
 */
export function queryAuditTrail(filters: {
  resource?: string;
  resourceId?: string;
  action?: string;
  since?: string;
}): AuditTrailEntry[] {
  return auditTrail.filter((entry) => {
    if (filters.resource && entry.resource !== filters.resource) return false;
    if (filters.resourceId && entry.resourceId !== filters.resourceId)
      return false;
    if (filters.action && entry.action !== filters.action) return false;
    if (filters.since && entry.timestamp < filters.since) return false;
    return true;
  });
}

/**
 * Verify the integrity of the entire audit trail by re-computing
 * the hash chain. Returns true if the trail is untampered.
 */
export function verifyAuditTrailIntegrity(): {
  valid: boolean;
  invalidEntryIndex: number | null;
  totalEntries: number;
} {
  if (auditTrail.length === 0) {
    return { valid: true, invalidEntryIndex: null, totalEntries: 0 };
  }

  for (let i = 0; i < auditTrail.length; i++) {
    const entry = auditTrail[i];
    const previousHash =
      i > 0 ? auditTrail[i - 1].integrity : "GENESIS";

    const payload = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      actor: entry.actor,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details ?? {},
      previousHash,
    });

    const expectedHash = createHash("sha256").update(payload).digest("hex");

    if (entry.integrity !== expectedHash) {
      return {
        valid: false,
        invalidEntryIndex: i,
        totalEntries: auditTrail.length,
      };
    }
  }

  return { valid: true, invalidEntryIndex: null, totalEntries: auditTrail.length };
}

/**
 * Get the total number of entries in the audit trail.
 */
export function getAuditTrailSize(): number {
  return auditTrail.length;
}
