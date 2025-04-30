"use client";

import { useState, useEffect } from "react";
import { StaffProgressView } from "@/components/progress/StaffProgressView";
import { KadivProgressView } from "@/components/progress/KadivProgressView";
import Aurora from "@/components/effects/Aurora";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function ProgressPage() {
  const { user, hasRole, isKadivHD, loading } = useAuth(); // Add isKadivHD
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Contoh: jika ingin redirect ke halaman khusus
      // if (hasRole('KADIV')) router.replace("/progress/kadiv");
      // else router.replace("/progress/staff");
      // Jika tidak, biarkan di halaman ini
    }
  }, [loading, user, hasRole, router]);

  if (loading || !user || !user.roles || user.roles.length === 0) {
    return <div className="flex items-center justify-center min-h-screen text-white text-lg">Memuat data pengguna...</div>;
  }

  // --- DEBUG LOGGING START ---
  console.log('ProgressPage: User Data:', JSON.stringify(user, null, 2));
  const isKadiv = hasRole('KADIV');
  const isHdKadiv = isKadivHD(); // Use the function from context
  console.log('ProgressPage: hasRole("KADIV") result:', isKadiv);
  console.log('ProgressPage: isKadivHD() result:', isHdKadiv);
  // --- DEBUG LOGGING END ---

  return (
    <main className="min-h-screen bg-[#1F1F1F] text-white p-4 md:p-6 relative mt-12">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Aurora
          colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
          blend={0.3}
          amplitude={1.0}
          speed={0.2}
        />
      </div>
      <div className="max-w-7xl mx-auto relative z-10 rounded-lg bg-dark-900 items-center justify-center">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold ml-6 mt-6">Progress Tracker</h1>
        </div>
        {/* Render KadivProgressView only if user is KADIV HD */}
        {isHdKadiv ? <KadivProgressView /> : <StaffProgressView />}
      </div>
    </main>
  );
}