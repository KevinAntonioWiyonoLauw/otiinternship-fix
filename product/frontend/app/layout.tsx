import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import GlobalLoadingOverlay from './components/layout/GlobalLoadingOverlay';
import { Toaster } from 'sonner';
import ClientOnly from '@/components/ClientOnly';
import SessionProvider from './components/providers/SessionProvider';
import { ReactNode } from 'react';
import { LayoutClientWrapper } from './layoutClientWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Omah TI',
  description: 'Platform untuk manajemen TI',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AuthProvider>
            <LoadingProvider>
              <GlobalLoadingOverlay />
              <LayoutClientWrapper>{children}</LayoutClientWrapper>
              <ClientOnly>
                <Toaster richColors position="top-right" />
              </ClientOnly>
            </LoadingProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
} 