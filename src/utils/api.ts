const BASE_URL = 'https://complaint.top-wp.com';

// Add a global function to handle token expiration
let logoutCallback: (() => void) | null = null;

// Session token refresh interval in milliseconds (10 minutes)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

// Track when the last token refresh occurred
let lastTokenRefreshTime = 0;

// Function to register the logout handler from AuthContext
export function registerLogoutHandler(callback: () => void) {
  logoutCallback = callback;
  console.log('Logout handler registered');
}

// Function to handle token expiration
function handleTokenExpiration() {
  console.log('Token expired, logging out automatically');
  
  // Clean up localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  localStorage.removeItem('current_user_id');
  localStorage.removeItem('reload_once');
  
  // Call the logout function if it's registered
  if (logoutCallback) {
    logoutCallback();
  } else {
    console.warn('No logout handler registered, redirecting to login page');
    // Fallback: redirect to login page
    window.location.href = '/login';
  }
}

// Function to refresh the token before it expires
export async function refreshToken(): Promise<boolean> {
  try {
    const currentToken = localStorage.getItem('auth_token');
    if (!currentToken) {
      console.error('Cannot refresh token: No token found');
      return false;
    }
    
    // If we've refreshed the token recently, don't do it again
    const now = Date.now();
    if (now - lastTokenRefreshTime < TOKEN_REFRESH_INTERVAL / 2) {
      console.log('Token was refreshed recently, skipping');
      return true;
    }
    
    console.log('Refreshing authentication token...');
    
    // For Directus, we can keep the session alive by making a request to /users/me
    // This is simpler than implementing a full refresh token flow
    const response = await fetch(`${BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to refresh session: ${response.status}`);
      return false;
    }
    
    // If the request was successful, the session is still valid
    // We just update the timestamp to indicate the session was refreshed
    lastTokenRefreshTime = now;
    console.log('Session refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}

// Schedule periodic token refresh
export function setupTokenRefresh() {
  // Immediately set the last refresh time to now
  lastTokenRefreshTime = Date.now();
  
  // Set up interval to refresh token
  const refreshInterval = setInterval(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No token found, clearing refresh interval');
      clearInterval(refreshInterval);
      return;
    }
    
    const success = await refreshToken();
    if (!success) {
      console.warn('Token refresh failed, may need to re-authenticate soon');
    }
  }, TOKEN_REFRESH_INTERVAL / 2); // Refresh at half the interval to ensure we're always covered
  
  console.log(`Token refresh scheduled every ${TOKEN_REFRESH_INTERVAL / (2 * 60 * 1000)} minutes`);
  
  // Clear the interval when the window is closed or the page is navigated away
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });
  
  return refreshInterval;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.error('Authentication failed: No auth token found in localStorage');
    const error = new Error('Authentication failed - No token found');
    (error as unknown as Record<string, number>).status = 401;
    throw error;
  }
  
  // Create headers with the token
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    // Any successful API request helps keep the session alive
    // Update the last refresh time
    lastTokenRefreshTime = Date.now();

    // SPECIAL CASE: For complaint endpoints, route through our local proxy
    if (endpoint.startsWith('/items/Complaint')) {
      // Don't try to reroute to a proxy that doesn't exist
      // console.log(`Processing complaints endpoint: ${endpoint}`);
      
      // If the endpoint is for complaint listing and we're not already fetching individual items
      if (endpoint === '/items/Complaint' || endpoint.includes('?filter')) {
        try {
          console.log('Fetching user policies to determine permissions...');
          const policyRes = await fetch(`${BASE_URL}/items/user_policies?fields=*,policy_id.*,user_id.*`, { headers });
          const policyJson = await policyRes.json();
          console.log('Raw user policies data:', policyJson);
      
          // Get user info from localStorage instead of making an API call
          const userInfoStr = localStorage.getItem('user_info');
          interface PolicyAdmin {
            id: string;
            role?: string;
            [key: string]: any;
          }
          // policyAdminJson will hold the current user data
          let policyAdminJson: { data: PolicyAdmin | null } = { data: null };
          let currentUserId = '';
          
          if (userInfoStr) {
            try {
              const userData = JSON.parse(userInfoStr);
              policyAdminJson = { data: userData as PolicyAdmin };
              currentUserId = userData.id;
              console.log(`User info from localStorage:`, policyAdminJson);
              console.log(`Current user ID: ${currentUserId}`);
            } catch (parseError) {
              console.error('Error parsing user info from localStorage:', parseError);
              // Fallback to API call if localStorage data is invalid
              const policyAdmin = await fetch(`${BASE_URL}/users/me`, { headers });
              policyAdminJson = (await policyAdmin.json()) as { data: PolicyAdmin };
              currentUserId = policyAdminJson.data?.id || '';
              console.log(`Fallback to API - Policy admin:`, policyAdminJson);
            }
          } else {
            // Fallback to API call if localStorage doesn't have the data
            const policyAdmin = await fetch(`${BASE_URL}/users/me`, { headers });
            policyAdminJson = (await policyAdmin.json()) as { data: PolicyAdmin };
            currentUserId = policyAdminJson.data?.id || '';
            console.log(`Fallback to API - Policy admin:`, policyAdminJson);
          }
          
          const isAdmin = policyAdminJson.data?.role === '0FE8C81C-035D-41AC-B3B9-72A35678C558';
          
          // Find user policy that matches current user ID
          console.log('Looking for policies matching user ID:', currentUserId);
          const userPolicies = policyJson.data || [];
          console.log('All available policies:', userPolicies);
          
          // Find the correct policy for this user
          let matchingUserPolicy = null;
          let policyId = null;
          
          for (const policy of userPolicies) {
            console.log('Examining policy:', policy);
            
            // Handle the case where user_id might be an array
            const policyUserId = Array.isArray(policy.user_id) ? policy.user_id[0].directus_users_id : policy.user_id.directus_users_id;
            console.log(`Policy user ID (${typeof policyUserId}):`, policyUserId);
            console.log(`Current user ID (${typeof currentUserId}):`, currentUserId);
            
            if (policyUserId === currentUserId) {
              matchingUserPolicy = policy;
              // Handle policy_id as either a string or an array
              policyId = Array.isArray(policy.policy_id) ? policy.policy_id[0].directus_policies_id : policy.policy_id.directus_policies_id;
              console.log('MATCH FOUND! Using policy:', matchingUserPolicy);
              console.log('Policy ID extracted:', policyId);
              break;
            }
          }
          
          // If no matching policy was found, try to use the first one (backward compatibility)
          if (!matchingUserPolicy && userPolicies.length > 0) {
            console.warn('No policy exactly matching current user. Using first available policy as fallback.');
            matchingUserPolicy = userPolicies[0];
            policyId = Array.isArray(matchingUserPolicy.policy_id) 
              ? matchingUserPolicy.policy_id[0].directus_policies_id
              : matchingUserPolicy.policy_id.directus_policies_id;
          }

          console.log(`Final policy being used: ${policyId || 'Admin user - no specific policy needed'}`);
      
          // For admin users, skip the permission check and fetch all complaints
          if (isAdmin) {
            console.log('Admin user detected - fetching all complaints');
            const directEndpoint = `${BASE_URL}/items/Complaint`;
            
            const complaintResponse = await fetch(directEndpoint, {
              ...options,
              headers,
            });
            
            if (!complaintResponse.ok) {
              console.error(`Error fetching admin complaints: ${complaintResponse.status}`);
              throw new Error(`API call failed: ${complaintResponse.status} ${complaintResponse.statusText}`);
            }
            
            return await complaintResponse.json();
          }
      
          // For regular users with policy ID, continue with the permission check
          const permissionRes = await fetch(`${BASE_URL}/permissions?filter[policy][_eq]=${policyId}`, { headers });
          const permissionJson = await permissionRes.json();
          const permissions = permissionJson.data;
      
          console.log(`Fetched permissions for policy #${policyId}:`, permissions);
      
          // Extract filters from permissions
          // Step 1: Find the Complaint permission block
          const complaintPermission = permissions.find((p: any) => p.collection === 'Complaint');

          // if (!complaintPermission || !complaintPermission.permissions?._and) {
          //   throw new Error('No Complaint permissions found for the current policy');
          // }

          const complaintFilters = complaintPermission.permissions._and;
          console.log(`Complaint filters: ${JSON.stringify(complaintFilters)}`);
          // Step 2: Convert permission filters to Directus-compatible filter object
          const filterParams: string[] = [];

          for (const filter of complaintFilters) {
            for (const [key, condition] of Object.entries(filter)) {
              if (typeof condition === 'object' && condition !== null) {
                for (const [operator, value] of Object.entries(condition)) {
                  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    filterParams.push(`filter[${key}][${operator}]=${encodeURIComponent(value)}`);
                  }
                }
              }
            }
          }

          const filteredEndpoint = !isAdmin ? `/items/Complaint?${filterParams.join('&')}` : `/items/Complaint`;
          
          console.log(`Filter params: ${JSON.stringify(filterParams)}`);
          // Step 3: Convert filter object into URL query string
          // const filterQuery = encodeURIComponent(JSON.stringify(filterParams));
          console.log(`Using filtered complaints endpoint: ${filteredEndpoint}`);
      
          const directEndpoint = `${BASE_URL}${filteredEndpoint}`;
          const complaintResponse = await fetch(directEndpoint, {
            ...options,
            headers,
          });
      
          if (!complaintResponse.ok) {
            console.error(`Error fetching filtered complaints: ${complaintResponse.status}`);
            throw new Error(`API call failed: ${complaintResponse.status} ${complaintResponse.statusText}`);
          }
      
          let responseData = await complaintResponse.json();
          // ... (your existing logic for handling ID-only arrays, etc.)
      
          console.log(`Received response from complaints endpoint:`, responseData);
          
          // Check if we received an array of IDs instead of full objects
          if (responseData?.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
            const firstItem = responseData.data[0];
            
            if (typeof firstItem === 'number' || typeof firstItem === 'string') {
              console.log('Detected ID-only response for complaints, fetching full objects...');
              
              // We received only IDs, now fetch the full objects
              const complaintIds = responseData.data;
              const fullComplaints = [];
              
              // Process in smaller batches to not overwhelm the API
              const batchSize = 5;
              for (let i = 0; i < complaintIds.length; i += batchSize) {
                const batch = complaintIds.slice(i, i + batchSize);
                console.log(`Fetching details for complaints batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)`);
                
                const batchResults = await Promise.all(
                  batch.map(async (id: string | number) => {
                    try {
                      // Use the direct URL to fetch each complaint by ID
                      const detailUrl = `${BASE_URL}/items/Complaint/${id}`;
                      console.log(`Fetching individual complaint: ${detailUrl}`);
                      
                      const detailResponse = await fetch(detailUrl, {
                        headers
                      });
                      
                      if (!detailResponse.ok) {
                        console.error(`Error fetching complaint #${id}: ${detailResponse.status}`);
                        return null;
                      }
                      
                      const detailData = await detailResponse.json();
                      console.log(`Successfully fetched complaint #${id}`);
                      return detailData?.data || null;
                    } catch (error) {
                      console.error(`Error fetching detail for complaint ID ${id}:`, error);
                      return null;
                    }
                  })
                );
                
                // Add valid complaints to our result array
                const validResults = batchResults.filter(c => c !== null);
                console.log(`Got ${validResults.length}/${batch.length} valid complaints in this batch`);
                fullComplaints.push(...validResults);
              }
              
              console.log(`Successfully fetched ${fullComplaints.length}/${complaintIds.length} full complaint objects`);
              
              // Replace the original response data with the full objects
              responseData.data = fullComplaints;
            }
          }
          
          return responseData;
        } catch (error) {
          console.error(`Error handling complaint listing:`, error);
          throw error;
        }
      } else if (endpoint.includes('/items/Complaint/')) {
        // For individual complaint fetching
        const directEndpoint = `${BASE_URL}${endpoint}`;
        console.log(`Fetching individual complaint from: ${directEndpoint}`);
        
        const response = await fetch(directEndpoint, {
          ...options,
          headers,
        });
        
        if (!response.ok) {
          console.error(`Error fetching individual complaint: ${response.status}`);
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
    }
    
    // SPECIAL CASE: For permissions endpoints, normalize to direct API call
    if (endpoint.startsWith('/permissions')) {
      const directEndpoint = `${BASE_URL}${endpoint}`;
      console.log(`Using direct permissions endpoint: ${directEndpoint}`);
      
      const response = await fetch(directEndpoint, {
        ...options,
        headers,
      });
      console.log(`Permissions response: ${response}`);
      
      if (!response.ok) {
        console.error(`Error fetching permissions: ${response.status} ${response.statusText}`);
        // For permission errors, return empty data instead of throwing
        return { data: [] };
      }
      
      return await response.json();
    }
    
    // SPECIAL CASE: For user_policies endpoints
    if (endpoint.includes('/items/user_policies')) {
      const directEndpoint = `${BASE_URL}${endpoint}`;
      console.log(`Fetching user policies from: ${directEndpoint}`);
      
      const response = await fetch(directEndpoint, {
        ...options,
        headers,
      });
      
      console.log(`User policies response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`Error fetching user policies: ${response.status} ${response.statusText}`);
        // For policy errors, return empty data instead of throwing
        return { data: [] };
      }
      
      return await response.json();
    }
    
// SPECIAL CASE: For policy item endpoints
if (endpoint.startsWith('/policies')) {
  const directEndpoint = `${BASE_URL}${endpoint}`;
  console.log(`Fetching policy data from: ${directEndpoint}`);

  const response = await fetch(directEndpoint, {
    ...options,
    headers,
  });

  console.log(`Policy data response status: ${response.status}`);

  // Parse JSON once
  const responseData = await response.json();
  console.log(`Policy data response:`, responseData);

  if (!response.ok) {
    console.error(`Error fetching policy data: ${response.status} ${response.statusText}`);
    return { data: null }; // Return empty data instead of throwing
  }

  return responseData; // Return parsed data
}


    // SPECIAL CASE: For policy endpoints, add better error handling
    if (endpoint.startsWith('/policies')) {
      const directEndpoint = `${BASE_URL}${endpoint}`;
      console.log(`Making request to: ${directEndpoint}`);
      console.log('Request method:', options.method);
      console.log('Request headers:', { ...headers, Authorization: 'Bearer ***' }); // Hide token
      
      // For PATCH/PUT/DELETE requests, first verify the token by making a simple request
      if (options.method === 'PATCH') {
        try {
          console.log('Verifying token validity before policy modification...');
          const verifyResponse = await fetch(`${BASE_URL}/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!verifyResponse.ok) {
            console.error(`Token validation failed: ${verifyResponse.status}`);
            if (verifyResponse.status === 401) {
              const error = new Error('Your session has expired. Please log in again.');
              (error as any).status = 401;
              throw error;
            }
          } else {
            console.log('Token is valid, proceeding with policy modification');
          }
        } catch (tokenError) {
          console.error('Error verifying token:', tokenError);
          // Continue and let the main request handle any auth errors
        }
      }
      
      // Log the request body for debugging policy modifications
      if (options.body) {
        try {
          const bodyObj = JSON.parse(options.body as string);
          console.log('Request body (sanitized):', {
            ...bodyObj,
            users: Array.isArray(bodyObj.users) ? `[${bodyObj.users.length} users]` : bodyObj.users
          });
        } catch (e) {
          console.log('Could not parse request body for logging');
        }
      }
      
      const response = await fetch(directEndpoint, {
        ...options,
        headers,
      });
      
      console.log(`Response status for ${endpoint}: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Get more information from the response if possible
        let errorData = null;
        try {
          errorData = await response.json();
          console.error('Error details from API:', errorData);
        } catch (e) {
          console.error('No parseable error details available');
        }
        
        if (response.status === 403) {
          console.error(`Permission error (403): You don't have permission to access this policy`);
          // Try to get the current user info to help diagnose the issue
          try {
            const userInfoStr = localStorage.getItem('user_info');
            if (userInfoStr) {
              const userInfo = JSON.parse(userInfoStr);
              console.log('Current user info:', {
                id: userInfo.id,
                role: userInfo.role?.id || userInfo.role,
                isAdmin: userInfo.admin_access || userInfo.role?.admin_access
              });
            }
          } catch (e) {
            console.error('Could not retrieve user info for error diagnosis');
          }
          
          const error = new Error('You do not have permission to modify this policy');
          (error as any).status = 403;
          (error as any).details = errorData;
          throw error;
        } else if (response.status === 401) {
          console.error(`Authentication error (401): Token expired or invalid`);
          // Clear the token and force re-login
          localStorage.removeItem('auth_token');
          
          const error = new Error('Authentication token expired or invalid');
          (error as any).status = 401;
          (error as any).details = errorData;
          
          // Call the automatic logout function
          handleTokenExpiration();
          
          throw error;
        } else {
          console.error(`API error for ${endpoint}: ${response.status} ${response.statusText}`);
          const error = new Error(`API call failed: ${response.status} ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).details = errorData;
          throw error;
        }
      }
      
      try {
        const data = await response.json();
        
        // Log the structure of the policy data
        if (endpoint.includes('/policies/') && !endpoint.includes('permissions')) {
          console.log('Policy data structure:', {
            hasData: !!data.data,
            dataType: typeof data.data,
            keys: data.data ? Object.keys(data.data) : [],
            hasUsers: data.data && Array.isArray(data.data.users),
            usersCount: data.data && Array.isArray(data.data.users) ? data.data.users.length : 0,
            hasOwners: data.data && Array.isArray(data.data.owners),
            ownersCount: data.data && Array.isArray(data.data.owners) ? data.data.owners.length : 0
          });
        }
        
        return data;
      } catch (jsonError) {
        console.error(`Error parsing response from ${endpoint}:`, jsonError);
        const error = new Error(`Failed to parse response from ${endpoint}`);
        (error as any).status = 500;
        throw error;
      }
    }

    // Check if the endpoint is already a full URL or needs BASE_URL
    const url = endpoint.startsWith('http') ? endpoint : 
                endpoint.startsWith('/api/') ? endpoint : // Local API routes are absolute
                `${BASE_URL}${endpoint}`;
    
    // Add detailed logging for important endpoints
    // if (endpoint.includes('/Complaint')) {
    //   console.log(`Making complaint request to: ${url}`);
    //   console.log(`Request details:`, { 
    //     method: options.method || 'GET',
    //     headers: { ...headers, Authorization: 'Bearer ***' }, // Hide actual token
    //     // body: options.body ? 'Present' : 'None'
    //   });
    // } else if (endpoint.includes('/items/District')) {
    //   console.log(`Making district request to: ${url}`);
    // } else {
    //   console.log(`Making request to: ${url}`);
    // }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`Response status for ${endpoint}: ${response.status} ${response.statusText}`);
    
    // Special handling for complaint endpoint to help diagnose issues
    if (endpoint.includes('/Complaint') && response.status === 200) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        
        if (endpoint === '/items/Complaint' || endpoint.includes('?filter')) {
          // For listing endpoints
          console.log(`Complaint listing response contains ${data.data?.length || 0} items`);
          
          if (data.data?.length === 0) {
            console.warn('Empty data array returned for complaints - this might indicate filtering issues');
          } else if (data.data?.length > 0) {
            console.log('First item type:', typeof data.data[0]);
            if (typeof data.data[0] === 'number' || typeof data.data[0] === 'string') {
              console.log('API returned array of IDs instead of objects. First few IDs:', data.data.slice(0, 5));
            } else {
              console.log('First item sample:', JSON.stringify(data.data[0]).substring(0, 200) + '...');
            }
          }
        } else if (endpoint.includes('/Complaint/')) {
          // For single complaint endpoint
          console.log('Single complaint data type:', typeof data.data);
          console.log('Single complaint data preview:', JSON.stringify(data.data).substring(0, 200) + '...');
        }
      } catch (e) {
        console.error('Error parsing complaint response preview:', e);
      }
    }
    
    // Special handling for district endpoint
    if (endpoint.includes('/items/District') && response.status === 200) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        
        if (data.data) {
          if (Array.isArray(data.data)) {
            console.log(`District response contains ${data.data.length} items`);
            if (data.data.length > 0) {
              console.log('First district sample:', JSON.stringify(data.data[0]).substring(0, 200) + '...');
              console.log('First district ID type:', typeof data.data[0]?.id);
              console.log('First district name:', data.data[0]?.name);
            }
          } else {
            // Single district
            console.log('Single district data preview:', JSON.stringify(data.data).substring(0, 200) + '...');
          }
        }
      } catch (e) {
        console.error('Error parsing district response preview:', e);
      }
    }

      if (endpoint.includes('/items/Complaint_sub_category')) {
    const directEndpoint = `${BASE_URL}${endpoint}`;
    console.log(`Fetching complaint subcategory data from: ${directEndpoint}`);

    const response = await fetch(directEndpoint, {
      ...options,
      headers,
    });

    return await response.json();
  }

  if (endpoint.includes('/files/')) {
    const directEndpoint = `${BASE_URL}${endpoint}`;
    console.log(`Fetching file data from: ${directEndpoint}`);

    const response = await fetch(directEndpoint, {
      ...options,
      headers,
    });
    return await response.json();
  }
    // Special handling for 401/403 errors - but don't throw if coming from our proxy endpoints
    if ((response.status === 401 || response.status === 403) && !endpoint.startsWith('/api/')) {
      // Authentication failed - token might be expired
      console.error(`Authentication error (${response.status}): Token may be expired or invalid`);
      
      // For 401 errors, trigger automatic logout
      if (response.status === 401) {
        handleTokenExpiration();
      }
      
      throw new Error(`Authentication failed - Status: ${response.status}`);
    }

    if (!response.ok && !endpoint.startsWith('/api/')) {
      // Try to get more details from the response
      let errorData;
      try {
        errorData = await response.json();
        console.error('API Error details:', errorData);
      } catch (e) {
        // Ignore JSON parsing error
      }
      
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    // Try to parse JSON response
    try {
      const jsonResponse = await response.json();
      
      // Special logging for important endpoints
      if (endpoint.includes('/Complaint')) {
        console.log(`Successfully received complaint data with ${jsonResponse.data?.length || 0} complaints`);
      }
      
      return jsonResponse;
    } catch (error) {
      console.error(`Error parsing JSON from ${endpoint}:`, error);
      throw new Error(`Failed to parse response from ${endpoint}`);
    }
  } catch (error) {
    console.error(`Error in fetchWithAuth for ${endpoint}:`, error);
    throw error;
 
  }
  
}

/**
 * A safer version of fetchWithAuth that doesn't throw exceptions
 * Returns null if the request fails, otherwise returns the parsed JSON
 */
export async function fetchWithAuthSafe(endpoint: string, options: RequestInit = {}) {
  try {
    return await fetchWithAuth(endpoint, options);
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * Check if a user is authenticated
 * Returns true if there's an auth token in localStorage and it's valid
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return false;
  }
  
  try {
    // Try to fetch the current user to check if the token is valid
    const response = await fetchWithAuthSafe('/users/me');
    return !!response?.data;
  } catch (error) {
    return false;
  }
}

/**
 * Fetches the current user's information including role details
 * Returns the user data or null if there was an error
 */
export async function fetchCurrentUser() {
  try {
    // Use the specific endpoint that includes role information
    const userData = await fetchWithAuthSafe('/users/me');
    
    if (userData && userData.data) {
      // Store the user info in localStorage for future use
      localStorage.setItem('user_info', JSON.stringify(userData.data));
      return userData.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
} 