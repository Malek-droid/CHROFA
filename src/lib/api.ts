// API client helper for communication with the Express backend

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

let isRefreshing = false;

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Array<{ field: string; message: string }>;
  };
};

/**
 * Refresh the access token using the refresh token cookie
 */
async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) {
    return false;
  }

  // Don't redirect on public routes
  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/search', '/book'];
  const isPublicRoute = publicRoutes.some(route => window.location.pathname.startsWith(route));

  isRefreshing = true;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return true;
    } else {
      // Refresh failed, check if it's a rate limit error
      let data;
      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }
      const errorCode = data?.error?.code;
      
      // Don't redirect on rate limit errors - just return false
      if (errorCode === 'AUTH_RATE_LIMIT_EXCEEDED' || errorCode === 'RATE_LIMIT_EXCEEDED') {
        console.warn("[API] Token refresh rate limited, will retry later");
        return false;
      }
      
      // Only redirect on actual auth failures and not on public routes
      if (!isPublicRoute) {
        window.location.href = "/login";
      }
      return false;
    }
  } catch (error) {
    console.error("[API] Token refresh failed:", error);
    // Don't redirect on network errors or public routes
    return false;
  } finally {
    isRefreshing = false;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  // Ensure we include credentials (cookies) for all requests
  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    let data;
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }

    // Handle 401 - attempt token refresh
    if (response.status === 401 && !isRefreshing) {
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess) {
        // Retry the original request after successful refresh
        const retryResponse = await fetch(url, config);
        const retryData = await retryResponse.json();

        if (!retryResponse.ok) {
          const errorMessage = retryData?.error?.message || retryResponse.statusText || "Request failed";
          const errorCode = retryData?.error?.code || "REQUEST_FAILED";
          const error = new Error(errorMessage) as any;
          error.status = retryResponse.status;
          error.code = errorCode;
          error.details = retryData?.error?.details;
          throw error;
        }

        return retryData;
      } else {
        // Refresh failed, already redirected to login
        throw new Error("Authentication failed");
      }
    }

    if (!response.ok) {
      const errorMessage = data?.error?.message || response.statusText || "Request failed";
      const errorCode = data?.error?.code || "REQUEST_FAILED";
      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.code = errorCode;
      error.details = data?.error?.details;
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error(`[API Fetch Error] ${endpoint}:`, error);
    throw error;
  }
}
