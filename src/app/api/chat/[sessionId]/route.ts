import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/auth';
import { getChatSessionById, getUserById, getChatSessions, saveChatSessions } from '@/utils/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    
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

    // Get chat session
    const session = getChatSessionById(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Verify that the session belongs to the user
    if (session.userId !== decodedToken.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this chat session' },
        { status: 403 }
      );
    }

    // Return session data
    return NextResponse.json({
      session
    }, { status: 200 });
  } catch (error) {
    console.error('Error retrieving chat session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    
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

    // Get chat sessions
    const sessions = getChatSessions();
    
    // Find the session to delete
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }
    
    // Verify that the session belongs to the user
    if (sessions[sessionIndex].userId !== decodedToken.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this chat session' },
        { status: 403 }
      );
    }
    
    // Remove the session from the array
    const deletedSession = sessions.splice(sessionIndex, 1)[0];
    
    // Save the updated sessions array
    saveChatSessions(sessions);
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'Chat session deleted successfully',
      sessionId: deletedSession.id
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 