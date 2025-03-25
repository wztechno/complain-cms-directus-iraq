const BASE_URL = 'https://complaint.top-wp.com';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.warn('No auth token found in localStorage - authentication will fail');
  } else {
    console.log(`Using auth token: ${token.substring(0, 10)}...`);
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  console.log(`Fetching ${endpoint} with method ${options.method || 'GET'}`);
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  console.log(`Response status: ${response.status} ${response.statusText}`);
  
  if (response.status === 401) {
    // Handle unauthorized error - could redirect to login or refresh token
    console.error('Authentication failed (401 Unauthorized)');
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    // Try to get more details from the response
    let errorDetails = '';
    try {
      const errorData = await response.json();
      errorDetails = JSON.stringify(errorData);
    } catch (e) {
      // Ignore JSON parsing error
    }
    
    const error = new Error(`API call failed: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
    console.error('API Error:', error);
    throw error;
  }

  return response.json();
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
    const userData = await fetchWithAuthSafe('/users/me?fields[]=*&fields[]=role.id');
    
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