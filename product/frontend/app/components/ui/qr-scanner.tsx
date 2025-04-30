'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, Result, Exception } from "@zxing/library";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface QRScannerProps {
  onResult: (result: string) => void;
}

export function QRScanner({ onResult }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomValue, setZoomValue] = useState(1);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    let mounted = true;
    let stopRequested = false;

    const initCamera = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
          }
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) return;

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        const track = mediaStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        console.log('Camera capabilities:', capabilities);
        
        if (capabilities && 'zoom' in capabilities) {
          setHasZoom(true);
          const settings = track.getSettings();
          const zoomCap = capabilities.zoom as { min: number; max: number };
          // Set initial zoom to minimum value
          const initialZoom = zoomCap.min || 1;
          setZoomValue(initialZoom);
          
          console.log('Zoom is supported. Range:', zoomCap);
        } else {
          console.log('Zoom is not supported on this device');
          setHasZoom(false);
        }

        // Start continuous scanning
        if (videoRef.current) {
          const onScanSuccess = (result: Result) => {
            if (result.getText()) {
              onResult(result.getText());
            }
          };

          const onScanError = (error: Exception) => {
            // Suppress NotFoundException (no code found in frame)
            if (error && error.name === 'NotFoundException') return;
            // Only log other errors
            if (error && error.name !== 'NotFoundException') {
              console.error(error);
            }
          };

          codeReader.decodeFromVideoElement(videoRef.current)
            .then(onScanSuccess)
            .catch(onScanError);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast({
          variant: "error",
          title: "Camera Error",
          description: "Failed to access camera. Please make sure you have given camera permissions.",
        });
      }
    };

    if (scanning) {
      initCamera();
    }

    // Handle tab visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        setScanning(false);
        codeReader.reset();
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      } else {
        setScanning(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      codeReader.reset();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResult, scanning]);

  const handleZoomChange = async (value: number[]) => {
    if (!stream) return;
    
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if ('zoom' in capabilities) {
      const newZoom = value[0];
      setZoomValue(newZoom);
      
      try {
        await track.applyConstraints({
          advanced: [{ zoom: newZoom } as any]
        });
      } catch (error) {
        console.error('Error applying zoom:', error);
      }
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomValue + 0.5, 10);
    handleZoomChange([newZoom]);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomValue - 0.5, 1);
    handleZoomChange([newZoom]);
  };

  return (
    <div className="relative w-full max-w-md mx-auto space-y-4">
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full aspect-square object-cover rounded-lg"
          autoPlay
          playsInline
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
          {hasZoom ? `${zoomValue.toFixed(1)}x` : 'No zoom available'}
        </div>
      </div>

      {hasZoom && (
        <div className="w-full bg-card rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomValue <= 1}
              className="h-8 w-8 shrink-0"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="relative flex-1 py-4">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-muted-foreground/20 rounded-full -translate-y-1/2" />
              <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-muted-foreground/30 rounded-full -translate-y-1/2 w-[calc(((var(--zoom-value)-1)/4)*100%)]" style={{ '--zoom-value': zoomValue } as React.CSSProperties} />
              <Slider
                value={[zoomValue]}
                onValueChange={handleZoomChange}
                min={1}
                max={5}
                step={0.1}
                className="relative z-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomValue >= 5}
              className="h-8 w-8 shrink-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 