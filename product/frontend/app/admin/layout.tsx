'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { showToast } from '../components/ui/custom-toast';
import { Users, Settings, LayoutDashboard, Layers } from 'lucide-react';
import Link from 'next/link';
import { AuthenticatedNavbar } from '../components/layout/AuthenticatedNavbar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'User Management', href: '/admin/register' },
  { icon: Layers, label: 'Divisions', href: '/admin/divisions' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (!user || !hasRole('KADIV'))) {
      router.push('/dashboard');
      showToast({
        title: "Access Denied",
        description: "Only KADIV can access this page",
        variant: "error"
      });
    }
  }, [mounted, user, hasRole, router]);

  if (!mounted || !user || !hasRole('KADIV')) {
    return null;
  }

  // Sidebar classes for responsive toggle
  const sidebarClass = `fixed top-0 left-0 h-full w-64 bg-[#282828] border-r border-gray-800 z-40 transition-transform duration-300
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0`;

  return (
    <div className="min-h-screen bg-dark-900">
      <AuthenticatedNavbar onMenuClick={() => setIsSidebarOpen((open) => !open)} hideMenuOnDesktop={true} />
      {/* Admin Sidebar */}
      <aside className={sidebarClass}>
        <nav className="mt-16 px-4">
          {adminMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-3 mb-1 rounded-xl transition-colors relative
                  ${isActive 
                    ? 'text-orange-500 bg-orange-500/10' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <div className="flex items-center w-full">
                  <item.icon size={20} className="flex-shrink-0" />
                  <span className="ml-3">{item.label}</span>
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Main Content */}
      <main className="ml-0 md:ml-64 p-8 pt-20 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}