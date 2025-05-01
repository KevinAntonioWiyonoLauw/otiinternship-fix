'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/atoms/Logo';
import LoginForm from '@/components/molecules/LoginForm';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { showToast } from '@/components/ui/custom-toast';
import { isAuthenticated } from '../lib/auth';
import type { AuthResponse } from '../types/api';

// Loading component to display while the suspense is resolving
const LoginLoading = () => (
  <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
    <div className="text-center">
      <Logo className="mx-auto" />
      <p className="text-white mt-4">Loading...</p>
    </div>
  </div>
);

// Component that uses useSearchParams, wrapped in Suspense
const LoginContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string>('');

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  // Show welcome back message if redirected from logout
  useEffect(() => {
    const loggedOut = searchParams.get('logged_out');
    if (loggedOut === 'true') {
      showToast({
        title: "Logged Out Successfully",
        description: "You have been successfully logged out. See you again!",
        variant: "success"
      });
    }
  }, [searchParams]);

  const handleLogin = async (email: string, password: string) => {
    setServerError(''); // Clear any previous errors
    try {
      setIsLoading(true);
      
      const response = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });

      if (response.data && response.data.token && response.data.refreshToken && response.data.user) {
        // Store auth data using context
        await login(response.data);
        
        showToast({
          title: "Welcome Back!",
          description: `Logged in as ${response.data.user.namaLengkap}`,
          variant: "success"
        });

        // Get the redirect URL from query params or default to dashboard
        const from = searchParams.get('from') || '/dashboard';
        router.replace(from);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle different types of errors
      if (error.response?.status === 401) {
        setServerError('Email atau password salah. Silakan coba lagi.');
      } else if (error.response?.status === 429) {
        setServerError('Terlalu banyak percobaan. Mohon tunggu sebentar sebelum mencoba lagi.');
      } else if (!navigator.onLine) {
        setServerError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      } else {
        setServerError(error.response?.data?.message || 'Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto" />
          <h2 className="mt-6 text-3xl font-bold text-white">
            Welcome to OmahTI!
          </h2>
        </div>
        <LoginForm 
          onSubmit={handleLogin} 
          isLoading={isLoading}
          serverError={serverError}
        />
      </div>
    </div>
  );
};

// Main component that renders the content with suspense
const LoginPage: React.FC = () => {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;