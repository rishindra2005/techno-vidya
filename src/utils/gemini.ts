import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { MedicalData } from './db';

// Load environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Use the newer model name
const MODEL_NAME = 'gemini-2.0-flash';

// Interface for image data
interface ImageData {
  data: string; // base64 encoded image
  mimeType: string;
  fileName: string;
}

// Base system prompt for medical virtual assistant
const BASE_SYSTEM_PROMPT = `You are Techno Vaidhya, a virtual medical assistant. 
You provide helpful, accurate, and friendly medical information to patients.  Focus on providing general health 
information, preventive care tips, and guidance on when to seek professional help.


- Use > blockquotes for important warnings or disclaimers

Always respond in a clean, well-formatted markdown style that improves readability.`;

// Add the UserData interface
interface UserData {
  name?: string;
  gender?: string;
  age?: number | string; // Support both number and string types for age
  medicalData?: MedicalData;
}

// Helper function to generate system prompt with user's medical data
const getSystemPrompt = (userData?: UserData): string => {
  let userContext = '';
  if (userData) {
    userContext += `\n\nUSER CONTEXT:\n`;
    if (userData.name) {
      userContext += `- Name: ${userData.name}\n`;
    }
    if (userData.gender) {
      userContext += `- Gender: ${userData.gender}\n`;
    }
    if (userData.age) {
      userContext += `- Age: ${userData.age}\n`;
    }

    if (userData.medicalData) {
      const md = userData.medicalData;
      
      if (md.conditions && md.conditions.length > 0) {
        userContext += `- Medical conditions: ${md.conditions.join(', ')}\n`;
      }
      
      if (md.medications && md.medications.length > 0) {
        userContext += `- Current medications: ${md.medications.join(', ')}\n`;
      }
      
      if (md.allergies && md.allergies.length > 0) {
        userContext += `- Allergies: ${md.allergies.join(', ')}\n`;
      }
      
      if (md.medicalHistory) {
        userContext += `- Medical history: ${md.medicalHistory}\n`;
      }
      
      if (md.familyHistory) {
        userContext += `- Family history: ${md.familyHistory}\n`;
      }
      
      if (md.lifestyle) {
        const lifestyle = [];
        if (md.lifestyle.smoking !== undefined) lifestyle.push(`Smoking: ${md.lifestyle.smoking ? 'Yes' : 'No'}`);
        if (md.lifestyle.alcohol !== undefined) lifestyle.push(`Alcohol: ${md.lifestyle.alcohol ? 'Yes' : 'No'}`);
        if (md.lifestyle.exercise) lifestyle.push(`Exercise: ${md.lifestyle.exercise}`);
        if (md.lifestyle.diet) lifestyle.push(`Diet: ${md.lifestyle.diet}`);
        
        if (lifestyle.length > 0) {
          userContext += `- Lifestyle: ${lifestyle.join(', ')}\n`;
        }
      }
      
      if (md.vitalSigns) {
        const vitals = [];
        if (md.vitalSigns.height) vitals.push(`Height: ${md.vitalSigns.height}`);
        if (md.vitalSigns.weight) vitals.push(`Weight: ${md.vitalSigns.weight}`);
        if (md.vitalSigns.bloodPressure) vitals.push(`Blood Pressure: ${md.vitalSigns.bloodPressure}`);
        if (md.vitalSigns.heartRate) vitals.push(`Heart Rate: ${md.vitalSigns.heartRate}`);
        if (md.vitalSigns.bloodSugar) vitals.push(`Blood Sugar: ${md.vitalSigns.bloodSugar}`);
        if (md.vitalSigns.temperature) vitals.push(`Temperature: ${md.vitalSigns.temperature}`);
        
        if (vitals.length > 0) {
          userContext += `- Vital signs: ${vitals.join(', ')}\n`;
        }
      }
    }
  }
  
  return BASE_SYSTEM_PROMPT + userContext;
};

// Update the generateResponse function to correctly handle the system prompt
export async function generateResponse(
  message: string,
  chatHistory: { role: string; content: string }[],
  userData?: UserData,
  imageData?: ImageData
): Promise<string> {
  try {
    const generationConfig = {
      temperature: 1.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    };

    // Generate the personalized system prompt based on user data
    const systemPrompt = getSystemPrompt(userData);

    // Format the history correctly for the API
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [
        { text: msg.content }
      ]
    }));

    // Initialize the model with system instruction
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
    });

    // Create a chat session
    const chatSession = model.startChat({
      generationConfig,
      history: formattedHistory,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    let result;
    
    // Handle based on whether we have an image or not
    if (imageData) {
      // For now, we'll include a note about the image but won't process it
      // This is because the current version of the API doesn't fully support image data in this format
      const imageNote = "Note: The user has uploaded an image. Please note that image analysis is currently limited.";
      const messageWithNote = message ? `${message}\n\n${imageNote}` : imageNote;
      
      // Send text only for now
      result = await chatSession.sendMessage(messageWithNote);
    } else {
      // Text only
      result = await chatSession.sendMessage(message);
    }
    
    return result.response.text();
  } catch (error) {
    console.error("Error generating response:", error);
    return "I'm sorry, I encountered an error processing your request. Please try again with a different question.";
  }
}

// Format chat history for the chat API route
export const formatChatForAPI = (
  messages: Array<{ role: 'user' | 'assistant', content: string }>
): Array<{ role: 'user' | 'assistant', content: string }> => {
  if (messages.length === 0) {
    return [];
  }
  
  // Ensure only user and assistant messages are included
  const filteredMessages = messages.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  );
  
  // If the first message in history is the system prompt, remove it
  // This is to avoid duplicating the system prompt which is now sent separately
  if (filteredMessages.length > 0 && 
      filteredMessages[0].role === 'user' && 
      filteredMessages[0].content.includes('You are Techno Vaidhya')) {
    // Remove the first two messages (system prompt and initial greeting)
    return filteredMessages.slice(2);
  }
  
  return filteredMessages;
}; 