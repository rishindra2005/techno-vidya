import EventEmitter from 'eventemitter3';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

export class TextToSpeech extends EventEmitter {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private options: SpeechOptions = {
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null
  };
  private voicesLoaded: boolean = false;
  private queue: string[] = [];
  private speaking: boolean = false;

  constructor(options?: SpeechOptions) {
    super();
    
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      
      // Initialize options
      if (options) {
        this.options = { ...this.options, ...options };
      }
      
      // Load voices
      this.loadVoices();
      
      // Set up voice changed event
      if (this.synth) {
        this.synth.onvoiceschanged = this.loadVoices.bind(this);
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    
    const availableVoices = this.synth.getVoices();
    
    if (availableVoices.length > 0) {
      this.voices = availableVoices;
      
      // Try to set a default voice (prefer English)
      if (!this.options.voice) {
        const englishVoice = this.voices.find(voice => 
          voice.lang.includes('en-') && voice.localService
        );
        this.options.voice = englishVoice || this.voices[0];
      }
      
      this.voicesLoaded = true;
      this.emit('voicesloaded', this.voices);
      
      console.log(`Loaded ${this.voices.length} voices for speech synthesis`);
    }
  }
  
  /**
   * Checks if voices have been loaded
   */
  public isVoicesLoaded(): boolean {
    return this.voicesLoaded;
  }
  
  /**
   * Get the list of available voices
   */
  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  /**
   * Set speech options
   */
  public setOptions(options: SpeechOptions): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Speak the provided text
   */
  public speak(text: string): void {
    if (!this.synth) {
      this.emit('error', new Error('Speech synthesis not supported'));
      return;
    }
    
    if (!this.voicesLoaded) {
      // Queue the text to speak later when voices are loaded
      this.queue.push(text);
      return;
    }
    
    // Clean up the text
    const cleanText = this.cleanText(text);
    
    if (cleanText.trim() === '') {
      this.emit('end');
      return;
    }
    
    // If already speaking, stop current speech
    if (this.speaking) {
      this.stop(); // Clear current speech and queue
    }
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure utterance
    utterance.rate = this.options.rate || 1;
    utterance.pitch = this.options.pitch || 1;
    utterance.volume = this.options.volume || 1;
    
    if (this.options.voice) {
      utterance.voice = this.options.voice;
    }
    
    // Set up events
    utterance.onstart = () => {
      this.speaking = true;
      this.emit('start');
    };
    
    utterance.onend = () => {
      this.speaking = false;
      this.currentUtterance = null;
      this.emit('end');
      
      // Process queue only if we have items and aren't manually stopped
      if (this.queue.length > 0) {
        // Add a small delay to prevent potential race conditions
        setTimeout(() => {
          this.processQueue();
        }, 100);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.speaking = false;
      this.currentUtterance = null;
      this.emit('error', event);
    };
    
    // Store reference and speak
    this.currentUtterance = utterance;
    
    try {
      // Cancel any previous speech synthesis
      this.synth.cancel();
      this.synth.speak(utterance);
    } catch (error) {
      console.error('Error starting speech:', error);
      this.speaking = false;
      this.currentUtterance = null;
      this.emit('error', error);
    }
  }
  
  private processQueue(): void {
    if (this.queue.length > 0) {
      const nextText = this.queue.shift();
      if (nextText) {
        this.speak(nextText);
      }
    }
  }
  
  /**
   * Stop speaking
   */
  public stop(): void {
    if (!this.synth) return;
    
    this.synth.cancel();
    this.queue = [];
    this.speaking = false;
    this.currentUtterance = null;
    this.emit('stop');
  }
  
  /**
   * Pause speaking
   */
  public pause(): void {
    if (!this.synth) return;
    
    this.synth.pause();
    this.emit('pause');
  }
  
  /**
   * Resume speaking
   */
  public resume(): void {
    if (!this.synth) return;
    
    this.synth.resume();
    this.emit('resume');
  }
  
  /**
   * Clean up text for speech synthesis
   */
  private cleanText(text: string): string {
    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // Replace common markdown syntax
    cleaned = cleaned.replace(/#{1,6}\s+/g, ''); // Headers
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*(.+?)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links
    cleaned = cleaned.replace(/`(.+?)`/g, '$1'); // Code
    
    // Replace special characters
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    
    // Fix spacing issues
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned.trim();
  }
} 