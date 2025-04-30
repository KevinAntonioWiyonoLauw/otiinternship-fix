"use client";

import { useEffect, useState } from "react";
import { KadivProgressView } from "@/components/progress/KadivProgressView"; // Corrected path
import { useAuth } from "@/context/AuthContext"; // Corrected path
import { useRouter } from "next/navigation";

export default function KadivProgressPage() {
  const { user, loading, isKadivHD } = useAuth(); // Changed isLoading to loading
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) { // Changed isLoading to loading
      if (!user) {
        router.push("/login");
      } else if (!isKadivHD()) { // Check if user is KADIV HD
        router.push("/dashboard"); // Redirect if not KADIV HD
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router, isKadivHD]); // Changed isLoading to loading

  if (loading || !isAuthorized) { // Changed isLoading to loading
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Divisi Progress Management</h1>
      <KadivProgressView />
    </div>
  );
}