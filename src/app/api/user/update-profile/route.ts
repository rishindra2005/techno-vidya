import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUsers, saveUsers } from '@/utils/db';
import { verifyToken } from '@/utils/auth';

export async function PUT(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await req.json();
    const { profilePicture } = body;

    if (!profilePicture) {
      return NextResponse.json(
        { error: 'Profile picture is required' },
        { status: 400 }
      );
    }

    // Get user
    const userId = payload.id;
    const user = getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user profile picture
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Update user
    users[userIndex].profilePicture = profilePicture;

    // Save to database
    saveUsers(users);
    console.log('Updated user profile picture successfully');

    // Send response
    return NextResponse.json(
      { 
        message: 'Profile picture updated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          gender: user.gender,
          age: user.age,
          profilePicture: profilePicture,
          medicalData: user.medicalData,
          createdAt: user.createdAt
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to update profile picture' },
      { status: 500 }
    );
  }
} 