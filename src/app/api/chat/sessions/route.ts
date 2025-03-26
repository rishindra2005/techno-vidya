import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/auth';
import { getChatSessionsByUserId, getUserById } from '@/utils/db';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract token and verify
    const token = authHeader.substring(7);
    const decodedToken = verifyToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user data
    const user = getUserById(decodedToken.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all chat sessions for the user
    const sessions = getChatSessionsByUserId(decodedToken.id);
    
    // Return sessions data
    return NextResponse.json({
      sessions
    }, { status: 200 });
  } catch (error) {
    console.error('Error retrieving chat sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 