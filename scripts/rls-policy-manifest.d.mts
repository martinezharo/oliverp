export interface Policy {
  schema: string;
  table: string;
  name: string;
  permissive: string;
  roles: string[];
  command: string;
  using: string | null;
  check: string | null;
}

export const POLICY_MANIFEST_URL: URL;
export function policiesFromDatabase(client: {
  query(query: string): Promise<{ rows: unknown[] }>;
}): Promise<Policy[]>;
export function policiesFromManifest(): Promise<Policy[]>;
export function policyDifferences(expected: Policy[], actual: Policy[]): string[];
