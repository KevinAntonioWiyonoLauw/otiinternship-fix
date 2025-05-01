import { NextRequest, NextResponse } from 'next/server';
import api from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend auth service
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969'}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    // Always return 200 for security reasons, even if the email doesn't exist
    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive reset instructions shortly'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { 
        success: true, 
        message: 'If your email is registered, you will receive reset instructions shortly' 
      },
      { status: 200 } // Always return 200 for security reasons
    );
  }
}