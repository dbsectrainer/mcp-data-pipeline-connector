export interface AccessPolicy {
    source: string;
    deny_columns?: string[];
    row_filter?: string;
}
/**
 * Apply column-level and row-level access control to a SQL query.
 *
 * - Removes denied columns from the SELECT list (regex-based).
 * - Appends a WHERE clause for the row_filter.
 *
 * If no matching policy exists or the policy file is missing, returns sql unchanged.
 *
 * @param sql        The original SQL query string.
 * @param source     The data source name being queried.
 * @param _userClaims  JWT claims from the authenticated user (reserved for future use).
 * @param policyPath Optional path to the YAML policy file.
 */
export declare function applyAccessControl(sql: string, source: string, _userClaims: Record<string, string>, policyPath?: string): string;
