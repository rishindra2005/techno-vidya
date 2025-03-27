"use client";

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TextToSpeech } from '../utils/TextToSpeech';

interface Message {
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
}

interface MessageDisplayProps {
  messages: Message[];
  isModelStreaming?: boolean;
  autoSpeak?: boolean;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ 
  messages, 
  isModelStreaming = false,
  autoSpeak = false
}) => {
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [tts] = useState(() => typeof window !== 'undefined' ? new TextToSpeech() : null);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const spokenMessages = useRef<number[]>([]);
  
  // Listen for end of speech to clear the speaking state
  useEffect(() => {
    if (!tts) return;
    
    const handleSpeechEnd = () => {
      setSpeakingMessageId(null);
    };
    
    const handleVoicesLoaded = () => {
      setVoicesLoading(false);
    };
    
    tts.on('end', handleSpeechEnd);
    tts.on('error', handleSpeechEnd);
    tts.on('voicesloaded', handleVoicesLoaded);
    
    // Check if voices are already loaded
    if (tts.isVoicesLoaded()) {
      setVoicesLoading(false);
    }
    
    return () => {
      // Clean up all listeners
      tts.off('end', handleSpeechEnd);
      tts.off('error', handleSpeechEnd);
      tts.off('voicesloaded', handleVoicesLoaded);
      
      // Stop any ongoing speech when unmounting
      tts.stop();
    };
  }, [tts]);
  
  // Auto-scroll to the bottom when new content arrives
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Auto-speak the last message if autoSpeak is enabled
  useEffect(() => {
    if (!tts || !autoSpeak || messages.length === 0 || voicesLoading) return;
    
    const lastMessage = messages[messages.length - 1];
    const lastMessageIndex = messages.length - 1;
    
    // Only auto-speak if:
    // 1. Not already speaking
    // 2. It's a model message
    // 3. Not streaming
    // 4. Not already spoken (check against speakingMessageId)
    if (
      lastMessage.role === 'model' && 
      !lastMessage.isStreaming && 
      lastMessage.content && 
      speakingMessageId === null
    ) {
      // Use a ref to track which messages have been auto-spoken
      if (!spokenMessages.current.includes(lastMessageIndex)) {
        console.log(`Auto-speaking message ${lastMessageIndex}`);
        spokenMessages.current.push(lastMessageIndex);
        setSpeakingMessageId(lastMessageIndex);
        tts.speak(lastMessage.content);
      }
    }
  }, [tts, autoSpeak, messages, speakingMessageId, voicesLoading]);
  
  const handleSpeakMessage = (content: string, index: number) => {
    if (!tts || voicesLoading) return;
    
    if (speakingMessageId === index) {
      // Stop speaking if already speaking this message
      console.log(`Stopping speech for message ${index}`);
      tts.stop();
      setSpeakingMessageId(null);
    } else {
      // Stop any current speech and play the new one
      console.log(`Starting speech for message ${index}`);
      tts.stop();
      setSpeakingMessageId(index);
      
      // Small timeout to ensure previous speech is fully stopped
      setTimeout(() => {
        tts.speak(content);
      }, 50);
    }
  };

  return (
    <div className="messages">
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <span className="material-symbols-outlined">medical_services</span>
          </div>
          <h3>Medical Assistant (Beta)</h3>
          <p>Start the conversation by sending a message. You can also use your camera and microphone to communicate.</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const ref = isLastMessage ? lastMessageRef : null;
            const isSpeaking = speakingMessageId === index;
            
            return (
              <div 
                key={index} 
                className={`message ${message.role} ${message.isStreaming ? 'streaming' : ''}`}
                ref={ref}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? (
                    <span className="material-symbols-outlined">person</span>
                  ) : (
                    <span className="material-symbols-outlined">medical_services</span>
                  )}
                </div>
                <div className="message-content">
                  {message.role === 'user' ? (
                    <div className="content-wrapper">
                      <p>{message.content}</p>
                      <button 
                        className={`speak-button ${isSpeaking ? 'speaking' : ''} ${voicesLoading ? 'loading' : ''}`} 
                        onClick={() => handleSpeakMessage(message.content, index)}
                        title={voicesLoading ? "Loading voices..." : isSpeaking ? "Stop speaking" : "Speak message"}
                        disabled={voicesLoading}
                      >
                        <span className="material-symbols-outlined">
                          {voicesLoading ? 'sync' : isSpeaking ? 'stop' : 'volume_up'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="content-wrapper">
                      <div className="markdown-content">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {isModelStreaming && isLastMessage && message.role === 'model' && (
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      )}
                      <button 
                        className={`speak-button ${isSpeaking ? 'speaking' : ''} ${voicesLoading ? 'loading' : ''}`} 
                        onClick={() => handleSpeakMessage(message.content, index)}
                        title={voicesLoading ? "Loading voices..." : isSpeaking ? "Stop speaking" : "Speak message"}
                        disabled={voicesLoading}
                      >
                        <span className="material-symbols-outlined">
                          {voicesLoading ? 'sync' : isSpeaking ? 'stop' : 'volume_up'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      <style jsx>{`
        .messages {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem;
          color: #666;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          margin: 1rem 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #4a80f5, #3a70e5);
          color: white;
          border-radius: 50%;
          margin-bottom: 1rem;
          font-size: 2rem;
        }

        .empty-state h3 {
          font-size: 1.2rem;
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .message {
          display: flex;
          gap: 0.75rem;
          max-width: 100%;
          margin-bottom: 1rem;
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .message.streaming {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(74, 128, 245, 0.1);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(74, 128, 245, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(74, 128, 245, 0);
          }
        }

        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .message.model .message-avatar {
          background: linear-gradient(135deg, #4a80f5, #3a70e5);
          color: white;
        }

        .message.user .message-avatar {
          background: #444;
          color: white;
        }

        .message-content {
          padding: 0.85rem 1rem;
          border-radius: 16px;
          max-width: calc(100% - 60px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          position: relative;
        }

        .message.model .message-content {
          background: white;
          border-top-left-radius: 4px;
          color: #333;
        }

        .message.user .message-content {
          background: #4a80f5;
          color: white;
          border-top-right-radius: 4px;
          text-align: right;
        }

        .message p {
          margin: 0;
          line-height: 1.5;
          font-size: 0.95rem;
        }

        .message.model p, .message.model .markdown-content {
          color: #333;
        }

        .message.user p {
          color: white;
        }

        /* Typing indicator */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          height: 10px;
        }

        .typing-indicator span {
          display: inline-block;
          width: 6px;
          height: 6px;
          background-color: #4a80f5;
          border-radius: 50%;
          animation: bounce 1.5s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-4px);
          }
        }

        /* Style for markdown content */
        .markdown-content :global(pre) {
          background: #f3f5f7;
          padding: 0.75rem;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 0.9rem;
          color: #333;
        }

        .markdown-content :global(code) {
          background: #f3f5f7;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #e53935;
        }

        .markdown-content :global(a) {
          color: #4a80f5;
          text-decoration: underline;
        }

        .markdown-content :global(ul), .markdown-content :global(ol) {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .markdown-content :global(li) {
          margin-bottom: 0.25rem;
        }

        .markdown-content :global(p) {
          margin: 0.5rem 0;
        }

        .markdown-content :global(h1), 
        .markdown-content :global(h2), 
        .markdown-content :global(h3),
        .markdown-content :global(h4) {
          margin: 0.75rem 0 0.5rem 0;
          color: #333;
        }

        .markdown-content :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 0.75rem 0;
        }

        .markdown-content :global(th), .markdown-content :global(td) {
          border: 1px solid #ddd;
          padding: 0.5rem;
          text-align: left;
        }

        .markdown-content :global(th) {
          background-color: #f3f5f7;
        }

        .content-wrapper {
          position: relative;
          width: 100%;
        }
        
        .speak-button {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.1);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s, background-color 0.2s;
        }
        
        .speak-button.loading {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .speak-button.loading .material-symbols-outlined {
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .message.user .speak-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        .message.model .speak-button {
          background: rgba(0, 0, 0, 0.1);
          color: #333;
        }
        
        .speak-button:hover:not(:disabled) {
          opacity: 1;
        }
        
        .speak-button.speaking {
          opacity: 1;
          background: rgba(255, 0, 0, 0.15);
        }
        
        .message.model .speak-button.speaking {
          color: #d32f2f;
        }
        
        .message.user .speak-button.speaking {
          background: rgba(255, 255, 255, 0.4);
        }
        
        .speak-button .material-symbols-outlined {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default MessageDisplay; 