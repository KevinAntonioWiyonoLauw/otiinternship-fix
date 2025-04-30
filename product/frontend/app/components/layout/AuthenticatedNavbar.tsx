"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { ChevronDown, LogOut, Menu, Key, LayoutDashboard, Home } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import LoadingOverlay from '../molecules/LoadingOverlay';
import { showToast } from '@/components/ui/custom-toast';
import { useLoading } from '../../context/LoadingContext';

interface AuthenticatedNavbarProps {
  onMenuClick: () => void;
  hideMenuOnDesktop?: boolean;
}

export const AuthenticatedNavbar = ({ onMenuClick, hideMenuOnDesktop = false }: AuthenticatedNavbarProps) => {
  const { user, logout, hasRole } = useAuth();
  const router = useRouter();
  const { setLoading, setLoadingMessage } = useLoading();

  const handleLogout = async () => {
    try {
      setLoadingMessage('Logging out...');
      setLoading(true);
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout failed:', error);
      showToast({
        title: 'Logout Error',
        description: 'Failed to logout. Please try again.',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get first name for shorter display
  const firstName = user?.namaLengkap?.split(' ')[0] || 'Guest';
  // Get initials for avatar (up to 2 characters)
  const initials = user?.namaLengkap
    ?.split(' ')
    .map(name => name[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'G';

  return (
    <div className="fixed top-0 right-0 left-0 z-50 px-4 py-3 bg-dark-800">
      <nav className="mx-auto flex items-center md:mr-10 justify-between">
        <div className="flex items-center gap-4 ">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className={hideMenuOnDesktop ? 'ml-2 p-2 text-white hover:text-primary-500 transition-colors block md:hidden' : 'ml-2 p-2 text-white hover:text-primary-500 transition-colors'}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Links - Hidden on Mobile */}
        <div className="hidden md:flex items-center space-x-6">

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 group">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 transition-all group-hover:scale-105 group-hover:border-primary-400">
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
                    {initials}
                  </div>
                </div>
                <div className="hidden md:block text-left mr-2">
                  <p className="text-sm font-medium text-white group-hover:text-primary-500 transition-colors">
                    {firstName}
                  </p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-white transition-transform group-hover:text-primary-500 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1F1F1F] border-gray-800">
              <div className="px-4 py-2 border-b border-gray-800">
                <p className="text-sm font-medium text-white">{user?.namaLengkap}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <DropdownMenuItem asChild>
                <Link
                  href="/"
                  className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  <span>Homepage</span>
                </Link>
              </DropdownMenuItem>
              {hasRole && hasRole('KADIV') && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin"
                    className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    <span>Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard"
                  className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/change-password"
                  className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors"
                >
                  <Key className="w-4 h-4 mr-2" />
                  <span>Change Password</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Profile Menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary-500">
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
                    {initials}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1F1F1F] border-gray-800">
              <div className="px-4 py-2 border-b border-gray-800">
                <p className="text-sm font-medium text-white">{user?.namaLengkap}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50">
                  Home
                </Link>
              </DropdownMenuItem>
              {hasRole && hasRole('KADIV') && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin"
                    className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    <span>Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard"
                  className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/change-password"
                  className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors"
                >
                  <Key className="w-4 h-4 mr-2" />
                  <span>Change Password</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center w-full px-2 py-2 text-sm text-white hover:text-primary-500 hover:bg-gray-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}; 