import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, getUserByEmail, createUser, MedicalData } from './db';

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'technovidya_secret_key';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePasswords = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export interface RegisterUserData {
  email: string;
  password: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  age?: string;
  profilePicture?: string;
  medicalData?: MedicalData;
}

export const generateToken = (user: Omit<User, 'password'>): string => {
  // Create a payload with only the essential user information
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };
  
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const registerUser = async (
  userData: RegisterUserData
): Promise<{ user: Omit<User, 'password'>; token: string } | null> => {
  // Check if user already exists
  const existingUser = getUserByEmail(userData.email);
  if (existingUser) {
    return null;
  }

  // Hash the password
  const hashedPassword = await hashPassword(userData.password);

  // Create new user
  const newUser = createUser({
    email: userData.email,
    password: hashedPassword,
    name: userData.name,
    gender: userData.gender,
    age: userData.age,
    profilePicture: userData.profilePicture,
    medicalData: userData.medicalData || {
      medicalHistory: '',
      conditions: [],
      medications: [],
      allergies: [],
      familyHistory: '',
      lifestyle: {
        smoking: false,
        alcohol: false,
        exercise: '',
        diet: '',
        sleepHours: '',
        stressLevel: ''
      },
      vitalSigns: {
        height: '',
        weight: '',
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        bloodSugar: ''
      }
    }
  });

  // Generate JWT token
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    gender: newUser.gender,
    age: newUser.age,
    profilePicture: newUser.profilePicture,
    medicalData: newUser.medicalData,
    createdAt: newUser.createdAt
  });

  // Return user data without password and token
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      gender: newUser.gender,
      age: newUser.age,
      profilePicture: newUser.profilePicture,
      medicalData: newUser.medicalData,
      createdAt: newUser.createdAt
    },
    token
  };
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: Omit<User, 'password'>; token: string } | null> => {
  // Find user by email
  const user = getUserByEmail(email);
  if (!user) {
    return null;
  }

  // Check if password matches
  const isMatch = await comparePasswords(password, user.password);
  if (!isMatch) {
    return null;
  }

  // Generate JWT token
  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    gender: user.gender,
    age: user.age,
    profilePicture: user.profilePicture,
    medicalData: user.medicalData,
    createdAt: user.createdAt
  });

  // Return user data without password and token
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      gender: user.gender,
      age: user.age,
      profilePicture: user.profilePicture,
      medicalData: user.medicalData,
      createdAt: user.createdAt
    },
    token
  };
};