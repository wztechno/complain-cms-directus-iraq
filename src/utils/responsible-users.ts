// utils/responsible-users.ts
import { fetchWithAuth } from '@/utils/api';

export interface StatusToUserMap { [statusId: string]: string };

// Define interfaces for better type safety
interface PermissionRow {
  policy: string;
  permissions?: {
    _and?: Array<{
      id?: {
        _eq?: string;
      };
    }>;
  };
}

interface UserPolicyRow {
  id: number;
  policy_id: Array<{
    directus_policies_id: string;
    id: number;
    user_policies_id: number;
  }>;
  user_id: Array<{
    directus_users_id: string;
    id: number;
    user_policies_id: number;
  }>;
}

interface DirectusUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

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
  permRes.data.forEach((row: PermissionRow) => {
    const id = row.permissions?._and?.[0]?.id?._eq;
    if (id) statusToPolicy[String(id)] = row.policy;      // { "56": "7DB6…", … }
  });

  const policyIds = [...new Set(Object.values(statusToPolicy))];
  if (!policyIds.length) return {};

  // 2️⃣  ── policy → user
  console.log("Fetching user policies for policy IDs:", policyIds);
  
  // Create proper filter query for Directus with policy_id
  const policyIdsParam = policyIds.join(',');
  const userPoliciesUrl = `/items/user_policies?fields=*,policy_id.directus_policies_id,policy_id.*,user_id.directus_users_id,user_id.*&filter[policy_id][directus_policies_id][_eq]=${policyIdsParam}`;
  console.log("Fetching user policies with URL:", userPoliciesUrl);
  const usersRes = await fetchWithAuth(userPoliciesUrl);
  
  if (!usersRes?.data) {
    console.error("No user policies data returned");
    return {};
  }
  
  console.log(`Received ${usersRes.data.length} user policies`);
  
  // Extract unique user IDs from the response
  const userIds: string[] = [];
  const policyToUserIdMap: Record<string, string> = {};
  
  usersRes.data.forEach((row: UserPolicyRow) => {
    // Get policy_id from the array
    const policyData = row.policy_id?.[0];
    if (!policyData?.directus_policies_id) {
      console.warn("Skipping user policy without a policy_id:", row);
      return;
    }
    
    // Get user_id from the array
    const userData = row.user_id?.[0];
    if (!userData?.directus_users_id) {
      console.warn("Skipping user policy without user_id data:", row);
      return;
    }
    
    const policyId = policyData.directus_policies_id;
    const userId = userData.directus_users_id;
    
    policyToUserIdMap[policyId] = userId;
    if (!userIds.includes(userId)) {
      userIds.push(userId);
    }
    
    console.log(`✓ Mapped policy ${policyId} to user ID ${userId}`);
  });
  
  // 3️⃣ ── Fetch actual user data
  if (userIds.length === 0) {
    console.warn("No user IDs found");
    return {};
  }
  
  console.log("Fetching user details for user IDs:", userIds);
  
  // Fetch user details
  const userIdsParam = userIds.join(',');
  const usersUrl = `/users?filter[id][_in]=${userIdsParam}&fields=id,first_name,last_name,email`;
  console.log("Fetching users with URL:", usersUrl);
  const userDetailsRes = await fetchWithAuth(usersUrl);
  
  if (!userDetailsRes?.data) {
    console.error("No user details data returned");
    return {};
  }
  
  console.log(`Received ${userDetailsRes.data.length} user details`);
  
  // Build user ID to full name map
  const userIdToName: Record<string, string> = {};
  userDetailsRes.data.forEach((user: DirectusUser) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (fullName) {
      userIdToName[user.id] = fullName;
      console.log(`✓ User ${user.id} -> "${fullName}"`);
    } else {
      userIdToName[user.id] = user.email || 'غير محدد';
      console.log(`✓ User ${user.id} -> "${user.email || 'غير محدد'}" (fallback)`);
    }
  });

  // 4️⃣  ── status_subcategory → user   (final map)
  const statusToUser: StatusToUserMap = {};
  
  console.log("Status to policy map:", statusToPolicy);
  console.log("Policy to user ID map:", policyToUserIdMap);
  console.log("User ID to name map:", userIdToName);
  
  Object.entries(statusToPolicy).forEach(([statusId, policyId]) => {
    const userId = policyToUserIdMap[policyId];
    const username = userId ? userIdToName[userId] ?? 'غير محدد' : 'غير محدد';
    statusToUser[statusId] = username;
    console.log(`Mapping status_subcategory ${statusId} -> policy ${policyId} -> user ID ${userId} -> user "${username}"`);
  });

  console.log("FINAL STATUS TO USER MAP:", statusToUser);
  return statusToUser;   // e.g. { "56": "admin anbar", "54": "john doe", … }
}
