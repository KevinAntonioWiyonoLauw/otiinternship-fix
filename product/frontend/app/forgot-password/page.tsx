'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import Logo from '@/components/atoms/Logo';
import Link from 'next/link';
import { showToast } from '@/components/ui/custom-toast';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/api/auth/reset-password', { email });
      setEmailSent(true);
      showToast({
        title: "Reset Email Sent",
        description: "If your email is registered, you will receive reset instructions shortly.",
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to send reset email:', err);
      // We don't show specific errors for security reasons
      showToast({
        title: "Request Submitted",
        description: "If your email is registered, you will receive reset instructions shortly.",
        variant: "success"
      });
      // Still set emailSent to true for UX even if there was an error
      setEmailSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto" />
          {!emailSent ? (
            <>
              <h2 className="mt-6 text-3xl font-bold text-white">Forgot Password</h2>
              <p className="mt-2 text-gray-400">
                Enter your email and we'll send you a link to reset your password
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-3xl font-bold text-white">Email Sent!</h2>
              <p className="mt-2 text-gray-400">
                Check your email for a link to reset your password. The link will expire in 24 hours.
              </p>
            </>
          )}
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500 text-red-500 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-white">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                error={error}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <div className="mt-4 text-center">
              <Link href="/login" className="text-primary-500 hover:text-primary-600 text-sm flex items-center justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <Button onClick={() => router.push('/login')} className="mt-4">
              Return to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;