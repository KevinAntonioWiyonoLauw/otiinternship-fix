'use client';

import { usePathname } from 'next/navigation';
import AuthenticatedLayout from './components/layout/AuthenticatedLayout';
import { ReactNode, useEffect, useState } from 'react';

export function LayoutClientWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  const isAdminRoute = pathname.startsWith('/admin');
  const isPublicRoute = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/change-password'].includes(pathname);
  
  if (isAdminRoute || isPublicRoute) {
    return <>{children}</>;
  }
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}