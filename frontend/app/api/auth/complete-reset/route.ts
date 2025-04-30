import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // This endpoint doesn't require authentication - it's specifically for users who aren't logged in
    const response = await fetch(`${API_URL}/api/auth/complete-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to reset password'
      }, 
      { status: 500 }
    );
  }
}