'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspirasiList } from "@/components/aspirasi/AspirasiList";
import { AddAspirasiDialog } from "@/components/aspirasi/AddAspirasiDialog";
import { Aspirasi } from "@/types/aspirasi";
import Aurora from "@/components/effects/Aurora";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { useToast } from "@/components/ui/use-toast"; // Pastikan useToast diimpor

const REQUEST_THROTTLE_MS = 3000; // Waktu throttle dalam milidetik

export default function AspirasiPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aspirations, setAspirations] = useState<Aspirasi[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Mulai dengan loading true
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading, hasRole, isKadivHD, } = useAuth();
  const { authenticatedFetch } = useAuthenticatedApi();
  const router = useRouter();
  const { toast } = useToast(); // Ambil instance toast
  const initialFetchDone = useRef(false); // Lacak apakah fetch awal sudah selesai
  const requestInProgress = useRef(false); // Lacak apakah ada request yang sedang berjalan
  const lastRequestTime = useRef(0); // Lacak waktu request terakhir

  // Check if user is admin (KADIV)
  const isHdKadiv = isKadivHD();

  // fetchMyAspirations dengan throttling dan parameter isRetry
  const fetchMyAspirations = useCallback(async (isRetry = false) => {
    const now = Date.now();
    if (requestInProgress.current || (!isRetry && initialFetchDone.current && (now - lastRequestTime.current < REQUEST_THROTTLE_MS))) {
      console.log(`Aspirasi fetch throttled. In progress: ${requestInProgress.current}, Time since last: ${now - lastRequestTime.current}ms`);
      if (!requestInProgress.current && (now - lastRequestTime.current < REQUEST_THROTTLE_MS)) {
         toast({
             title: "Slow Down",
             description: "Please wait a moment before trying again.",
             variant: "default", // Gunakan variant yang valid
         });
      }
      return;
    }

    requestInProgress.current = true;
    lastRequestTime.current = now;
    setIsLoading(true);
    setError(null);

    try {
      const data = await authenticatedFetch('/api/aspirasi');
      if (data && data.aspirasi) {
        setAspirations(data.aspirasi);
      } else {
        setAspirations([]);
        console.warn("Fetched aspirations data is missing or invalid:", data);
      }
    } catch (error: any) {
      console.error("Error fetching aspirations:", error);
      const status = error?.status;
      if (status === 429 || error.message?.includes('429')) {
         setError("Too many requests. Please wait a moment and try again.");
         toast({
            title: "Rate Limit Exceeded",
            description: "You're doing that too fast! Please wait a moment.",
            variant: "error",
         });
      } else {
         const errorMessage = error.body?.message || error.message || 'Unknown error';
         setError(`Failed to load aspirations: ${errorMessage}`);
         toast({
           title: "Failed to Load",
           description: `Could not load aspirations. ${errorMessage}`,
           variant: "error",
         });
      }
    } finally {
      setIsLoading(false);
      requestInProgress.current = false;
    }
  }, [authenticatedFetch, toast]);

  // useEffect untuk menangani auth state dan fetch awal
  useEffect(() => {
    if (authLoading) {
        // Jika masih loading auth, jangan lakukan apa-apa
        return;
    }

    if (!user) {
      // Jika tidak ada user setelah auth selesai, redirect ke login
      router.push('/login');
      return;
    }

    if (isHdKadiv) {
      // Jika user adalah admin, redirect ke halaman admin
      console.log('User is KADIV, redirecting to /kadiv/aspirasi');
      router.push('/kadiv/aspirasi');
      return;
    }

    // Jika user BUKAN admin dan fetch awal BELUM dilakukan
    if (!isHdKadiv && !initialFetchDone.current) {
      initialFetchDone.current = true; // Tandai fetch awal sudah dimulai/selesai
      fetchMyAspirations(false); // Lakukan fetch awal (bukan retry)
    }
    // Jangan tambahkan 'error' sebagai dependency di sini untuk mencegah loop jika fetch gagal
  }, [authLoading, user, isHdKadiv, router, fetchMyAspirations]); // Dependencies yang relevan

  const handleDelete = async (id: number) => {
    try {
      await authenticatedFetch(`/api/aspirasi/${id}`, {
        method: 'DELETE',
      });
      toast({
        title: "Success",
        description: "Aspirasi deleted successfully",
        variant: "default",
      });
      fetchMyAspirations(false);
    } catch (error) {
      console.error("Error deleting aspirasi:", error);
      toast({
        title: "Error",
        description: "Failed to delete aspirasi",
        variant: "error",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white text-lg">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading user data...</span>
      </div>
    );
  }

  if (!user || isHdKadiv) {
    return null;
  }

  return (
    <div className="relative min-h-screen mt-12">
      <div className="fixed inset-0 z-0">
        <Aurora
          colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
          blend={0.3}
          amplitude={1.0}
          speed={0.2}
        />
      </div>
      <div className="container py-6 space-y-8 relative z-10 bg-[#1F1F1F]/20 rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Aspirations</h1>
            <p className="text-md">
              Share and view your feedback
            </p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#F97316] hover:bg-[#F97316]/90 transition-colors gap-2 rounded"
          >
            <Plus className="h-4 w-4" />
            Add Aspirasi
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading your aspirations...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4 rounded-lg border border-red-800 bg-red-900/20 text-red-200">
            {error}
            {!error.includes("Too many requests") && (
               <Button
                 variant="link"
                 onClick={() => fetchMyAspirations(true)}
                 className="px-0 text-red-200 underline ml-2"
                 disabled={requestInProgress.current}
               >
                 Try again
               </Button>
            )}
          </div>
        )}

        {!isLoading && !error && aspirations.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4">You haven't submitted any aspirations yet</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-[#F97316] text-[#F97316]">
              Submit Your First Feedback
            </Button>
          </div>
        )}

        {!isLoading && !error && aspirations.length > 0 && (
          <div className="space-y-4">
            <AspirasiList
              aspirations={aspirations}
              onDelete={handleDelete}
            />
          </div>
        )}

        <AddAspirasiDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={() => fetchMyAspirations(false)}
        />
      </div>
    </div>
  );
}