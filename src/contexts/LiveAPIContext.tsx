"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MultimodalLiveClient } from '../utils/MultimodalLiveClient';
import { SafetySetting } from '@google/generative-ai';

// Define SystemInstruction as a union type
type SystemInstruction = string | { parts: Array<{ text: string }> };

interface LiveAPIConfig {
  model?: string;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
  };
  safetySettings?: Array<SafetySetting>;
  inline?: {
    includeImage?: boolean;
    includeAudio?: boolean;
  };
  systemInstruction?: SystemInstruction;
}

interface LiveAPIContextType {
  client: MultimodalLiveClient;
  connected: boolean;
  loading: boolean;
  error: string | null;
  setConfig: (config: LiveAPIConfig) => void;
}

const LiveAPIContext = createContext<LiveAPIContextType | undefined>(undefined);

interface LiveAPIProviderProps {
  children: ReactNode;
  apiKey: string;
}

export const LiveAPIProvider: React.FC<LiveAPIProviderProps> = ({ children, apiKey }) => {
  const [client] = useState<MultimodalLiveClient>(() => new MultimodalLiveClient({ apiKey }));
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      setLoading(false);
      setError(null);
    };

    const handleDisconnect = () => {
      setConnected(false);
      setLoading(false);
    };

    const handleError = (err: Error) => {
      setError(err.message);
      setConnected(false);
      setLoading(false);
    };

    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);
    client.on('error', handleError);

    // Initialize connection
    setLoading(true);
    client.connect().catch(handleError);

    return () => {
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
      client.off('error', handleError);
      client.disconnect();
    };
  }, [client]);

  const setConfig = (config: LiveAPIConfig) => {
    try {
      setLoading(true);
      client.setConfig(config);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
      console.error('Error setting Gemini configuration:', error);
    }
  };

  const value = {
    client,
    connected,
    loading,
    error,
    setConfig,
  };

  return (
    <LiveAPIContext.Provider value={value}>
      {children}
    </LiveAPIContext.Provider>
  );
};

export const useLiveAPIContext = (): LiveAPIContextType => {
  const context = useContext(LiveAPIContext);
  if (context === undefined) {
    throw new Error('useLiveAPIContext must be used within a LiveAPIProvider');
  }
  return context;
}; 