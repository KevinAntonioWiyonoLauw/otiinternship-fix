import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Ensure we're using port 8000 for the backend API
const BASE_URL = 'http://localhost:8000';

interface ApiUser {
  id?: string;
  user_id?: string;
  namaLengkap?: string;
  name?: string;
  role: string;
  email?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      console.error('No auth token found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiUrl = `${BASE_URL}/api/divisions/${params.id}/users`;
    console.log('Forwarding request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { 
          success: false, 
          message: errorData.message || 'Failed to fetch division users'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response:', data);

    // Handle different response formats
    let users: ApiUser[] = [];
    if (data.users) {
      users = data.users;
    } else if (Array.isArray(data)) {
      users = data;
    }

    // For each user, fetch their current role in this division
    const formattedUsers = await Promise.all(users.map(async (user: ApiUser) => {
      try {
        // Get the user's divisions to find their current role
        const userDivisionsResponse = await fetch(
          `${BASE_URL}/api/users/${user.id || user.user_id}/divisions`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (userDivisionsResponse.ok) {
          const userDivisionsData = await userDivisionsResponse.json();
          if (userDivisionsData?.success && Array.isArray(userDivisionsData.divisions)) {
            const currentDivision = userDivisionsData.divisions.find(
              (div: any) => div.id === parseInt(params.id)
            );
            
            if (currentDivision) {
              console.log('Found current division for user:', user.id, 'role:', currentDivision.role);
              return {
                id: user.id || user.user_id,
                name: user.namaLengkap || user.name || 'Unknown',
                role: currentDivision.role,
                email: user.email
              };
            }
          }
        }
        
        // If we couldn't find the current division, use the role from the division users response
        console.log('Using role from division users response for user:', user.id, 'role:', user.role);
        return {
          id: user.id || user.user_id,
          name: user.namaLengkap || user.name || 'Unknown',
          role: user.role || 'STAFF',
          email: user.email
        };
      } catch (error) {
        console.error('Error fetching user divisions:', error);
        return {
          id: user.id || user.user_id,
          name: user.namaLengkap || user.name || 'Unknown',
          role: user.role || 'STAFF',
          email: user.email
        };
      }
    }));

    console.log('Formatted users:', formattedUsers);

    return NextResponse.json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error in division users API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch division users'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const apiUrl = `${BASE_URL}/api/divisions/${params.id}/users`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to add user to division');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add user to division' },
      { status: 500 }
    );
  }
} 