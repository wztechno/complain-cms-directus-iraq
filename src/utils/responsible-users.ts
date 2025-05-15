// utils/responsible-users.ts
import { fetchWithAuth } from '@/utils/api';

export interface StatusToUserMap { [statusId: string]: string };

/**
 * Fetch and build a map: status_subcategory.id  ->  "First Last"
 */
export async function buildStatusToUserMap(): Promise<StatusToUserMap> {
  // 1️⃣  ── Status_subcategory → policy
  const permURL =
  '/permissions' +
  '?filter[action][_eq]=read' +
  '&filter[collection][_eq]=Status_subcategory' +
  '&fields=policy,permissions';
const permRes = await fetchWithAuth(permURL);
  if (!permRes?.data) return {};

  const statusToPolicy: Record<string, string> = {};
  permRes.data.forEach((row: any) => {
    const id = row.permissions?._and?.[0]?.id?._eq;
    if (id) statusToPolicy[String(id)] = row.policy;      // { "56": "7DB6…", … }
  });

  const policyIds = [...new Set(Object.values(statusToPolicy))];
  if (!policyIds.length) return {};

  // 2️⃣  ── policy → user
  console.log("Fetching user policies for policy IDs:", policyIds);
  
  // Create proper filter query for Directus with policy_id
  const policyIdsParam = policyIds.join(',');
  const userPoliciesUrl = `/items/user_policies?fields=policy_id,user_id.first_name,user_id.last_name&filter[policy_id][_in]=${policyIdsParam}`;
  console.log("Fetching user policies with URL:", userPoliciesUrl);
  const usersRes = await fetchWithAuth(userPoliciesUrl);
  
  if (!usersRes?.data) {
    console.error("No user policies data returned");
    return {};
  }
  
  console.log(`Received ${usersRes.data.length} user policies`);
  
  const policyToUser: Record<string, string> = {};
  usersRes.data.forEach((row: any) => {
    // Get policy_id (can be array or string)
    const policyId = Array.isArray(row.policy_id) ? row.policy_id[0] : row.policy_id;
    
    if (!policyId) {
      console.warn("Skipping user policy without a policy_id:", row);
      return;
    }
    
    // Get user (can be array or object)
    const user = Array.isArray(row.user_id) ? row.user_id[0] : row.user_id;
    if (!user) {
      console.warn("Skipping user policy without user_id data:", row);
      return;
    }
    
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (fullName) {
      policyToUser[policyId] = fullName;
      console.log(`✓ Mapped policy ${policyId} to user "${fullName}"`);
    }
  });

  // 3️⃣  ── status_subcategory → user   (final map)
  const statusToUser: StatusToUserMap = {};
  
  console.log("Status to policy map:", statusToPolicy);
  console.log("Policy to user map:", policyToUser);
  
  Object.entries(statusToPolicy).forEach(([statusId, policyId]) => {
    const username = policyToUser[policyId] ?? 'غير محدد';
    statusToUser[statusId] = username;
    console.log(`Mapping status_subcategory ${statusId} -> policy ${policyId} -> user "${username}"`);
  });

  console.log("FINAL STATUS TO USER MAP:", statusToUser);
  return statusToUser;   // e.g. { "56": "admin anbar", "54": "john doe", … }
}
