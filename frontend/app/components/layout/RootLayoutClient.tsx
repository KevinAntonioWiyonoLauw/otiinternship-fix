'use client';

import { usePathname } from 'next/navigation';
import LayoutShell from './LayoutShell';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

const RootLayoutClient = ({ children }: RootLayoutClientProps) => {
  const pathname = usePathname();
  const isPublicPage = ['/', '/login'].includes(pathname);

  if (isPublicPage) {
    return children;
  }

  return <LayoutShell>{children}</LayoutShell>;
};

export default RootLayoutClient; 