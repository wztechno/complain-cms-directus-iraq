// utils/responsible-users.ts
import { fetchWithAuth } from '@/utils/api';

export interface StatusToUserMap { [statusId: string]: string }

interface PermissionRow {
  policy: string;
  permissions?: PermissionNode;
}

interface PermissionNode {
  id?: {
    _eq?: string | number;
    _in?: (string | number)[];
  };
  _and?: PermissionNode[];
  _or?: PermissionNode[];
  [key: string]: unknown;
}

interface UserPoliciesRow {
  policy_id?: Array<{ directus_policies_id: string }>;
  user_id?: Array<{ directus_users_id: string }>;
}

interface DirectusUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

function collectStatusIdsFromPermissions(perm: PermissionNode): string[] {
  const out: string[] = [];
  // Walk the JSON and find id._eq or id._in anywhere
  const visit = (node: PermissionNode) => {
    if (!node || typeof node !== 'object') return;
    if (node.id && typeof node.id === 'object') {
      if (typeof node.id._eq !== 'undefined') out.push(String(node.id._eq));
      if (Array.isArray(node.id._in)) node.id._in.forEach((v) => out.push(String(v)));
    }
    // Check logical arrays
    ['_and', '_or'].forEach((k) => {
      if (Array.isArray(node[k])) node[k]?.forEach(visit);
    });
    // Recurse all keys
    Object.values(node).forEach((value) => {
      if (typeof value === 'object' && value !== null) {
        visit(value as PermissionNode);
      }
    });
  };
  visit(perm);
  return Array.from(new Set(out));
}

/**
 * Build status_subcategory.id -> "First Last"
 */
export async function buildStatusToUserMap(): Promise<StatusToUserMap> {
  // 1) Status_subcategory → policy (via /permissions)
  const permURL =
    '/permissions?limit=-1' +
    '&filter[action][_eq]=read' +
    '&filter[collection][_eq]=Status_subcategory' +
    '&fields=policy,permissions';
  const permRes = await fetchWithAuth(permURL);
  const permRows: PermissionRow[] = permRes?.data ?? [];
  if (!permRows.length) return {};

  // Map every status_subcategory id to its policy id
  const statusToPolicy: Record<string, string> = {};
  for (const row of permRows) {
    const ids = collectStatusIdsFromPermissions(row.permissions || {});
    ids.forEach((sid) => { statusToPolicy[sid] = row.policy; });
  }

  const policyIds = Array.from(new Set(Object.values(statusToPolicy)));
  if (!policyIds.length) return {};

  // 2) policy -> user (via user_policies M2M)
  // Use _in for the policy list and fetch all rows
  const policyCsv = policyIds.join(',');
  const userPoliciesUrl =
    `/items/user_policies` +
    `?limit=-1` +
    `&fields=policy_id.directus_policies_id,user_id.directus_users_id` +
    `&filter[policy_id][directus_policies_id][_in]=${encodeURIComponent(policyCsv)}`;

  const usersRes = await fetchWithAuth(userPoliciesUrl);
  const upRows: UserPoliciesRow[] = usersRes?.data ?? [];

  // Build policy -> userId map (choose first user per policy; adjust if you need priority rules)
  const policyToUserIdMap: Record<string, string> = {};
  const userIds: Set<string> = new Set();

  for (const row of upRows) {
    const policies = (row.policy_id ?? []).map((p) => p.directus_policies_id).filter(Boolean);
    const users = (row.user_id ?? []).map((u) => u.directus_users_id).filter(Boolean);

    if (!policies.length || !users.length) continue;

    // If there are multiple, pair each policy with the first user (customize as needed)
    const userId = users[0];
    policies.forEach((pid) => {
      if (!policyToUserIdMap[pid]) policyToUserIdMap[pid] = userId;
    });
    userIds.add(userId);
  }

  if (!userIds.size) {
    console.warn('No users found for any policies');
    return {};
  }

  // 3) Fetch user details
  const userCsv = Array.from(userIds).join(',');
  const usersUrl =
    `/users?limit=-1&filter[id][_in]=${encodeURIComponent(userCsv)}&fields=id,first_name,last_name,email`;
  const userDetailsRes = await fetchWithAuth(usersUrl);
  const users: DirectusUser[] = userDetailsRes?.data ?? [];

  const userIdToName: Record<string, string> = {};
  users.forEach((u) => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    userIdToName[u.id] = name || u.email || 'غير محدد';
  });

  // 4) status_subcategory -> user name
  const statusToUser: StatusToUserMap = {};
  Object.entries(statusToPolicy).forEach(([statusId, policyId]) => {
    const userId = policyToUserIdMap[policyId];
    const userName = userId ? (userIdToName[userId] || 'غير محدد') : 'غير محدد';
    statusToUser[statusId] = userName;
  });

  return statusToUser;
}
