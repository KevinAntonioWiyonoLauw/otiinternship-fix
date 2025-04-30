"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { QRCode } from "../../types/presence";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { TrainingSelector } from "@/components/presence/TrainingSelector";
import { getAuthToken } from "../../lib/auth";
import Aurora from "@/components/effects/Aurora";
import { useRouter } from "next/navigation";

export default function GenerateQRPage() {
  const [qrCode, setQRCode] = useState<QRCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const { user, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !hasRole('KADIV')) {
      router.replace('/'); // Atau halaman lain yang sesuai
    }
  }, [user, hasRole, router]);

  const generateQR = async () => {
    if (!selectedTrainingId) {
      toast({
        title: "Error",
        description: "Please select a training first",
        variant: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/presence/generate-qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          training_id: selectedTrainingId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || `Failed to generate QR code (HTTP ${response.status})`);
      }

      setQRCode(data.qr_data);
      toast({
        title: "QR Code Generated",
        description: "QR Code will expire at " + new Date(data.qr_data.expires_at).toLocaleTimeString(),
        variant: "success",
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate QR code",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !user.roles || user.roles.length === 0) {
    return <div className="flex items-center justify-center min-h-screen text-white text-lg">Memuat data pengguna...</div>;
  }

  if (!hasRole('KADIV')) {
    return (
      <div className="min-h-screen bg-[#1F1F1F] text-white p-4 md:p-6 relative">
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div className="w-full h-full" style={{ transform: 'scale(1.2)', transition: 'transform 0.3s ease-out' }}>
            <Aurora
              colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
              blend={0.3}
              amplitude={1.0}
              speed={0.2}
            />
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto relative z-10">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Only Kadiv can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#1F1F1F] text-white p-4 md:p-6 relative">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="w-full h-full" style={{ transform: 'scale(1.2)', transition: 'transform 0.3s ease-out' }}>
          <Aurora
            colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
            blend={0.3}
            amplitude={1.0}
            speed={0.2}
          />
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto relative z-10">
        <h1 className="text-2xl font-bold mb-6">Generate QR Code</h1>
        
        <Card className="p-6 bg-dark-800/30 backdrop-blur-md border border-white/10">
          <div className="flex flex-col items-center gap-6">
            <TrainingSelector 
              onSelect={setSelectedTrainingId} 
              isLoading={isLoading}
            />

            <Button 
              onClick={generateQR} 
              disabled={isLoading || !selectedTrainingId}
              className="w-full max-w-xs"
            >
              {isLoading ? "Generating..." : "Generate QR Code"}
            </Button>

            {qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-64 h-64">
                  <img
                    src={qrCode.qr_code}
                    alt="QR Code"
                    className="object-contain w-64 h-64 rounded-lg shadow"
                  />
                </div>
                <p className="text-sm text-gray-400">
                  Expires at: {new Date(qrCode.expires_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
} 