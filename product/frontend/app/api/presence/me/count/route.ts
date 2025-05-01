import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch presence count from the backend service
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969';
    const response = await fetch(`${apiUrl}/api/presence/me/count`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.user.token}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response from presence service:", errorData);
      throw new Error(errorData.message || "Failed to fetch presence count");
    }

    const data = await response.json();
    
    // If backend doesn't provide userDivisionId, fetch user info to get division
    if (!data.userDivisionId && data.success) {
      try {
        const userResponse = await fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.user.token}`,
          },
          credentials: "include",
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.user && userData.user.divisionId) {
            data.userDivisionId = userData.user.divisionId;
          }
        }
      } catch (userError) {
        console.error("Error fetching user division:", userError);
        // Continue without division ID rather than failing the entire request
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/presence/me/count:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch presence count",
        count: 0,
        totalSessions: 0
      },
      { status: 500 }
    );
  }
}