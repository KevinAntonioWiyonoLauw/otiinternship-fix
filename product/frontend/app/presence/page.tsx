"use client";

import { QRScanner } from "@/components/ui/qr-scanner";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import Aurora from "@/components/effects/Aurora";
import { getAuthToken } from "../lib/auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PresencePage() {
  const { user, hasRole, loading } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Contoh: jika ingin redirect ke halaman khusus
      // if (hasRole('KADIV')) router.replace("/presence/kadiv");
      // else router.replace("/presence/staff");
      // Jika tidak, biarkan di halaman ini
    }
  }, [loading, user, hasRole, router]);

  const handleQRScan = async (data: string) => {
    console.log('QR scanned', data);
    setIsScanning(true);
    setScanResult(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/presence/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ qr_code: data }),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "QR Code tidak valid atau sudah kadaluarsa");
      }
      setScanResult({
        success: true,
        message: result.message || "Kehadiran Anda telah tercatat"
      });
      toast({
        title: "Presensi Berhasil",
        description: result.message || "Kehadiran Anda telah tercatat",
        variant: "success",
      });
    } catch (error) {
      console.error('Error recording presence:', error);
      setScanResult({
        success: false,
        message: error instanceof Error ? error.message : "QR Code tidak valid atau sudah kadaluarsa"
      });
      toast({
        title: "Presensi Gagal",
        description: error instanceof Error ? error.message : "QR Code tidak valid atau sudah kadaluarsa",
        variant: "error",
      });
    } finally {
      setIsScanning(false);
    }
  };

  if (loading || !user || !user.roles || user.roles.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1F1F1F] text-white">
        <div className="text-lg font-semibold">Memuat data pengguna...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1F1F1F] text-white p-4 md:p-6 relative mt-12">
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Presensi</h1>
          <div className="flex gap-4">
            <Link href="/presence/history">
              <Button variant="outline">Riwayat Presensi</Button>
            </Link>
            {hasRole('KADIV') && (
              <>
                <Link href="/presence/generate">
                  <Button variant="outline">Generate QR</Button>
                </Link>
                <Link href="/presence/manual">
                  <Button variant="outline">Mark Manual</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* QR Scanner */}
        <div className="max-w-md mx-auto">
          <Card className="p-6 bg-dark-800/30 backdrop-blur-md border border-white/10">
            <h2 className="text-xl font-medium mb-6 text-center">Scan QR Code</h2>
            <div className="relative">
              <QRScanner onResult={handleQRScan} />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-[#FE7F00] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-white">Memproses QR Code...</p>
                  </div>
                </div>
              )}
              {scanResult && (
                <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${scanResult.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <div className="flex flex-col items-center gap-2 p-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scanResult.success ? 'bg-green-500' : 'bg-red-500'}`}>
                      {scanResult.success ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-white text-center">{scanResult.message}</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 text-center mt-4">
              Minta KADIV untuk generate QR Code presensi terlebih dahulu
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
} 