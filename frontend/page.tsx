'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from './app/components/atoms/Logo';
import LoginForm from './app/components/molecules/LoginForm';
import { useAuth } from './app/context/AuthContext';
import { toast } from './app/hooks/use-toast';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await login(email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Background image */}
      <div className="hidden bg-dark-900 lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-8 rounded-[30px] overflow-hidden"
          style={{
            backgroundImage: 'url(/images/bg-login.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(2.5)'
          }}
        >
          <div className="absolute inset-0 bg-black/50" /> {/* Overlay untuk meningkatkan kontras */}
          <div className="absolute bottom-8 left-8 z-10">
            <Logo className="text-6xl mb-2" />
            <p className="text-white text-xl">Internship</p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 bg-dark-900 p-8 sm:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Welcome to OmahTI!</h1>
          <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 