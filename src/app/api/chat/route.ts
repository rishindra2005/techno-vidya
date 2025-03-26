import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/auth';
import { 
  getChatSessionById, 
  addMessageToChatSession, 
  createChatSession,
  ChatMessage,
  getUserById,
  getChatSessionsByUserId
} from '@/utils/db';
import { generateResponse, formatChatForAPI } from '@/utils/gemini';

export async function POST(request: NextRequest) {
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

    // Get user data for personalized responses
    const user = getUserById(decodedToken.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get request body
    const { message, sessionId } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log(`Processing message: "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}"`);
    console.log(`Session ID from request: ${sessionId || 'none'}`);

    // Get or create chat session
    let session = sessionId ? getChatSessionById(sessionId) : null;
    
    if (!session) {
      console.log('Creating new chat session...');
      session = createChatSession(decodedToken.id);
      console.log(`New session created with ID: ${session.id}`);
    } else {
      console.log(`Using existing session with ID: ${session.id}`);
      console.log(`Session has ${session.messages.length} existing messages`);
    }

    // Add user message to chat session
    console.log('Adding user message to chat session...');
    const sessionWithUserMessage = addMessageToChatSession(session.id, {
      userId: decodedToken.id,
      role: 'user',
      content: message
    });

    try {
      // Get updated session with the user message
      const updatedSession = getChatSessionById(session.id);
      if (!updatedSession) {
        throw new Error('Session not found after adding user message');
      }

      console.log(`Retrieved updated session with ${updatedSession.messages.length} messages`);

      // Convert messages to the format expected by our Gemini API
      const messageHistory = updatedSession.messages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Format messages for the API
      const formattedHistory = formatChatForAPI(messageHistory);
      console.log(`Formatted history has ${formattedHistory.length} messages`);
      
      // Prepare user data for personalized responses
      const userData = {
        name: user.name,
        gender: user.gender,
        age: user.age,
        medicalData: user.medicalData
      };
      
      // Generate response from Gemini with user context
      console.log('Generating AI response...');
      const aiResponse = await generateResponse(message, formattedHistory, userData);
      console.log('AI response generated successfully');

      // Add assistant message to chat session
      console.log('Adding AI response to chat session...');
      const finalSession = addMessageToChatSession(updatedSession.id, {
        userId: decodedToken.id,
        role: 'assistant',
        content: aiResponse
      });

      console.log(`Final session has ${finalSession.messages.length} messages`);

      // Return response
      return NextResponse.json({
        sessionId: finalSession.id,
        message: aiResponse
      }, { status: 200 });
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Add a fallback response to the chat session
      const fallbackResponse = "I'm sorry, I'm having trouble processing your message. Please try again later.";
      
      const updatedSession = addMessageToChatSession(session.id, {
        userId: decodedToken.id,
        role: 'assistant',
        content: fallbackResponse
      });
      
      return NextResponse.json({
        sessionId: updatedSession.id,
        message: fallbackResponse
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 