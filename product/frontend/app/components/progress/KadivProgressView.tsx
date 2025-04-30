"use client";

import { useState, useEffect, useRef } from "react";
import { PendingApprovals } from "./PendingApprovals";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";

interface PendingApproval {
  id: string;
  staffId: string;
  staffName: string;
  staffAvatar: string;
  title: string;
  type: "committee" | "assignment" | "training";
  date: string;
  description: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Simple delay function to prevent rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function KadivProgressView() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const { user, isKadivHD } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const lastRequestTime = useRef<number>(0);

  // Simple fetch with authentication and rate limit handling
  const fetchWithAuth = async (url: string, options = {}) => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required. Please log in again.");
      router.push('/login');
      return null;
    }

    // Add delay to prevent rate limiting if requests are too close together
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    
    if (timeSinceLastRequest < 1000) {
      // Wait at least 1 second between requests
      await delay(1000 - timeSinceLastRequest);
    }
    
    // Update the last request time
    lastRequestTime.current = Date.now();

    try {
      const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options as any).headers,
        },
      });

      if (response.status === 429) {
        // Rate limit hit - wait 2 seconds and try once more
        await delay(2000);
        
        const retryResponse = await fetch(`${API_URL}${url}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options as any).headers,
          },
        });
        
        if (retryResponse.status === 401 || retryResponse.status === 429) {
          setError("Too many requests. Please wait a moment and try again.");
          return null;
        }
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        
        return await retryResponse.json();
      }

      if (response.status === 401) {
        setError("Your session has expired. Please log in again.");
        router.push('/login');
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Only load if user is kadiv
    if (!user || !isKadivHD()) {
      setLoading(false);
      setError("You don't have permission to view this page");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const progressResult = await fetchWithAuth("/api/progress");
        
        if (!progressResult || !progressResult.success || !Array.isArray(progressResult.data)) {
          throw new Error('Invalid response from progress API');
        }

        const pendingItems = progressResult.data.filter((item: any) => item.status?.toLowerCase() === 'pending');

        if (pendingItems.length === 0) {
          setPendingApprovals([]);
          setError(null);
          setLoading(false);
          return;
        }

        // Get unique user IDs from pending items
        const userIds: string[] = Array.from(new Set(pendingItems.map((item: any) => item.userId).filter((id: any): id is string => !!id))); // Explicitly type userIds

        // Fetch user details for each unique user ID
        const userDetailsMap = new Map<string, { name: string; avatar: string }>();
        
        // Use Promise.all to fetch user details concurrently
        await Promise.all(userIds.map(async (userId: string) => { // Explicitly type userId as string
          try {
            const userResult = await fetchWithAuth(`/api/users/${userId}`); // userId is now guaranteed string
            if (userResult && userResult.success && userResult.user) {
              userDetailsMap.set(userId, { // userId is now guaranteed string
                name: userResult.user.namaLengkap || userResult.user.name || "Unknown User",
                avatar: userResult.user.avatar || ''
              });
            } else {
              // Handle case where user fetch fails or user not found
              userDetailsMap.set(userId, { name: "Unknown User", avatar: '' }); // userId is now guaranteed string
            }
          } catch (userError) {
            console.error(`Failed to fetch user details for ${userId}:`, userError);
            userDetailsMap.set(userId, { name: "Unknown User", avatar: '' }); // userId is now guaranteed string
          }
        }));
        
        // Map progress items to PendingApproval format, including user details
        const approvals = pendingItems.map((item: any) => {
          const userDetails = userDetailsMap.get(item.userId as string) || { name: "Unknown User", avatar: '' }; // Cast item.userId to string
          return {
            id: String(item.id),
            staffId: item.userId || 'unknown',
            staffName: userDetails.name,
            staffAvatar: userDetails.avatar,
            title: `${item.eventType} Request`,
            type: item.eventType?.toLowerCase() === 'task' ? 'assignment' : 'committee',
            date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            description: item.details || 'No description provided'
          };
        });
        
        setPendingApprovals(approvals);
        setError(null);
      } catch (error) {
        setError("Failed to load progress data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, isKadivHD, router]);

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    if (actionInProgress) return;
    if (!isKadivHD()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to perform this action",
        variant: "error"
      });
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetchWithAuth(`/api/progress/${id}/${action}`, {
        method: 'PATCH',
      });
      
      if (!res) {
        // Auth failed, redirected to login
        setActionInProgress(false);
        return;
      }
      
      if (!res.success) {
        throw new Error(res.message || `Failed to ${action} progress`);
      }
      
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Success",
        description: `Progress item ${action}ed successfully`,
        variant: "success"
      });
      
      // Wait a bit before fetching the updated list
      await delay(1000);
      
      // Reload the list - Refetch both progress and user details
      try {
        const progressResult = await fetchWithAuth("/api/progress");
        if (progressResult && progressResult.success && Array.isArray(progressResult.data)) {
          const pendingItems = progressResult.data.filter((item: any) => item.status?.toLowerCase() === 'pending');
          const userIds: string[] = Array.from(new Set(pendingItems.map((item: any) => item.userId).filter((id: any): id is string => !!id))); // Explicitly type userIds
          
          const userDetailsMap = new Map<string, { name: string; avatar: string }>();
          await Promise.all(userIds.map(async (userId: string) => { // Explicitly type userId as string
            try {
              const userResult = await fetchWithAuth(`/api/users/${userId}`); // userId is now guaranteed string
              if (userResult && userResult.success && userResult.user) {
                userDetailsMap.set(userId, { // userId is now guaranteed string
                  name: userResult.user.namaLengkap || userResult.user.name || "Unknown User",
                  avatar: userResult.user.avatar || ''
                });
              } else {
                userDetailsMap.set(userId, { name: "Unknown User", avatar: '' }); // userId is now guaranteed string
              }
            } catch (userError) {
              console.error(`Failed to fetch user details for ${userId} during refresh:`, userError);
              userDetailsMap.set(userId, { name: "Unknown User", avatar: '' }); // userId is now guaranteed string
            }
          }));

          const approvals = pendingItems.map((item: any) => {
            const userDetails = userDetailsMap.get(item.userId as string) || { name: "Unknown User", avatar: '' }; // Cast item.userId to string
            return {
              id: String(item.id),
              staffId: item.userId || 'unknown',
              staffName: userDetails.name,
              staffAvatar: userDetails.avatar,
              title: `${item.eventType} Request`,
              type: item.eventType?.toLowerCase() === 'task' ? 'assignment' : 'committee',
              date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
              description: item.details || 'No description provided'
            };
          });
          setPendingApprovals(approvals);
        }
      } catch (fetchError) {
        console.error("Failed to refresh list:", fetchError);
        // Don't show an error toast here, as the action itself was successful
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action} progress item`,
        variant: "error"
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleApprove = (id: string) => handleAction(id, 'accept');
  const handleReject = (id: string) => handleAction(id, 'reject');

  if (!isKadivHD()) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center text-gray-500">
          You don't have permission to view this page
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F97316]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#1F1F1F]/30 backdrop-blur-md rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-6">Pending Approvals</h2>
        {pendingApprovals.length > 0 ? (
          <PendingApprovals
            approvals={pendingApprovals}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No pending approvals found
          </div>
        )}
      </div>
    </div>
  );
}