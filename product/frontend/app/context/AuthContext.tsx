'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAuthData, clearAuthData, getAuthToken, getRefreshToken, getUser } from '../lib/auth';
import { User } from '../types/api';
import { useRouter, usePathname } from 'next/navigation'; // Import usePathname
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: { token: string; refreshToken: string; user: User }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string, divisionName?: string) => boolean;
  isKadivHD: () => boolean;
  checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthData();
      setUser(null);
      setLoading(false);
      router.push('/login?logged_out=true');
    }
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    try {
      const token = getAuthToken();
      const refreshToken = getRefreshToken();
      const currentUser = getUser();

      if (!token || !refreshToken || !currentUser) {
        console.log('Missing auth data');
        clearAuthData();
        setUser(null);
        setLoading(false);
        // Only redirect if not on a public route
        if (!isPublicRoute) {
          console.log('Redirecting to login from checkAuthStatus (missing data)');
          router.push('/login');
        }
        return false;
      }

      // First try to validate current token
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            setLoading(false); // <-- Add this line
            return true;
          }
        }

        // If token is invalid and we're not already refreshing, try to refresh
        if (!isRefreshing) {
          setIsRefreshing(true);
          try {
            console.log('Attempting to refresh token...');
            const refreshResponse = await fetch(`${API_URL}/api/auth/refresh-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.status === 429) {
              console.log('Rate limit hit during token refresh');
              setLoading(false); // <-- Add this line
              return false;
            }

            const data = await refreshResponse.json();
            if (data.success) {
              console.log('Token refreshed successfully');
              const newToken = data.token;
              const newRefreshToken = data.refreshToken || refreshToken;

              // Fetch fresh user data with the new token
              try {
                const meResponse = await fetch(`${API_URL}/api/auth/me`, {
                  headers: {
                    'Authorization': `Bearer ${newToken}`
                  }
                });
                if (meResponse.ok) {
                  const meData = await meResponse.json();
                  if (meData.success && meData.user) {
                    // Update auth data with new tokens AND fresh user data
                    setAuthData({
                      token: newToken,
                      refreshToken: newRefreshToken,
                      user: meData.user
                    });
                    setUser(meData.user); // Use fresh user data
                    setLoading(false);
                    setIsRefreshing(false); // Added: Reset refresh flag on success
                    return true;
                  }
                }
                // If fetching /me failed after refresh, logout
                throw new Error('Failed to fetch user data after token refresh');
              } catch (meError) {
                console.error('Failed to fetch /me after refresh:', meError);
                // Proceed to logout if /me fails - handled in finally
              }
            } else {
              throw new Error(data.message || 'Token refresh failed');
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Logout sequence moved to finally block or handled after catch
          } finally {
            // Ensure logout happens if refresh fails or subsequent /me fails
            const currentUserAfterAttempt = getUser(); // Re-check user state
            // If user wasn't successfully updated/set during the try block, logout
            if (!currentUserAfterAttempt || currentUserAfterAttempt.id !== currentUser.id) { 
              clearAuthData();
              setUser(null);
              setLoading(false);
              if (!isPublicRoute) {
                console.log('Redirecting to login from checkAuthStatus (refresh/me failed)');
                router.push('/login');
              }
            }
            setIsRefreshing(false); // Ensure refresh flag is reset
            // Return true only if user is successfully set/updated
            return !!getUser(); 
          }
        } else {
          // If already refreshing, just wait
          // setLoading(false); // Don't set loading false here, let the ongoing refresh handle it
          return false; // Indicate auth is still pending
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearAuthData();
        setUser(null);
        setLoading(false);
        // Only redirect if not on a public route
        if (!isPublicRoute) {
          console.log('Redirecting to login from checkAuthStatus (auth check failed)');
          router.push('/login');
        }
        return false;
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      clearAuthData();
      setUser(null);
      setLoading(false);
      // Only redirect if not on a public route
      if (!isPublicRoute) {
        console.log('Redirecting to login from checkAuthStatus (outer catch)');
        router.push('/login');
      }
      return false;
    }
    // If we reach here, it implies an unhandled case or successful validation
    // where loading wasn't set to false yet.
    setLoading(false); // <-- Add a final fallback
    // Only redirect if not on a public route and user is still null
    if (!isPublicRoute && !getUser()) {
        console.log('Redirecting to login from checkAuthStatus (final fallback)');
        // router.push('/login'); // Avoid redirecting here unless certain
    }
    // Return true if user is set, false otherwise
    return !!getUser();
  };

  useEffect(() => {
    const savedUser = getUser();
    if (savedUser) {
      setUser(savedUser);
    }
    // No need to setLoading(false) here, checkAuthStatus handles it
    checkAuthStatus(); 
  }, [pathname]); // Re-run check on pathname change

  const login = async (data: { token: string; refreshToken: string; user: User }): Promise<void> => {
    try {
      if (!data.token || !data.refreshToken || !data.user) {
        throw new Error('Invalid login response: missing token, refresh token, or user data');
      }

      setAuthData({
        token: data.token,
        refreshToken: data.refreshToken,
        user: data.user
      });
      
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      if (response.ok) {
        const meData = await response.json();
        if (meData.success && meData.user) {
          setAuthData({
            token: data.token,
            refreshToken: data.refreshToken,
            user: meData.user
          });
          setUser(meData.user);
        } else {
          setUser(data.user);
        }
      } else {
        setUser(data.user);
      }
      
      setLoading(false);
    } catch (error: any) {
      clearAuthData();
      setUser(null);
      setLoading(false);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      await handleLogout();
    }
  };

  const hasRole = (role: string, divisionName?: string) => {
    if (!user || !user.roles) return false;
    // Add explicit type for parameter 'r'
    return user.roles.some((r: { role: string; division: { name: string } }) => 
      r.role === role && (!divisionName || r.division.name === divisionName)
    );
  };

  const isKadivHD = () => hasRole('KADIV', 'HD');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, isKadivHD, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}