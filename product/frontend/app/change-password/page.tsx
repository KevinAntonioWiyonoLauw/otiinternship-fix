'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import Logo from '@/components/atoms/Logo';
import Link from 'next/link';
import { showToast } from '@/components/ui/custom-toast';
import api from '@/lib/api';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAuthenticated } from '@/lib/auth';

const ChangePasswordPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [changeComplete, setChangeComplete] = useState(false);
  const [error, setError] = useState('');

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated()) {
      showToast({
        title: "Authentication Required",
        description: "You need to be logged in to change your password.",
        variant: "error"
      });
      router.push('/login');
    }
  }, [router]);

  const validatePasswords = () => {
    if (!currentPassword) {
      setError('Current password is required');
      return false;
    }

    if (!newPassword) {
      setError('New password is required');
      return false;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
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

    if (currentPassword === newPassword) {
      setError('New password cannot be the same as your current password');
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
      const response = await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      if (response.status === 200) {
        setChangeComplete(true);
        showToast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
          variant: "success"
        });
      }
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
      
      // Handle specific errors from backend
      if (err.response?.status === 401) {
        setError('Current password is incorrect');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto" />
          {!changeComplete ? (
            <>
              <h2 className="mt-6 text-3xl font-bold text-white">Change Password</h2>
              <p className="mt-2 text-gray-400">
                Update your password to keep your account secure
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-3xl font-bold text-white">Password Updated!</h2>
              <p className="mt-2 text-gray-400">
                Your password has been successfully changed.
              </p>
              <div className="mt-4 flex justify-center">
                <div className="rounded-full bg-green-500/20 p-3">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </>
          )}
        </div>

        {!changeComplete ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500 text-red-500 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="block text-white">Current Password</label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
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
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
            <div className="mt-4 text-center">
              <Link href="/dashboard" className="text-primary-500 hover:text-primary-600 text-sm flex items-center justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Return to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordPage;