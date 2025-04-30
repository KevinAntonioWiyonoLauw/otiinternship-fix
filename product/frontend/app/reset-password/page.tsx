'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import Logo from '@/components/atoms/Logo';
import Link from 'next/link';
import { showToast } from '@/components/ui/custom-toast';
import { ArrowLeft } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState('');

  // Validate token existence on page load
  useEffect(() => {
    if (!token) {
      showToast({
        title: "Invalid Request",
        description: "The reset link is invalid or has expired.",
        variant: "error"
      });
      // Redirect to forgot password after a short delay
      setTimeout(() => router.push('/forgot-password'), 2000);
    }
  }, [token, router]);

  const validatePasswords = () => {
    if (!newPassword) {
      setError('New password is required');
      return false;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePasswords()) return;

    try {
      setIsLoading(true);
      // Use the frontend API route instead of directly calling the backend
      const response = await fetch('/api/auth/complete-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setResetComplete(true);
      showToast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now log in with your new password.",
        variant: "success"
      });
    } catch (err: any) {
      console.error('Failed to reset password:', err);
      setError(err.message || 'Failed to reset password. The link may be invalid or has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto" />
          {!resetComplete ? (
            <>
              <h2 className="mt-6 text-3xl font-bold text-white">Reset Password</h2>
              <p className="mt-2 text-gray-400">
                Enter your new password below
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-3xl font-bold text-white">Password Updated!</h2>
              <p className="mt-2 text-gray-400">
                Your password has been successfully reset.
              </p>
            </>
          )}
        </div>

        {!resetComplete ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500 text-red-500 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="newPassword" className="block text-white">New Password</label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-400">
                Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-white">Confirm Password</label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
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
              Go to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;