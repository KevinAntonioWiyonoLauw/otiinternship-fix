import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define route types
const AUTH_ROUTES = ['/login', '/forgot-password'];
const ADMIN_ROUTES = ['/admin'];
const PROTECTED_ROUTES = ['/dashboard', '/schedule', '/presence', '/progress', '/aspirasi', '/change-password'];
const PUBLIC_ROUTES = ['/'];
const BYPASS_AUTH_ROUTES = ['/reset-password']; // Routes that completely bypass auth checks

// Function to verify JWT token
async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// Function to refresh token
async function refreshToken(refreshToken: string) {
  try {
    console.log('Attempting to refresh token...');
    
    if (!refreshToken) {
      console.error('No refresh token provided');
      return null;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    console.log('Refresh token response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Refresh token failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return null;
    }

    const data = await response.json();
    console.log('Refresh token response:', data);
    
    if (!data.success) {
      console.error('Token refresh failed:', data.message);
      return null;
    }

    // Set the new token in cookies
    const responseWithCookie = NextResponse.next();
    responseWithCookie.cookies.set('auth_token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600 // 1 hour
    });

    // Also update refresh token if provided
    if (data.refreshToken) {
      responseWithCookie.cookies.set('refresh_token', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 3600 // 7 days
      });
    }

    return {
      token: data.token,
      refreshToken: data.refreshToken,
      expiresIn: 3600,
      response: responseWithCookie
    };
  } catch (error) {
    console.error('Token refresh failed with error:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Explicitly handle reset-password route
  if (pathname === '/reset-password' || pathname.startsWith('/reset-password')) {
    console.log('Allowing reset-password access:', pathname);
    return NextResponse.next();
  }
  
  // Simple function to check if path starts with any of the routes
  const matchesPath = (paths: string[]) => paths.some(path => pathname.startsWith(path));
  
  // Static assets are always allowed
  if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    return NextResponse.next();
  }
  
  const token = request.cookies.get('auth_token')?.value;
  const refreshTokenValue = request.cookies.get('refresh_token')?.value;

  // Handle protected routes
  if (matchesPath(PROTECTED_ROUTES) || matchesPath(ADMIN_ROUTES)) {
    // First try to verify the current token
    if (token) {
      const isValid = await verifyToken(token);
      if (isValid) {
        return NextResponse.next();
      }
    }

    // If token is invalid or doesn't exist, try to refresh
    if (refreshTokenValue) {
      const refreshResult = await refreshToken(refreshTokenValue);
      if (refreshResult) {
        // If refresh is successful, continue to the requested page
        return refreshResult.response;
      }
    }

    // If both token and refresh fail, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  // Handle auth routes (login, register, etc.)
  if (matchesPath(AUTH_ROUTES)) {
    // If user is already authenticated, redirect to dashboard
    if (token) {
      const isValid = await verifyToken(token);
      if (isValid) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Try to refresh token if available
    if (refreshTokenValue) {
      const refreshResult = await refreshToken(refreshTokenValue);
      if (refreshResult) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  }

  // Handle public routes
  if (matchesPath(PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // For any other routes, redirect to login if not authenticated
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure middleware matcher
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};