import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import QRCode from "qrcode";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isKadiv) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { training_id } = await req.json();
    if (!training_id) {
      return NextResponse.json(
        { error: "Training ID is required" },
        { status: 400 }
      );
    }

    // Generate a unique token with better entropy
    const token = crypto.randomUUID();
    
    // Set expiration time (15 minutes from now)
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Create QR code data
    const qrData = {
      training_id,
      token,
      expires_at,
    };

    // Generate QR code image with optimized settings
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: "M", // Lower error correction for faster generation
      margin: 1,
      width: 300, // Smaller size for faster generation
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    // Remove the data URL prefix to get just the base64 data
    const base64Data = qrCode.split(",")[1];

    return NextResponse.json({
      qr_code: base64Data,
      token,
      expires_at,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}