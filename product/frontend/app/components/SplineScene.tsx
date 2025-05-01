"use client";

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Spline from '@splinetool/react-spline';

// Preload the Spline scene
const preloadSplineScene = () => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'fetch';
  link.href = 'https://prod.spline.design/gBFG8XIJ5Q0yRyqh/scene.splinecode';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  return () => document.head.removeChild(link);
};

// Static placeholder component with robot silhouette
function StaticPlaceholder() {
  return (
    <div className="w-full h-full relative flex items-center justify-center bg-[#1F1F1F]">
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/robot-placeholder.png"
          alt="Robot Loading Placeholder"
          width={300}
          height={400}
          priority
          className="object-contain opacity-50"
        />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="animate-pulse text-white/80 text-sm">Loading 3D Scene...</div>
      </div>
    </div>
  );
}

// Client-side only component for the actual Spline content
function SplineContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Preload the scene immediately
    const cleanup = preloadSplineScene();
    
    // Preload the 3D model script
    const scriptPreload = document.createElement('link');
    scriptPreload.rel = 'preload';
    scriptPreload.as = 'script';
    scriptPreload.href = 'https://unpkg.com/@splinetool/runtime@0.9.416/build/runtime.js';
    document.head.appendChild(scriptPreload);

    return () => {
      cleanup();
      document.head.removeChild(scriptPreload);
    };
  }, []);

  const onLoad = () => {
    setIsLoaded(true);
    setTimeout(() => {
      setIsVisible(true);
      adjustMobileView();
    }, 100);
  };

  const adjustMobileView = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // Reset styles
    canvas.style.cssText = '';
    
    // Base styles for mobile
    canvas.style.position = 'absolute';
    canvas.style.width = '200%';
    canvas.style.height = '100%';
    canvas.style.left = '-50%';
    canvas.style.top = '0';
    
    // Adjust resolution
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight;
  };

  useEffect(() => {
    // Handle resize with debounce
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isLoaded) {
          adjustMobileView();
        }
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', adjustMobileView);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', adjustMobileView);
      clearTimeout(resizeTimer);
    };
  }, [isLoaded]);

  return (
    <div 
      className={`w-full h-full transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Spline
        scene="https://prod.spline.design/gBFG8XIJ5Q0yRyqh/scene.splinecode"
        className="w-full h-full"
        onLoad={onLoad}
      />
    </div>
  );
}

// Dynamically import the SplineContent component with no SSR
const NoSSRSplineContent = dynamic(
  () => Promise.resolve(SplineContent),
  { ssr: false }
);

export default function SplineScene() {
  return (
    <div className="w-full h-screen relative overflow-hidden">
      <div 
        className="absolute inset-0"
        style={{
          perspective: '1000px',
        }}
      >
        <Suspense fallback={<StaticPlaceholder />}>
          <NoSSRSplineContent />
        </Suspense>
      </div>
    </div>
  );
}