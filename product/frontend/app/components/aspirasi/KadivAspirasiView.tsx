"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AspirasiList } from "./AspirasiList";
import { Aspirasi } from "@/types/aspirasi";
import { toast } from "@/components/ui/use-toast";
import { getAspirations, deleteAspiration } from "@/api/aspirasi";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface KadivAspirasiViewProps {
  initialAspirations?: Aspirasi[];
}

export function KadivAspirasiView({ initialAspirations = [] }: KadivAspirasiViewProps) {
  const [aspirations, setAspirations] = useState<Aspirasi[]>(initialAspirations);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTarget, setFilterTarget] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(initialAspirations.length === 0);
  const [targets, setTargets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Add refs to prevent duplicate API calls
  const requestInProgress = useRef<boolean>(false);
  const lastRequestTime = useRef<number>(0);
  const isMounted = useRef<boolean>(true);

  // Delay in milliseconds between requests
  const REQUEST_THROTTLE = 2000;

  useEffect(() => {
    isMounted.current = true;
    
    // Only fetch if we don't have initial data
    if (initialAspirations.length === 0) {
      fetchAspirations();
    } else {
      extractTargets(initialAspirations);
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [initialAspirations]);

  const fetchAspirations = async () => {
    // Check if request is already in progress
    if (requestInProgress.current) {
      return;
    }
    
    // Check if we need to throttle requests
    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_THROTTLE) {
      // Too soon since last request
      console.log("Throttling API request to prevent rate limiting");
      return;
    }
    
    requestInProgress.current = true;
    lastRequestTime.current = now;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getAspirations();
      
      // Only update state if the component is still mounted
      if (isMounted.current) {
        setAspirations(data);
        extractTargets(data);
      }
    } catch (error) {
      console.error("Error fetching aspirations:", error);
      
      // Only update state if the component is still mounted
      if (isMounted.current) {
        setError("Failed to load aspirations. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load aspirations. Wait a moment and try again.",
          variant: "error",
        });
      }
    } finally {
      // Only update state if the component is still mounted
      if (isMounted.current) {
        setIsLoading(false);
      }
      
      // Allow next request after a delay to prevent hammering the API
      setTimeout(() => {
        requestInProgress.current = false;
      }, REQUEST_THROTTLE);
    }
  };

  const extractTargets = (data: Aspirasi[]) => {
    const uniqueTargets = Array.from(new Set(data.map(a => a.target)));
    setTargets(uniqueTargets);
  };

  const filteredAspirations = aspirations.filter((aspirasi) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      aspirasi.message.toLowerCase().includes(searchLower) ||
      aspirasi.subject.toLowerCase().includes(searchLower) ||
      aspirasi.target.toLowerCase().includes(searchLower);
      
    const matchesFilter = filterTarget === "all" || aspirasi.target === filterTarget;
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: number) => {
    try {
      await deleteAspiration(id);
      
      // Only update state if the component is still mounted
      if (isMounted.current) {
        setAspirations((prev) => prev.filter((a) => a.id !== id));
        toast({
          title: "Success",
          description: "Aspirasi deleted successfully",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error deleting aspirasi:", error);
      
      // Only update state if the component is still mounted
      if (isMounted.current) {
        toast({
          title: "Error",
          description: "Failed to delete aspirasi",
          variant: "error",
        });
      }
      throw error; // Rethrow to be handled by AspirasiList if needed
    }
  };

  const handleRefresh = () => {
    fetchAspirations();
  };

  return (
    <div className="space-y-6 bg-[#1F1F1F]/20 p-6 rounded-lg border border-white/10">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold mb-1">Aspirations Dashboard</h2>
          <p className="text-sm text-gray-400">
            Review aspiration
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search aspirations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#1F1F1F] border-gray-800"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={filterTarget}
              onValueChange={setFilterTarget}
            >
              <SelectTrigger className="w-full md:w-[180px] bg-[#1F1F1F] border-gray-800">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by target" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                {targets.map((target) => (
                  <SelectItem key={target} value={target}>
                    {target}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-800 bg-red-900/20 text-red-200">
          {error}. <Button variant="link" onClick={handleRefresh} className="px-0 text-red-200 underline" disabled={requestInProgress.current}>Try again</Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-[#1A1A1A]/30 rounded-xl p-6 border border-white/10 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="w-3/4">
                  <Skeleton className="h-6 mb-2 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
              <Skeleton className="w-full h-[100px] mb-4" />
              <div className="flex justify-between mt-auto">
                <Skeleton className="w-1/4 h-4" />
                <Skeleton className="w-1/4 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAspirations.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-lg">
          <p className="text-gray-400">No aspirations found matching your search criteria</p>
        </div>
      ) : (
        <AspirasiList
          aspirations={filteredAspirations}
          isAdmin={true}
          onDelete={handleDelete}
        />
      )}

      <div className="text-sm text-gray-500 flex justify-between items-center">
        <span>Total: {filteredAspirations.length} aspirations</span>
        {filterTarget !== "all" && (
          <span>Filtered by target: {filterTarget}</span>
        )}
      </div>
    </div>
  );
}