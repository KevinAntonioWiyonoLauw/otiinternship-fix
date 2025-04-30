import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_RETRY_ATTEMPTS = 1; // Limit retries to prevent infinite loops

export const useAuthenticatedApi = () => {
  const { checkAuthStatus } = useAuth();

  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ) => {
    // Don't retry more than the maximum attempts
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached for ${url}`);
      // Throw an error or return a specific object to indicate failure due to retries
      throw new Error(`Maximum retry attempts reached for ${url}`);
    }

    // Get current token (might be stale, but we handle 401 later)
    const token = getAuthToken();
    // If no token exists at all, we probably can't authenticate
    if (!token && !url.includes('/api/auth/')) { // Allow auth calls even without initial token
       console.warn('No auth token found for authenticated request:', url);
       // Optionally trigger logout or redirect here if needed
       // For now, let the request proceed and likely fail with 401 if auth is required
    }

    // Add authorization header (if token exists)
    // Fix: Explicitly type headers as Record<string, string>
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Spread existing headers from options if they exist, casting to Record
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Ensure the URL is absolute
    const absoluteUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

    try {
      const response = await fetch(absoluteUrl, {
        ...options,
        headers, // Pass the correctly typed headers object
      });

      // If unauthorized (401) and haven't retried yet, try refreshing token and retry
      if (response.status === 401 && retryCount < MAX_RETRY_ATTEMPTS) { // Use < MAX_RETRY_ATTEMPTS
        console.log(`Request to ${url} failed with 401. Refreshing token (attempt ${retryCount + 1})...`);
        // Call checkAuthStatus to refresh token once
        const refreshSuccess = await checkAuthStatus(); // This handles the refresh logic

        if (!refreshSuccess) {
          console.error('Token refresh failed during 401 handling.');
          // Throw error or handle logout appropriately
          throw new Error('Authentication failed: Unable to refresh token.');
        }

        // Token should be refreshed now, retry the original request
        console.log(`Token refreshed. Retrying request to ${url}...`);
        // Pass incremented retryCount
        return authenticatedFetch(url, options, retryCount + 1);
      }

      if (!response.ok) {
        // Handle other non-OK responses (like 429)
        const errorBody = await response.text(); // Try to get error body
        console.error(`HTTP error! Status: ${response.status} for ${url}. Body: ${errorBody}`);
        // Create a more informative error
        const error = new Error(`HTTP error! status: ${response.status}`);
        (error as any).status = response.status; // Attach status code
        try {
           (error as any).body = JSON.parse(errorBody); // Attach parsed body if JSON
        } catch {
           (error as any).body = errorBody; // Attach raw body otherwise
        }
        throw error;
      }

      // Handle successful response (check for empty body)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
         // Check if body is empty before parsing JSON
         const responseText = await response.text();
         if (responseText) {
           return JSON.parse(responseText);
         } else {
           return null; // Or return an empty object/array based on expected response
         }
      } else {
        // Return text or null for non-JSON responses
        // Read the text body first before returning
        const responseText = await response.text(); 
        return responseText; // Or return null if text is not expected
      }

    } catch (error) {
      // Log the error with more context
      console.error(`API call failed for ${url}:`, error);
      // Re-throw the error so the calling component can handle it
      throw error;
    }
  };

  return { authenticatedFetch };
};