"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import MessageDisplay from '../../components/MessageDisplay';
import ControlTray from '../../components/ControlTray';
import { useLiveAPIContext, LiveAPIProvider } from '../../contexts/LiveAPIContext';

type Message = {
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
};

// Reusable component for handling the chat interface
const RealtimeChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentModelText, setCurrentModelText] = useState('');
  const [isModelStreaming, setIsModelStreaming] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { client, connected, error, setConfig } = useLiveAPIContext();

  // Log connection status changes
  useEffect(() => {
    console.log(`Connection status: ${connected ? 'Connected' : 'Disconnected'}`);
    if (error) {
      console.error('Connection error:', error);
    }
  }, [connected, error]);

  // Auto-scroll messages
  useEffect(() => {
    if (messageContainerRef.current) {
      const element = messageContainerRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  // Set up Gemini system prompt for medical assistant
  useEffect(() => {
    try {
      setConfig({
        model: "models/gemini-2.0-flash-exp",
        inline: {
          includeImage: true,
          includeAudio: true,
        },
        systemInstruction: {
          parts: [
            {
              text: 'You are a helpful medical assistant. Help users with health questions, but be clear when something requires professional medical attention. Always maintain a compassionate, professional tone. When users share video or audio, acknowledge what you can see or hear if relevant. For medical topics, provide evidence-based information and cite sources when possible.'
            }
          ]
        }
      });
      console.log('Gemini configuration set successfully');
    } catch (error) {
      console.error('Error setting Gemini configuration:', error);
    }
  }, [setConfig]);

  // Handle content updates from Gemini
  useEffect(() => {
    const handleContent = (content: { modelTurn?: { parts?: Array<{ text?: string }> } }) => {
      if (content.modelTurn?.parts) {
        const text = content.modelTurn.parts
          .filter((part) => part.text)
          .map((part) => part.text as string)
          .join('');
        
        if (text) {
          setIsModelStreaming(true);
          
          // Update the current model text
          setCurrentModelText(current => {
            const updatedText = current + text;
            
            // Update messages in real-time to show streaming effect
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'model') {
                // Update the last model message
                return [
                  ...prev.slice(0, prev.length - 1),
                  { role: 'model', content: updatedText, isStreaming: true }
                ];
              } else {
                // Add new model message
                return [...prev, { role: 'model', content: updatedText, isStreaming: true }];
              }
            });
            
            return updatedText;
          });
          console.log('Received model content update');
        }
      }
    };

    const handleTurnComplete = () => {
      // Always reset streaming state regardless of currentModelText
      setIsModelStreaming(false);
      
      // Mark message as no longer streaming
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'model') {
          return [
            ...prev.slice(0, prev.length - 1),
            { ...lastMsg, isStreaming: false }
          ];
        }
        return prev;
      });
      
      // Reset current text
      setCurrentModelText('');
      console.log('Model turn complete - streaming reset');
    };

    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);
    
    // Safety mechanism: If streaming gets stuck, auto-reset after 15 seconds
    let streamingTimeout: NodeJS.Timeout | null = null;
    
    if (isModelStreaming) {
      streamingTimeout = setTimeout(() => {
        console.log('Safety timeout: Resetting streaming state after 15s');
        setIsModelStreaming(false);
        setMessages(prev => {
          return prev.map(msg => ({ ...msg, isStreaming: false }));
        });
      }, 15000);
    }
    
    console.log('Set up event listeners for model content');

    return () => {
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
      
      // Clear safety timeout if component unmounts
      if (streamingTimeout) {
        clearTimeout(streamingTimeout);
      }
      
      console.log('Removed event listeners for model content');
    };
  }, [client, currentModelText, isModelStreaming]);

  // Add error handler to reset streaming if API has errors
  useEffect(() => {
    if (error) {
      console.error('Connection error detected, resetting streaming state');
      setIsModelStreaming(false);
      setMessages(prev => {
        return prev.map(msg => ({ ...msg, isStreaming: false }));
      });
    }
  }, [error]);

  // Add function to handle cancellation of AI response
  const handleCancelAIResponse = () => {
    console.log('AI response cancelled by user');
    setIsModelStreaming(false);
    
    // Update the last message to remove streaming state
    setMessages(prev => {
      if (prev.length === 0) return prev;
      
      const lastMsg = prev[prev.length - 1];
      if (lastMsg.role === 'model') {
        return [
          ...prev.slice(0, prev.length - 1),
          { ...lastMsg, isStreaming: false, content: lastMsg.content + " (Response stopped)" }
        ];
      }
      return prev;
    });
    
    // Clear current model text
    setCurrentModelText('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === '' || !connected) return;

    // Clear any pending model text to prevent mixing responses
    setCurrentModelText('');
    setIsModelStreaming(false);
    
    // Add user message
    const userMessage: Message = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    console.log('User message sent:', inputText);
    
    // Send message to Gemini
    try {
      client.send(inputText);
      console.log('Message sent to Gemini API');
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
    }
    
    // Clear input
    setInputText('');
  };

  // Handle auto-speak toggle
  const handleAutoSpeakChange = (enabled: boolean) => {
    setAutoSpeak(enabled);
    console.log(`Auto-speak ${enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="realtime-interface">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-feed"
        />
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <span className="material-symbols-outlined">chat</span>
          <h3>Medical Chat</h3>
          {isModelStreaming && (
            <div className="streaming-status">
              <div className="streaming-indicator">AI is typing...</div>
              <button 
                className="cancel-button" 
                onClick={handleCancelAIResponse}
                title="Stop AI response"
              >
                <span className="material-symbols-outlined">stop</span>
              </button>
            </div>
          )}
        </div>
        <div className="message-container" ref={messageContainerRef}>
          <MessageDisplay 
            messages={messages}
            isModelStreaming={isModelStreaming}
            autoSpeak={autoSpeak}
          />
        </div>

        <form onSubmit={handleSendMessage} className="input-form">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="text-input"
            disabled={!connected || isModelStreaming}
          />
          <button 
            type="submit" 
            className="send-button" 
            disabled={!connected || !inputText.trim() || isModelStreaming}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>

      <ControlTray
        videoRef={videoRef}
        supportsVideo={true}
        autoSpeak={autoSpeak}
        onAutoSpeakChange={handleAutoSpeakChange}
      />

      <style jsx>{`
        .realtime-interface {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr auto;
          gap: 1.5rem;
          height: calc(100vh - 200px);
        }

        .video-container {
          grid-column: 1;
          grid-row: 1;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .video-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .chat-container {
          grid-column: 2;
          grid-row: 1;
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .chat-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #4a80f5, #3a70e5);
          color: white;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          position: relative;
        }
        
        .chat-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
        }

        .streaming-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .streaming-indicator {
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.7;
          }
        }

        .message-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background-color: #f5f8ff;
        }

        .input-form {
          display: flex;
          padding: 0.75rem;
          background: white;
          border-top: 1px solid #eee;
          position: relative;
        }

        .text-input {
          flex: 1;
          padding: 0.75rem 3rem 0.75rem 1rem;
          border: 1px solid #ddd;
          border-radius: 24px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s;
          background: #f7f9fc;
          color: #333;
        }
        
        .text-input:focus {
          border-color: #4a80f5;
          box-shadow: 0 0 0 2px rgba(74, 128, 245, 0.2);
        }
        
        .text-input::placeholder {
          color: #aaa;
        }

        .send-button {
          position: absolute;
          right: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: #4a80f5;
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.3s ease, transform 0.2s ease;
        }

        .send-button:hover:not(:disabled) {
          background: #3a70e5;
          transform: translateY(-50%) scale(1.05);
        }

        .send-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .material-symbols-outlined {
          font-size: 20px;
        }

        .cancel-button {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: background 0.2s;
        }
        
        .cancel-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .cancel-button .material-symbols-outlined {
          font-size: 14px;
        }

        @media (max-width: 1024px) {
          .realtime-interface {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 1fr auto;
          }

          .video-container {
            grid-column: 1;
            grid-row: 1;
          }

          .chat-container {
            grid-column: 1;
            grid-row: 2;
          }
        }
      `}</style>
    </div>
  );
};

// Main page component
export default function RealtimePage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [showChat, setShowChat] = useState<boolean>(false);
  
  // Check for API key in localStorage on client side
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (key) {
      setApiKey(key);
      setShowChat(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey);
      setShowChat(true);
    }
  };

  return (
    <div className="realtime-container">
      <header className="header">
        <Link href="/home" className="back-button">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="title">Realtime Medical Assistant <span className="beta-badge">BETA</span></h1>
      </header>

      {!showChat ? (
        <div className="api-key-form-container">
          <div className="info-panel">
            <h2>Welcome to Realtime Medical Assistant</h2>
            <p>
              This feature uses Gemini API to provide a video consultation experience. 
              To proceed, please enter your Gemini API key.
            </p>
            <div className="note">
              <span className="material-symbols-outlined warning-icon">info</span>
              <p>Your API key is stored locally in your browser and is never sent to our servers.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="api-key-form">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="api-key-input"
            />
            <button type="submit" className="submit-button">
              Start Consultation
            </button>
          </form>
        </div>
      ) : (
        <LiveAPIProvider apiKey={apiKey}>
          <RealtimeChat />
        </LiveAPIProvider>
      )}

      <style jsx>{`
        .realtime-container {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          height: 100vh;
          max-width: 1600px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f0f0f0;
          transition: background 0.2s;
        }

        .back-button:hover {
          background: #e0e0e0;
        }

        .title {
          font-size: 1.75rem;
          font-weight: 600;
          color: #333;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .beta-badge {
          font-size: 0.75rem;
          background: linear-gradient(135deg, #3a70e5, #4a80f5);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .api-key-form-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          max-width: 600px;
          margin: 2rem auto;
          padding: 2rem;
          border-radius: 12px;
          background: white;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .info-panel h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .info-panel p {
          color: #555;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .note {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #4a80f5;
        }

        .warning-icon {
          color: #4a80f5;
        }

        .note p {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        .api-key-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .api-key-input {
          padding: 0.75rem 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }

        .api-key-input:focus {
          border-color: #4a80f5;
          outline: none;
        }

        .submit-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3a70e5, #4a80f5);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .submit-button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
} 