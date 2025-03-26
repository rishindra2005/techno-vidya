import fs from 'fs';
import path from 'path';

const usersPath = path.join(process.cwd(), 'src/data/users.json');
const chatHistoryPath = path.join(process.cwd(), 'src/data/chat_history.json');

export interface MedicalData {
  medicalHistory?: string;
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
  familyHistory?: string;
  lifestyle?: {
    smoking?: boolean;
    alcohol?: boolean;
    exercise?: string;
    diet?: string;
    sleepHours?: string;
    stressLevel?: string;
  };
  vitalSigns?: {
    height?: string;
    weight?: string;
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    bloodSugar?: string;
  };
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  age?: string;
  profilePicture?: string;
  medicalData?: MedicalData;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image?: string; // Optional image data URL
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// User operations
export const getUsers = (): User[] => {
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, '[]');
    return [];
  }
  const data = fs.readFileSync(usersPath, 'utf-8');
  return JSON.parse(data);
};

export const saveUsers = (users: User[]): void => {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
};

// Updated getUserById function that returns null if user not found
export const getUserById = (id: string): User | null => {
  try {
    const users = getUsers();
    return users.find(user => user.id === id) || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

export const getUserByEmail = (email: string): User | undefined => {
  const users = getUsers();
  return users.find(user => user.email === email);
};

export const createUser = (user: Omit<User, 'id' | 'createdAt'>): User => {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

// Chat operations
export const getChatSessions = (): ChatSession[] => {
  if (!fs.existsSync(chatHistoryPath)) {
    fs.writeFileSync(chatHistoryPath, '[]');
    return [];
  }
  const data = fs.readFileSync(chatHistoryPath, 'utf-8');
  return JSON.parse(data);
};

export const saveChatSessions = (sessions: ChatSession[]): void => {
  fs.writeFileSync(chatHistoryPath, JSON.stringify(sessions, null, 2));
};

export const getChatSessionsByUserId = (userId: string): ChatSession[] => {
  const sessions = getChatSessions();
  return sessions.filter(session => session.userId === userId);
};

export const getChatSessionById = (id: string): ChatSession | undefined => {
  const sessions = getChatSessions();
  return sessions.find(session => session.id === id);
};

export const createChatSession = (userId: string): ChatSession => {
  const sessions = getChatSessions();
  const now = new Date().toISOString();
  const newSession: ChatSession = {
    id: Date.now().toString(),
    userId,
    messages: [],
    createdAt: now,
    updatedAt: now
  };
  sessions.push(newSession);
  saveChatSessions(sessions);
  return newSession;
};

export const addMessageToChatSession = (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatSession => {
  const sessions = getChatSessions();
  const sessionIndex = sessions.findIndex(session => session.id === sessionId);
  
  if (sessionIndex === -1) {
    throw new Error('Chat session not found');
  }
  
  const newMessage: ChatMessage = {
    ...message,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  };
  
  sessions[sessionIndex].messages.push(newMessage);
  sessions[sessionIndex].updatedAt = new Date().toISOString();
  
  saveChatSessions(sessions);
  return sessions[sessionIndex];
}; 