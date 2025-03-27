import EventEmitter from 'eventemitter3';
import { GoogleGenerativeAI, Part, SafetySetting } from '@google/generative-ai';

type MessagePart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
};

type Message = {
  role: 'user' | 'model';
  parts: MessagePart[];
};

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

interface MultimodalLiveClientOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
}

export class MultimodalLiveClient extends EventEmitter {
  private apiKey: string;
  private genAI: GoogleGenerativeAI;
  private model: string;
  private connected: boolean = false;
  private configuration: LiveAPIConfig = {};
  private systemInstruction: SystemInstruction | null = null;
  private session: unknown = null;
  private messages: Message[] = [];
  private currentMediaData: { mimeType: string, data: string }[] = [];
  private videoInterval: NodeJS.Timeout | null = null;

  constructor(options: MultimodalLiveClientOptions) {
    super();
    this.apiKey = options.apiKey;
    this.model = options.model || 'models/gemini-2.0-flash-exp';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    if (options.systemPrompt) {
      this.systemInstruction = {
        parts: [{ text: options.systemPrompt }]
      };
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.connected) return;

      // Create generative model
      const geminiModel = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: this.configuration.generationConfig || {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: this.configuration.safetySettings || [],
      });

      // Process system instruction based on the official live-api-web-console implementation
      const chatOptions: any = {
        history: this.messages.map(msg => ({
          role: msg.role,
          parts: msg.parts as unknown as Part[]
        }))
      };

      // Apply system instruction if available
      if (this.systemInstruction) {
        if (typeof this.systemInstruction === 'string') {
          // String format (not recommended but handled)
          chatOptions.systemInstruction = this.systemInstruction;
        } else if (this.systemInstruction.parts && this.systemInstruction.parts.length > 0) {
          // Object format with parts array
          chatOptions.systemInstruction = this.systemInstruction;
        }
      } else if (this.configuration.systemInstruction) {
        if (typeof this.configuration.systemInstruction === 'string') {
          // String format (not recommended but handled)
          chatOptions.systemInstruction = this.configuration.systemInstruction;
        } else {
          // Object format with parts array (preferred)
          chatOptions.systemInstruction = this.configuration.systemInstruction;
        }
      }

      // Initialize chat session
      this.session = geminiModel.startChat(chatOptions);

      this.connected = true;
      this.emit('connect');
    } catch (error) {
      console.error('Connection error:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  disconnect(): void {
    this.stopVideoCapture();
    this.connected = false;
    this.session = null;
    this.emit('disconnect');
  }

  setConfig(config: LiveAPIConfig): void {
    this.configuration = { ...this.configuration, ...config };
    
    if (config.model) {
      this.model = config.model;
    }
    
    if (config.systemInstruction) {
      this.systemInstruction = config.systemInstruction;
    }
    
    // Reconnect with new config if already connected
    if (this.connected) {
      this.disconnect();
      this.connect().catch(error => 
        this.emit('error', error instanceof Error ? error : new Error(String(error)))
      );
    }
  }

  startVideoCapture(videoElement: HTMLVideoElement, captureInterval: number = 2000): void {
    if (this.videoInterval) this.stopVideoCapture();
    
    this.videoInterval = setInterval(() => {
      try {
        if (!videoElement || !this.configuration.inline?.includeImage) return;
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        
        // Add to media data for next send
        this.currentMediaData.push({
          mimeType: 'image/jpeg',
          data: base64Image
        });
        
        this.emit('videoCaptured', { base64Image });
      } catch (error) {
        console.error('Error capturing video frame:', error);
      }
    }, captureInterval);
  }

  stopVideoCapture(): void {
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }
  }

  addAudioData(audioBase64: string): void {
    if (!this.configuration.inline?.includeAudio) return;
    
    this.currentMediaData.push({
      mimeType: 'audio/wav',
      data: audioBase64
    });
  }

  async send(text: string): Promise<void> {
    if (!this.connected || !this.session) {
      throw new Error('Not connected to API');
    }

    try {
      // Prepare message parts
      const parts: MessagePart[] = [];
      
      // Add media data if available
      this.currentMediaData.forEach(media => {
        parts.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data
          }
        });
      });
      
      // Add text content
      if (text) {
        parts.push({ text });
      }
      
      // Store user message
      this.messages.push({
        role: 'user',
        parts
      });
      
      // Clear current media data after sending
      this.currentMediaData = [];
      
      // Start streaming response
      // Use type assertion to a session object with sendMessageStream method
      interface ChatSession {
        sendMessageStream: (parts: Part[]) => Promise<{
          stream: AsyncIterable<{
            text: () => string;
          }>;
        }>;
      }
      
      const result = await (this.session as ChatSession).sendMessageStream(parts as unknown as Part[]);
      
      let modelResponse = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        modelResponse += chunkText;
        
        this.emit('content', {
          modelTurn: {
            parts: [{ text: chunkText }]
          }
        });
      }
      
      // Store model message
      this.messages.push({
        role: 'model',
        parts: [{ text: modelResponse }]
      });
      
      this.emit('turncomplete');
    } catch (error) {
      console.error('Error sending message:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
} 