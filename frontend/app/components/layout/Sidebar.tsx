'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  BarChart3,
  MessageSquare,
  Settings,
  Menu
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Calendar, label: 'Schedule', href: '/schedule' },
  { icon: Clock, label: 'Presence', href: '/presence' },
  { icon: BarChart3, label: 'Progress', href: '/progress' },
  { icon: MessageSquare, label: 'Aspirasi', href: '/aspirasi' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  // Use hydration-safe rendering
  const [mounted, setMounted] = useState(false);
  
  // Only run after client-side hydration is complete
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Menu Button - Fixed for all resolutions */}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full z-40 bg-[#282828] border-r border-gray-800 
          transition-all duration-300
          ${isOpen ? 'w-64' : 'w-0 md:w-20'}`}
      >
        {/* Use a constant className for server rendering, then apply dynamic classes after hydration */}
        <nav className={`mt-16 px-2 ${mounted && !isOpen ? 'hidden md:block' : ''}`}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-3 mb-1 rounded-xl transition-colors relative
                  ${isActive 
                    ? 'text-orange-500 bg-orange-500/10' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                  ${mounted && !isOpen ? 'md:justify-center' : ''}`}
              >
                <div className="flex items-center w-full ml-2">
                  <item.icon size={20} className={`flex-shrink-0 ${mounted && !isOpen ? 'hidden md:block' : ''}`} />
                  <span className={`ml-3 transition-all duration-300 whitespace-nowrap
                    ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {item.label}
                  </span>
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
      {mounted && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;