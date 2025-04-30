'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { KadivAspirasiView } from '../../components/aspirasi/KadivAspirasiView';
import Aurora from '../../components/effects/Aurora';
import { useAuth } from '../../context/AuthContext';
import { getUser } from '../../lib/auth';

export default function KadivAspirasiPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // More efficient authentication check on initial load
  useEffect(() => {
    // First check if we have user data in localStorage
    const localUser = getUser();
    
    if (localUser) {
      // Check if user has KADIV role
      const isKadiv = localUser.roles?.some(r => r.role === 'KADIV');
      
      if (isKadiv) {
        setAuthorized(true);
      } else {
        console.log('User is not KADIV, redirecting to aspirasi');
        setAuthorized(false);
        router.replace('/aspirasi');
      }
    } else if (!authLoading) {
      console.log('No user found in localStorage, redirecting to login');
      setAuthorized(false);
      router.replace('/login');
    }
  }, [authLoading, router]);

  // Secondary check with the context-based auth
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      console.log('No user in context, redirecting to login');
      router.replace('/login');
      return;
    }

    // Check if user has KADIV role using the hasRole function from context
    const isKadiv = user.roles?.some(r => r.role === 'KADIV');
    
    if (!isKadiv) {
      console.log('User is not KADIV, redirecting to aspirasi');
      router.replace('/aspirasi');
    } else {
      setAuthorized(true);
    }
  }, [authLoading, user, router]);

  // Show loading state while checking auth
  if (authLoading || authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white text-lg">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading user data...</span>
      </div>
    );
  }

  // Don't render content if not authorized
  if (!authorized) {
    return null;
  }

  // Render the admin aspirasi dashboard
  return (
    <div className="relative min-h-screen mt-12">
      <div className="fixed inset-0 z-0">
        <Aurora
          colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
          blend={0.3}
          amplitude={1.0}
          speed={0.2}
        />
      </div>

      <div className="container py-6 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Aspirasi Dashboard</h1>
          <p className="text-gray-400">
            Manage and review all user submitted aspirations
          </p>
        </div>

        <KadivAspirasiView />
      </div>
    </div>
  );
}