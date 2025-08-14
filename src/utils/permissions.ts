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
  isAdmin: boolean; // Changed from role string to a boolean flag
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
const ADMIN_ROLE_ID = '0FE8C81C-035D-41AC-B3B9-72A35678C558';

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
    
    console.log("Fetching fresh permissions data");

    // Get user info from localStorage
    const storedUserInfo = localStorage.getItem('user_info');
    if (!storedUserInfo) {
      console.error('No user info found in localStorage');
      return createBasicPermissions();
    }

    // Parse the stored user info
    let userData;
    try {
      userData = JSON.parse(storedUserInfo);
      console.log("User data loaded from localStorage");
    } catch (error) {
      console.error("Error parsing user info from localStorage:", error);
      return createBasicPermissions();
    }

    if (!userData) {
      console.error('No user data after parsing');
      return createBasicPermissions();
    }

    // Check if user is admin
    const roleId = userData.role?.id || userData.role;
    const isAdmin = roleId === ADMIN_ROLE_ID;
    
    if (isAdmin) {
      console.log("User is admin, granting full permissions");
      const adminPermissions: UserPermissionsData = {
        isAdmin: true,
        collections: {
          'Complaint': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'ComplaintTimeline': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'District': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Status_category': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Status_subcategory': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Users': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Complaint_main_category': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Complaint_sub_category': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'Complaint_ratings': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
          'settings': { actions: ['create', 'read', 'update', 'delete'], permissions: {} },
        },
        districtIds: [],
        statusSubcategoryIds: []
      };
      
      userPermissionsCache = adminPermissions;
      lastFetchTime = now;
      return adminPermissions;
    }

    // For non-admin users, permissions are based only on policies
    const permissionsData: UserPermissionsData = {
      isAdmin: false,
      collections: {},
      districtIds: [],
      statusSubcategoryIds: []
    };

    // Add basic collections that all users should have access to
    addBasicCollections(permissionsData);
    
    // NEW APPROACH: Get policies from /items/user_policies endpoint
    try {
      // Get the user ID from userData
      const userId = userData.id;
      if (!userId) {
        console.error('User ID not found in localStorage data');
        return permissionsData;
      }
      
      console.log(`Fetching policies for user ID`);
      
      // Fetch user policies from the API
      const userPoliciesResponse = await fetchWithAuth(`/items/user_policies?filter[user_id][directus_users_id][_eq]=${userId}`);
      
      if (!userPoliciesResponse || !userPoliciesResponse.data || !userPoliciesResponse.data.length) {
        console.warn(`No user policies found for user ID ${userId}`);
        // Fall back to basic permissions
        userPermissionsCache = permissionsData;
        lastFetchTime = now;
        return permissionsData;
      }
      
      console.log(`Found user policies`);
      
      // Extract policy IDs from the response
      const policyIds: string[] = [];
      for (const userPolicy of userPoliciesResponse.data) {
        if (userPolicy.policy_id) {
          // Handle the nested structure: policy_id is an array of objects with directus_policies_id
          const policyIdData = userPolicy.policy_id;
          let policyId;
          
          if (Array.isArray(policyIdData) && policyIdData.length > 0) {
            policyId = policyIdData[0]?.directus_policies_id;
          } else if (typeof policyIdData === 'object' && policyIdData?.directus_policies_id) {
            policyId = policyIdData.directus_policies_id;
          } else if (typeof policyIdData === 'string') {
            policyId = policyIdData;
          }
          
          if (policyId && !policyIds.includes(String(policyId))) {
            policyIds.push(String(policyId));
            console.log(`Added policy ID: ${policyId}`);
          }
        }
      }
      if (policyIds.length === 0) {
        console.warn('No valid policy IDs found in user policies');
        userPermissionsCache = permissionsData;
        lastFetchTime = now;
        return permissionsData;
      }
      
      console.log(`Extracted policy IDs`);
      
      // Process each policy to fetch permissions and extract district/status IDs
      for (const policyId of policyIds) {
        try {
          // Fetch policy details first to get district_id and status_subcategory
          let policyData = null;
          try {
            const policyResponse = await fetchWithAuth(`/policies/${policyId}`);
            if (policyResponse && policyResponse.data) {
              policyData = policyResponse.data;
              console.log(`Successfully fetched policy data for`);
              
              // Process district ID if present
              if (policyData.district_id) {
                const districtId = Number(policyData.district_id);
                if (!isNaN(districtId) && !permissionsData.districtIds.includes(districtId)) {
                  permissionsData.districtIds.push(districtId);
                  console.log(`Added district ID`);
                }
              }
              
              // Process status subcategory IDs if present
              if (policyData.status_subcategory) {
                const statusIds = Array.isArray(policyData.status_subcategory) 
                  ? policyData.status_subcategory 
                  : [policyData.status_subcategory];
                
                statusIds.forEach((statusId: string | number) => {
                  const id = Number(statusId);
                  if (!isNaN(id) && !permissionsData.statusSubcategoryIds.includes(id)) {
                    permissionsData.statusSubcategoryIds.push(id);
                    console.log(`Added status subcategory ID`);
                  }
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch policy ${policyId} details:`, error);
          }
          
          // Now fetch permissions for this policy
          console.log(`Fetching permissions for policy ID: ${policyId}`);
          const permissionsResponse = await fetchWithAuth(`/permissions?filter[policy][_eq]=${policyId}`);
          
          if (!permissionsResponse || !permissionsResponse.data || !permissionsResponse.data.length) {
            console.warn(`No permissions found for policy ID ${policyId}`);
            continue;
          }
          
          console.log(`Found ${permissionsResponse.data.length} permissions for policy ${policyId}`);
          
          // Process the permissions for this policy
          processCollectionPermissions(permissionsResponse.data, permissionsData);
          
          // If we don't have any collection permissions but we do have a valid policy,
          // grant access to standard collections
          if (Object.keys(permissionsData.collections).length <= 3) { // Only has basic collections
            const sidebarCollections = [
              'Complaint', 'ComplaintTimeline', 'Complaint_main_category',
              'Complaint_ratings', 'Complaint_sub_category', 'District',
              'Status_category', 'Status_subcategory', 'Users'
            ];
            
            sidebarCollections.forEach(collection => {
              if (!permissionsData.collections[collection]) {
                permissionsData.collections[collection] = {
                  actions: ['read'],
                  permissions: {}
                };
                console.log(`Added default read permission for`);
              }
            });
          }
        } catch (error) {
          console.error(`Error processing policy ${policyId}:`, error);
        }
      }
      
      // Cache the permissions and return
      userPermissionsCache = permissionsData;
      lastFetchTime = now;
      console.log("Final user permissions:", {
        isAdmin: permissionsData.isAdmin,
        collections: Object.keys(permissionsData.collections),
        districtIds: permissionsData.districtIds,
        statusSubcategoryIds: permissionsData.statusSubcategoryIds
      });
      return permissionsData;
      
    } catch (error) {
      console.error("Error fetching user policies:", error);
      
      // FALLBACK: Try the legacy approach with policies from user data
      try {
        // If the new approach fails, try to use policies from user data (legacy approach)
        console.log("Trying legacy approach with policies from user data");
        
        let userPolicies = userData.policies || [];
        if (userPolicies[0] && Array.isArray(userPolicies[0])) {
          userPolicies = userPolicies[0];
        }
        if (!Array.isArray(userPolicies)) {
          userPolicies = [userPolicies].filter(Boolean);
        }
        
        if (userPolicies.length === 0) {
          console.log("No policies found for user using legacy approach");
          return permissionsData;
        }
        
        console.log(`Found ${userPolicies.length} policies using legacy approach`);
        
        // Process each policy
        for (const policyItem of userPolicies) {
          try {
            // Get the policy ID
            const policyId = normalizePolicyId(policyItem);
            if (!policyId) {
              console.warn("Skipping invalid policy:", policyItem);
              continue;
            }
            
            console.log(`Processing legacy policy ${policyId}`);
            
            // Fetch permissions for this policy
            const policyPermissions = await fetchPolicyPermissions(policyId);
            
            if (policyPermissions.length > 0) {
              processCollectionPermissions(policyPermissions, permissionsData);
            } else {
              console.log(`No permissions found for legacy policy ${policyId}`);
            }
          } catch (error) {
            console.error(`Error processing legacy policy:`, error);
          }
        }
        
        // Cache the permissions and return
        userPermissionsCache = permissionsData;
        lastFetchTime = now;
        console.log("Final user permissions (legacy):", permissionsData);
        return permissionsData;
      } catch (legacyError) {
        console.error("Legacy approach also failed:", legacyError);
        return permissionsData;
      }
    }
  } catch (error) {
    console.error('Error in getUserPermissions:', error);
    return createBasicPermissions();
  }
}

// Helper function to create basic permissions
function createBasicPermissions(): UserPermissionsData {
  return {
    isAdmin: false,
    collections: {
      // Provide read access to basic collections
      'Complaint': { actions: ['read'], permissions: {} },
      'Users': { actions: ['read'], permissions: {} },
      'settings': { actions: ['read'], permissions: {} }
    },
    districtIds: [],
    statusSubcategoryIds: []
  };
}

// Helper function to add basic collections to permissions
function addBasicCollections(permissionsData: UserPermissionsData) {
  const basicCollections = ['Complaint', 'Users', 'settings'];
  basicCollections.forEach(collection => {
    if (!permissionsData.collections[collection]) {
      permissionsData.collections[collection] = {
        actions: ['read'],
        permissions: {}
      };
      console.log(`Added basic read permission for ${collection}`);
    }
  });
}

// Helper function to normalize policy ID
function normalizePolicyId(policyId: any): string | null {
  if (!policyId) return null;
  
  if (typeof policyId === 'string') return policyId;
  if (typeof policyId === 'number') return policyId.toString();
  if (typeof policyId === 'object' && policyId.id) return policyId.id.toString();
  
  return null;
}

// Helper function to process collection permissions from policy
function processCollectionPermissions(permissions: any[], permissionsData: UserPermissionsData) {
  if (!Array.isArray(permissions)) return;
  
  permissions.forEach(permission => {
    if (!permission.collection) return;
    
    // Add collection if it doesn't exist
    if (!permissionsData.collections[permission.collection]) {
      permissionsData.collections[permission.collection] = {
        actions: [],
        permissions: {}
      };
    }
    
    // Add action if not already present
    if (permission.action && !permissionsData.collections[permission.collection].actions.includes(permission.action)) {
      permissionsData.collections[permission.collection].actions.push(permission.action);
      console.log(`Added permission for`);
    }
    
    // Process custom conditions (district, status_subcategory)
    if (permission.permissions) {
      // Handle district filter - support multiple formats
      // Check for _eq format (single district)
      if (permission.permissions._filter?.district?._eq) {
        const districtId = Number(permission.permissions._filter.district._eq);
        if (!isNaN(districtId) && !permissionsData.districtIds.includes(districtId)) {
          permissionsData.districtIds.push(districtId);
          console.log(`Added district ID ${districtId} from policy permission (_eq filter)`);
        }
      }
      
      // Check for _in format (multiple districts)
      if (permission.permissions._filter?.district?._in) {
        const districtIds = permission.permissions._filter.district._in;
        if (Array.isArray(districtIds)) {
          districtIds.forEach(id => {
            const districtId = Number(id);
            if (!isNaN(districtId) && !permissionsData.districtIds.includes(districtId)) {
              permissionsData.districtIds.push(districtId);
              console.log(`Added district ID ${districtId} from policy permission (_in filter)`);
            }
          });
        }
      }
      
      // Direct district field in permissions
      if (permission.permissions.district) {
        const districtValue = permission.permissions.district;
        if (Array.isArray(districtValue)) {
          districtValue.forEach(id => {
            const districtId = Number(id);
            if (!isNaN(districtId) && !permissionsData.districtIds.includes(districtId)) {
              permissionsData.districtIds.push(districtId);
              console.log(`Added district ID ${districtId} from direct district array in permission`);
            }
          });
        } else {
          const districtId = Number(districtValue);
          if (!isNaN(districtId) && !permissionsData.districtIds.includes(districtId)) {
            permissionsData.districtIds.push(districtId);
            console.log(`Added district ID ${districtId} from direct district value in permission`);
          }
        }
      }
      
      // Handle status subcategory filter
      if (permission.permissions._filter?.status_subcategory?._eq) {
        const statusId = Number(permission.permissions._filter.status_subcategory._eq);
        if (!isNaN(statusId) && !permissionsData.statusSubcategoryIds.includes(statusId)) {
          permissionsData.statusSubcategoryIds.push(statusId);
          console.log(`Added status subcategory ID ${statusId} from policy permission`);
        }
      }
      
      // Check for status subcategory _in format (multiple statuses)
      if (permission.permissions._filter?.status_subcategory?._in) {
        const statusIds = permission.permissions._filter.status_subcategory._in;
        if (Array.isArray(statusIds)) {
          statusIds.forEach(id => {
            const statusId = Number(id);
            if (!isNaN(statusId) && !permissionsData.statusSubcategoryIds.includes(statusId)) {
              permissionsData.statusSubcategoryIds.push(statusId);
              console.log(`Added status subcategory ID ${statusId} from policy permission (_in filter)`);
            }
          });
        }
      }
    }
  });
}

/**
 * Check if user has permission to perform an action on a collection
 */
export function hasPermission(
  userPermissions: UserPermissionsData,
  collection: string,
  action: string
): boolean {
  // Admin check - admin has access to everything
  if (userPermissions?.isAdmin) {
    console.log(`Admin user detected, granting permission for`);
    return true;
  }
  
  if (!userPermissions?.collections) return false;
  
  // Debug log for permission check
  console.log(`Checking permissions for`);
  console.log(`Available collections`);
  
  // First try direct match
  let collectionPermissions = userPermissions.collections[collection];
  if (collectionPermissions) {
    console.log(`Found exact match for collection`);
    return collectionPermissions.actions.includes(action);
  }
  
  // If not found, try case-insensitive match
  const collectionLower = collection.toLowerCase();
  const matchingCollectionKey = Object.keys(userPermissions.collections).find(key => 
    key.toLowerCase() === collectionLower
  );
  
  if (matchingCollectionKey) {
    console.log(`Found case-insensitive match for collection`);
    return userPermissions.collections[matchingCollectionKey].actions.includes(action);
  }
  
  // Special handling for collections with known mapping issues
  if (collection === 'District' || collection === 'district') {
    // For District, also check specific variations
    const districtVariations = ['District', 'district', 'districts', 'Districts', 'governorate', 'governorates', 'Governorate', 'Governorates'];
    for (const variation of districtVariations) {
      if (userPermissions.collections[variation]) {
        console.log(`Found District collection`);
        return userPermissions.collections[variation].actions.includes(action);
      }
    }
    
    // Log all possible collection names that might match district
    const possibleMatches = Object.keys(userPermissions.collections).filter(key => 
      key.toLowerCase().includes('district') || key.toLowerCase().includes('govern'));
    if (possibleMatches.length > 0) {
      console.log(`Possible district matches found`);
    }
  }
  
  // No matching collection found
  console.log(`No permissions found for collection`);
  return false;
}

/**
 * Apply permission filters to a complaints query.
 * This function constructs a query string with filters based on user permissions.
 */
export function applyPermissionFilters(userPermissions: UserPermissionsData): string {
  console.log("Applying permission filters with user permissions");
  
  // If user is admin, allow access to all records
  if (userPermissions.isAdmin) {
    console.log(`Admin user detected - granting full access without filters`);
    return "";
  }
  
  // If no specific restrictions, allow access to all records
  if (!userPermissions.districtIds?.length && !userPermissions.statusSubcategoryIds?.length) {
    console.log(`User has no specific district or status restrictions - granting full access`);
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
    console.log(`Adding status subcategory filters for IDs`);
    filterParams["filter[status_subcategory][_in]"] = userPermissions.statusSubcategoryIds.join(',');
  }
  
  // Construct query string from filter parameters
  const queryString = Object.entries(filterParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  console.log(`Final query string for permission filters`);
  return queryString ? `?${queryString}` : "";
}

/**
 * Check if a complaint matches the user's permissions.
 * Returns true if the user has permission to see the complaint, false otherwise.
 */
export function complaintMatchesPermissions(complaint: any, permissions: any[]): boolean {
  if (!permissions || !permissions.length) return true;
  
  // For each permission in the array
  return permissions.some(permission => {
    // If there's no specific permission conditions, allow access
    if (!permission.permissions || !permission.permissions._and) return true;

    // Check each condition in the _and array
    return permission.permissions._and.every((condition: any) => {
      // Check district condition
      if (condition.district?._eq !== undefined) {
        if (complaint.district !== condition.district._eq) return false;
      }

      // Check status subcategory condition
      if (condition.status_subcategory?._in) {
        if (!condition.status_subcategory._in.includes(complaint.status_subcategory)) return false;
      }

      // Check complaint subcategory condition
      if (condition.complaint_subcategory?._in) {
        if (!condition.complaint_subcategory._in.includes(complaint.Complaint_Subcategory)) return false;
      }

      return true;
    });
  });
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

/**
 * Fetches permissions for a specific policy
 * Uses the permissions endpoint which should be accessible to all authenticated users
 */
async function fetchPolicyPermissions(policyId: string): Promise<any[]> {
  try {
    // Use the direct endpoint with the proper policy field
    const response = await fetchWithAuth(`/permissions?filter[policy][_eq]=${policyId}`);
    
    if (!response || !response.data) {
      console.warn(`No permissions found for policy ${policyId} in permissions endpoint`);
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching permissions for policy`, error);
    return [];
  }
} 