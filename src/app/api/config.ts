import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Export environment variables with fallbacks
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const JWT_SECRET = process.env.JWT_SECRET || 'technovidya_secret_key'; 