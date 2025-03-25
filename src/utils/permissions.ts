import { fetchWithAuth } from './api';

interface Permission {
  id: string;
  collection: string;
  action: string;
  permissions: any;
  fields: string[];
  role?: string;    // Role ID associated with this permission
  policy?: string;  // Policy ID associated with this permission
}

export interface UserPermissionsData {
  role: string;
  collections: {
    [collection: string]: {
      actions: string[];
      permissions: any;
    }
  };
  districtIds: number[];
  statusSubcategoryIds: number[];
}

// Cache user permissions to avoid frequent API calls
let userPermissionsCache: UserPermissionsData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Define admin role ID
const ADMIN_ROLE_ID = '8A8C7803-08E5-4430-9C56-B2F20986FA56';

/**
 * Fetches current user permissions and caches them
 */
export async function getUserPermissions(): Promise<UserPermissionsData> {
  try {
    // Check cache first
    const now = Date.now();
    if (userPermissionsCache && (now - lastFetchTime) < CACHE_DURATION) {
      console.log("Returning cached permissions");
      return userPermissionsCache;
    }

    // Step 1: Get user data to get role ID
    const userData = await fetchWithAuth('/users/me?fields=*,role.id');
    console.log("User data fetched:", userData?.data);

    if (!userData?.data) {
      throw new Error('No user data received');
    }

    // Check if user is admin
    if (userData.data.role === ADMIN_ROLE_ID) {
      const adminPermissions: UserPermissionsData = {
        role: ADMIN_ROLE_ID,
        collections: {
          'Complaint': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'ComplaintTimeline': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'District': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Status_category': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Status_subcategory': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Users': { actions: ['create', 'read', 'update', 'delete'], permissions: {} }
        },
        districtIds: [],
        statusSubcategoryIds: []
      };
      
      userPermissionsCache = adminPermissions;
      lastFetchTime = now;
      return adminPermissions;
    }

    // Initialize permissions data
    const userPermissionsData: UserPermissionsData = {
      role: userData.data.role?.id || '',
      collections: {},
      districtIds: [],
      statusSubcategoryIds: []
    };

    // Step 2: Get role data to get policies
    const roleId = typeof userData.data.role === 'object' ? userData.data.role.id : userData.data.role;
    const roleResponse = await fetchWithAuth(`/roles/${roleId}?fields=*,policies.*`);
    console.log("Role data fetched:", roleResponse?.data);

    if (!roleResponse?.data?.policies) {
      throw new Error('No policies found in role');
    }

    // Step 3: Get policy data for each policy in the role
    const rolePolicies = roleResponse.data.policies;
    console.log('Role policies:', rolePolicies);

    // Process each policy
    for (const rolePolicy of rolePolicies) {
      try {
        // Get policy ID based on whether it's an object or string
        const policyId = typeof rolePolicy === 'object' ? rolePolicy.id : rolePolicy;
        
        // Fetch detailed policy data
        const policyResponse = await fetchWithAuth(`/policies?user_id=${userData.data.id}`);
        console.log(`Policy ${policyId} response:`, policyResponse);

        if (!policyResponse?.data) continue;

        const policy = policyResponse.data;

        // Add basic collections that all users with a policy should have access to
        const basicCollections = ['Complaint', 'Users'];
        basicCollections.forEach(collection => {
          if (!userPermissionsData.collections[collection]) {
            userPermissionsData.collections[collection] = {
              actions: ['read'],
              permissions: {}
            };
            console.log(`Added basic read permission for ${collection} from policy ${policyId}`);
          }
        });

        // Add district ID from policy if present
        if (policy.district) {
          const districtId = Number(policy.district);
          if (!userPermissionsData.districtIds.includes(districtId)) {
            userPermissionsData.districtIds.push(districtId);
            console.log(`Added district ID ${districtId} from policy ${policyId}`);
          }
        }

        // Add status subcategory IDs from policy if present
        if (policy.status_subcategory) {
          const statusIds = Array.isArray(policy.status_subcategory)
            ? policy.status_subcategory
            : [policy.status_subcategory];

          statusIds.forEach((statusId: string | number) => {
            const id = Number(statusId);
            if (!userPermissionsData.statusSubcategoryIds.includes(id)) {
              userPermissionsData.statusSubcategoryIds.push(id);
              console.log(`Added status subcategory ID ${id} from policy ${policyId}`);
            }
          });
        }
      } catch (error) {
        console.error(`Error processing policy:`, error);
        // Continue with next policy even if one fails
      }
    }

    // Cache the permissions
    userPermissionsCache = userPermissionsData;
    lastFetchTime = now;

    console.log("Final user permissions:", userPermissionsData);
    return userPermissionsData;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {
      role: '',
      collections: {},
      districtIds: [],
      statusSubcategoryIds: []
    };
  }
}

/**
 * Check if user has permission to perform an action on a collection
 */
export function hasPermission(
  userPermissions: UserPermissionsData,
  collection: string,
  action: string
): boolean {
  // Admin role check - admin has access to everything
  if (userPermissions?.role === ADMIN_ROLE_ID) {
    console.log(`Admin role detected, granting permission for ${collection}:${action}`);
    return true;
  }
  
  if (!userPermissions?.collections) return false;
  
  // Debug log for permission check
  console.log(`Checking permissions for ${collection}:${action}`);
  console.log(`Available collections:`, Object.keys(userPermissions.collections));
  
  // First try direct match
  let collectionPermissions = userPermissions.collections[collection];
  if (collectionPermissions) {
    console.log(`Found exact match for collection "${collection}"`);
    return collectionPermissions.actions.includes(action);
  }
  
  // If not found, try case-insensitive match
  const collectionLower = collection.toLowerCase();
  const matchingCollectionKey = Object.keys(userPermissions.collections).find(key => 
    key.toLowerCase() === collectionLower
  );
  
  if (matchingCollectionKey) {
    console.log(`Found case-insensitive match for collection "${collection}" as "${matchingCollectionKey}"`);
    return userPermissions.collections[matchingCollectionKey].actions.includes(action);
  }
  
  // Special handling for collections with known mapping issues
  if (collection === 'District' || collection === 'district') {
    // For District, also check specific variations
    const districtVariations = ['District', 'district', 'districts', 'Districts', 'governorate', 'governorates', 'Governorate', 'Governorates'];
    for (const variation of districtVariations) {
      if (userPermissions.collections[variation]) {
        console.log(`Found District collection as "${variation}"`);
        return userPermissions.collections[variation].actions.includes(action);
      }
    }
    
    // Log all possible collection names that might match district
    const possibleMatches = Object.keys(userPermissions.collections).filter(key => 
      key.toLowerCase().includes('district') || key.toLowerCase().includes('govern'));
    if (possibleMatches.length > 0) {
      console.log(`Possible district matches found: ${possibleMatches.join(', ')}`);
    }
  }
  
  // No matching collection found
  console.log(`No permissions found for collection "${collection}"`);
  return false;
}

/**
 * Apply permission filters to a complaints query.
 * This function constructs a query string with filters based on user permissions.
 */
export function applyPermissionFilters(userPermissions: UserPermissionsData): string {
  console.log("Applying permission filters with user permissions:", userPermissions);
  
  // If user has a role but no specific restrictions, allow access to all records
  if (userPermissions.role && 
      !userPermissions.districtIds?.length && 
      !userPermissions.statusSubcategoryIds?.length) {
    console.log(`User has role ${userPermissions.role} with no specific restrictions - granting full access`);
    return "";
  }
  
  const filterParams: Record<string, string> = {};
  
  // Add district filters if any exist
  if (userPermissions.districtIds && userPermissions.districtIds.length > 0) {
    console.log(`Adding district filters for IDs: ${userPermissions.districtIds.join(', ')}`);
    filterParams["filter[district][_in]"] = userPermissions.districtIds.join(',');
  }
  
  // Add status subcategory filters if any exist
  if (userPermissions.statusSubcategoryIds && userPermissions.statusSubcategoryIds.length > 0) {
    console.log(`Adding status subcategory filters for IDs: ${userPermissions.statusSubcategoryIds.join(', ')}`);
    filterParams["filter[status_subcategory][_in]"] = userPermissions.statusSubcategoryIds.join(',');
  }
  
  // Construct query string from filter parameters
  const queryString = Object.entries(filterParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  console.log(`Final query string for permission filters: ${queryString ? '?' + queryString : '(empty)'}`);
  return queryString ? `?${queryString}` : "";
}

/**
 * Check if a complaint matches the user's permissions.
 * Returns true if the user has permission to see the complaint, false otherwise.
 */
export function complaintMatchesPermissions(
  complaint: any,
  userPermissions: UserPermissionsData
): boolean {
  // Safety check for null/undefined complaint
  if (!complaint) {
    console.log("complaintMatchesPermissions: Complaint is null or undefined");
    return false;
  }
  
  // Admin role check - admin has access to all complaints
  if (userPermissions?.role === ADMIN_ROLE_ID) {
    console.log(`Admin role detected, granting access to complaint ${complaint.id || 'unknown'}`);
    return true;
  }
  
  const complaintId = complaint.id || 'unknown';
  const complaintDistrict = complaint.district || null;
  const complaintStatus = complaint.status_subcategory || null;
  
  // Debug info for this permission check
  console.log(`Checking permissions for complaint ${complaintId}:`);
  console.log(`- District restrictions: ${userPermissions.districtIds?.length ? userPermissions.districtIds.join(', ') : 'none'}`);
  console.log(`- Status restrictions: ${userPermissions.statusSubcategoryIds?.length ? userPermissions.statusSubcategoryIds.join(', ') : 'none'}`);
  console.log(`- Complaint district: ${complaintDistrict || 'none'}`);
  console.log(`- Complaint status: ${complaintStatus || 'none'}`);
  
  // If no restrictions, allow all complaints
  if (!userPermissions.districtIds?.length && !userPermissions.statusSubcategoryIds?.length) {
    console.log(`Access ALLOWED for complaint ${complaintId} - user has no restrictions`);
    return true;
  }
  
  // Check district permission if user has district restrictions
  let districtMatch = !userPermissions.districtIds?.length; // If no district restrictions, this check passes
  if (userPermissions.districtIds?.length && complaintDistrict) {
    // Compare district IDs - handle both string and number formats
    districtMatch = userPermissions.districtIds.some(id => {
      const permissionId = typeof id === 'string' ? id : id.toString();
      const complaintDistrictId = typeof complaintDistrict === 'string' ? complaintDistrict : complaintDistrict.toString();
      return permissionId === complaintDistrictId;
    });
    console.log(`District check for complaint ${complaintId}: ${districtMatch ? 'PASS' : 'FAIL'}`);
  }
  
  // Check status subcategory permission if user has status restrictions
  let statusMatch = !userPermissions.statusSubcategoryIds?.length; // If no status restrictions, this check passes
  if (userPermissions.statusSubcategoryIds?.length && complaintStatus) {
    // Compare status IDs - handle both string and number formats
    statusMatch = userPermissions.statusSubcategoryIds.some(id => {
      const permissionId = typeof id === 'string' ? id : id.toString();
      const complaintStatusId = typeof complaintStatus === 'string' ? complaintStatus : complaintStatus.toString();
      return permissionId === complaintStatusId;
    });
    console.log(`Status check for complaint ${complaintId}: ${statusMatch ? 'PASS' : 'FAIL'}`);
  }
  
  // Both checks must pass to allow access
  const result = districtMatch && statusMatch;
  console.log(`Overall access for complaint ${complaintId}: ${result ? 'ALLOWED' : 'DENIED'}`);
  
  return result;
}

/**
 * Clear the permissions cache
 * Call this function when the user logs out
 */
export function clearPermissionsCache(): void {
  console.log("Clearing permissions cache");
  userPermissionsCache = null;
  lastFetchTime = 0;
}

/**
 * Force refresh of permissions
 * Call this after login or when permissions need to be refreshed
 */
export async function refreshPermissions(): Promise<UserPermissionsData> {
  console.log("Force refreshing permissions");
  userPermissionsCache = null;
  lastFetchTime = 0;
  return await getUserPermissions();
} 