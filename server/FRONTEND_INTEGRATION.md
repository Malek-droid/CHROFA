# Frontend Integration Guide

This document outlines the changes needed for the frontend to integrate with the new secure backend.

## Authentication Changes

### Cookie-Based Auth (No localStorage)

The backend now uses httpOnly cookies for authentication. The frontend no longer needs to manually store or send tokens.

#### Old Approach (localStorage)
```javascript
// Login
const response = await fetch('/api/auth/login', { ... });
const { token } = await response.json();
localStorage.setItem('token', token);

// Subsequent requests
const response = await fetch('/api/appointments', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

#### New Approach (httpOnly Cookies)
```javascript
// Login - cookies are set automatically by the backend
await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // Required for cookies
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});

// Subsequent requests - cookies sent automatically
await fetch('/api/appointments', {
  credentials: 'include', // Required for cookies
});
```

### Important: credentials: 'include'

All API calls must include `credentials: 'include'` to send/receive httpOnly cookies.

### Token Refresh

The backend now supports automatic token refresh via the `/api/auth/refresh` endpoint. The frontend should implement a refresh mechanism:

```javascript
let isRefreshing = false;

async function fetchWithRefresh(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    if (response.status === 401 && !isRefreshing) {
      isRefreshing = true;
      try {
        // Attempt to refresh token
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          // Retry original request
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        } else {
          // Refresh failed, redirect to login
          window.location.href = '/login';
          return null;
        }
      } finally {
        isRefreshing = false;
      }
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}
```

## API Endpoint Changes

### Authentication Endpoints

#### Register
```javascript
POST /api/auth/register
Content-Type: application/json
credentials: include

Body: {
  name: string,
  email: string,
  password: string
}

Response: {
  success: true,
  user: {
    id: string,
    name: string,
    email: string,
    role: string,
    businessId: string | null
  }
}
```

#### Login
```javascript
POST /api/auth/login
Content-Type: application/json
credentials: include

Body: {
  email: string,
  password: string
}

Response: {
  success: true,
  user: {
    id: string,
    name: string,
    email: string,
    role: string,
    businessId: string | null
  }
}
```

#### Logout
```javascript
POST /api/auth/logout
credentials: include

Response: {
  success: true,
  message: string
}
```

#### Get Current User
```javascript
GET /api/auth/me
credentials: include

Response: {
  success: true,
  user: {
    id: string,
    name: string,
    email: string,
    role: string,
    businessId: string | null
  }
}
```

#### Forgot Password
```javascript
POST /api/auth/forgot-password
Content-Type: application/json

Body: {
  email: string
}

Response: {
  success: true,
  message: string
}
```

#### Reset Password
```javascript
POST /api/auth/reset-password
Content-Type: application/json

Body: {
  token: string,
  password: string
}

Response: {
  success: true,
  message: string
}
```

### Appointment Endpoints

#### Create Appointment
```javascript
POST /api/appointments
Content-Type: application/json
credentials: include

Body: {
  customerName: string,
  customerEmail: string,
  customerPhone?: string,
  service: string,
  date: string (ISO-8601),
  staffName?: string,
  notes?: string
}

Response: {
  success: true,
  appointment: {
    id: string,
    customer: string,
    customerEmail: string,
    customerPhone: string | null,
    customerId: string,
    service: string,
    durationMinutes: number,
    date: string (ISO-8601),
    status: 'pending' | 'confirmed' | 'cancelled',
    staffName: string | null,
    notes: string | null,
    riskScore: number | null,
    createdAt: string,
    updatedAt: string
  }
}
```

#### List Appointments
```javascript
GET /api/appointments?status=pending&from=2024-01-01&to=2024-12-31
credentials: include

Response: {
  success: true,
  appointments: Appointment[]
}
```

#### Update Appointment
```javascript
PUT /api/appointments/:id
Content-Type: application/json
credentials: include

Body: {
  status?: 'pending' | 'confirmed' | 'cancelled',
  staffName?: string,
  notes?: string,
  date?: string (ISO-8601)
}

Response: {
  success: true,
  appointment: Appointment
}
```

#### Cancel Appointment
```javascript
DELETE /api/appointments/:id
credentials: include

Response: {
  success: true,
  appointment: Appointment
}
```

### Business Endpoints

#### Create Business
```javascript
POST /api/business
Content-Type: application/json
credentials: include

Body: {
  name: string,
  industry: 'salon_spa' | 'clinic_medical' | 'legal_consulting' | 'other',
  services: Array<{
    name: string,
    durationMinutes: number,
    price?: number | null
  }>,
  staff: Array<{
    name: string
  }>,
  openingHours: Array<{
    day: number (0-6),
    isOpen: boolean,
    openTime?: string (HH:mm) | null,
    closeTime?: string (HH:mm) | null
  }>,
  timezone: string (IANA format)
}

Response: {
  success: true,
  business: Business,
  user: User
}
```

#### Get My Business
```javascript
GET /api/business/me
credentials: include

Response: {
  success: true,
  business: Business
}
```

## Error Handling

All errors now follow a consistent structure:

```javascript
try {
  const response = await fetch('/api/appointments', {
    credentials: 'include',
  });
  const data = await response.json();
  
  if (!data.success) {
    // Handle error
    console.error('Error:', data.error.message);
    console.error('Code:', data.error.code);
    
    // Validation errors have details
    if (data.error.details) {
      data.error.details.forEach(err => {
        console.error(`${err.field}: ${err.message}`);
      });
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## React Context Updates

Update your auth context to use the new cookie-based approach:

```javascript
// src/lib/auth-context.tsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/auth/me', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
      })
      .catch(err => console.error('Auth check failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    
    if (data.success) {
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

## API Client Helper

Create a helper function for API calls:

```javascript
// src/lib/api.ts
const API_BASE = 'http://localhost:5000/api';

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }
    
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}
```

## Migration Checklist

- [ ] Update all API calls to include `credentials: 'include'`
- [ ] Remove localStorage token storage
- [ ] Remove Authorization headers from API calls
- [ ] Update auth context to use cookie-based auth
- [ ] Implement token refresh mechanism
- [ ] Update error handling for new error structure
- [ ] Add password reset flow UI
- [ ] Test all authentication flows
- [ ] Test appointment CRUD operations
- [ ] Test business creation/update

## Environment Variables

Update your frontend `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Update API client to use this variable:

```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
```

## CORS Configuration

Ensure your backend `ALLOWED_ORIGINS` includes your frontend URL:

```env
# Development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Testing

Test the following flows:

1. **Registration**
   - Register new user
   - Verify cookies are set
   - Verify user is logged in

2. **Login**
   - Login with valid credentials
   - Verify cookies are set
   - Verify user data is returned

3. **Token Refresh**
   - Wait for access token to expire (15 minutes)
   - Make an API call
   - Verify token is refreshed automatically

4. **Logout**
   - Logout
   - Verify cookies are cleared
   - Verify user is redirected

5. **Password Reset**
   - Request password reset
   - Verify email is sent (check logs)
   - Reset password with token
   - Login with new password

6. **Appointments**
   - Create appointment
   - List appointments
   - Update appointment
   - Cancel appointment

7. **Business**
   - Create business
   - Get business details
   - Update business settings
