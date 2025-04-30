"use client";

import { useState, useEffect } from 'react';
import { AuthenticatedNavbar } from './AuthenticatedNavbar';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) return null;

  // Don't render the navbar/sidebar on the home, login, or register pages
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <AuthenticatedNavbar onMenuClick={() => setIsSidebarOpen((open) => !open)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="pt-16 md:pl-16 transition-all duration-300">
        {children}
      </main>
    </div>
  );
} 