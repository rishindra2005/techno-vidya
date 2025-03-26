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

    console.log('Raw token (first 10 chars):', token.substring(0, 10) + '...');
    
    const payload = verifyToken(token);
    if (!payload) {
      console.log('Token verification failed');
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.log('Token verified, payload type:', typeof payload);
    console.log('Token payload:', JSON.stringify(payload, null, 2));

    // Get request body
    const body = await req.json();
    const { medicalData } = body;

    if (!medicalData) {
      return NextResponse.json(
        { error: 'Medical data is required' },
        { status: 400 }
      );
    }

    // Get user - fixed to use id instead of userId
    const userId = payload.id; // The token has 'id' not 'userId'
    console.log('Looking for user with ID:', userId);
    const user = getUserById(userId);

    if (!user) {
      console.log('User not found with ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Found user:', user.email);

    // Update user medical data
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Process medical data fields
    const updatedMedicalData = {
      ...users[userIndex].medicalData,
      ...medicalData
    };

    // Ensure proper structure of nested objects
    if (medicalData.vitalSigns) {
      updatedMedicalData.vitalSigns = {
        ...users[userIndex].medicalData?.vitalSigns,
        ...medicalData.vitalSigns
      };
    }

    if (medicalData.lifestyle) {
      updatedMedicalData.lifestyle = {
        ...users[userIndex].medicalData?.lifestyle,
        ...medicalData.lifestyle
      };
    }

    // Update user
    users[userIndex].medicalData = updatedMedicalData;

    // Save to database
    saveUsers(users);
    console.log('Updated user medical data successfully');

    // Send response
    return NextResponse.json(
      { 
        message: 'Medical data updated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          gender: user.gender,
          age: user.age,
          profilePicture: user.profilePicture,
          medicalData: updatedMedicalData
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating medical data:', error);
    return NextResponse.json(
      { error: 'Failed to update medical data' },
      { status: 500 }
    );
  }
} 