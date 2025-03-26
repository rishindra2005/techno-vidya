import { NextRequest, NextResponse } from 'next/server';
import { registerUser, RegisterUserData } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Process JSON data
    const data = await request.json();
    
    const { email, password, name, gender, age, medicalData } = data;
    
    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Create userData object
    const userData: RegisterUserData = {
      email,
      password,
      name,
      gender,
      age,
      medicalData
    };

    // Register user
    const result = await registerUser(userData);
    
    if (!result) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 