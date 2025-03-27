import EventEmitter from 'eventemitter3';

interface AudioStreamerOptions {
  sampleRate?: number;
  channels?: number;
  volume?: number;
}

export class AudioStreamer extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private mediaSource: MediaSource | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private volume: number = 1.0;
  private sampleRate: number;
  private channels: number;
  private dataArray: Uint8Array | null = null;
  private analyzerFrameId: number | null = null;

  constructor(options: AudioStreamerOptions = {}) {
    super();
    this.sampleRate = options.sampleRate || 16000;
    this.channels = options.channels || 1;
    this.volume = options.volume !== undefined ? options.volume : 1.0;
    
    // Initialize audio context if available
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      // Only initialize in browser environment
      if (typeof window !== 'undefined' && window.AudioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.volume;
        this.gainNode.connect(this.audioContext.destination);
        
        // Create analyzer node for volume metering
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.connect(this.gainNode);
        
        // Create buffer for analyzer
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        // Start analyzing audio levels
        this.startAnalyzer();
      }
    } catch (error) {
      console.error('Error initializing AudioContext:', error);
    }
  }

  private startAnalyzer(): void {
    if (!this.analyser || !this.dataArray) return;
    
    const analyzeFrame = () => {
      if (!this.analyser || !this.dataArray) return;
      
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate volume level (0-100)
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const average = sum / this.dataArray.length;
      const volume = Math.min(100, Math.round((average / 256) * 100));
      
      this.emit('volume', volume);
      
      this.analyzerFrameId = requestAnimationFrame(analyzeFrame);
    };
    
    this.analyzerFrameId = requestAnimationFrame(analyzeFrame);
  }

  private stopAnalyzer(): void {
    if (this.analyzerFrameId !== null) {
      cancelAnimationFrame(this.analyzerFrameId);
      this.analyzerFrameId = null;
    }
  }
  
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  async enqueue(audioData: ArrayBuffer): Promise<void> {
    this.audioQueue.push(audioData);
    
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.emit('ended');
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift();
    
    if (!audioData) {
      this.isPlaying = false;
      return;
    }

    try {
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      
      // Create source node
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = audioBuffer;
      
      // Connect to analyzer for volume metering
      this.sourceNode.connect(this.analyser!);
      
      // Set up ended callback to play next in queue
      this.sourceNode.onended = () => {
        this.playNext();
      };
      
      // Start playback
      this.sourceNode.start();
      this.emit('playing');
    } catch (_) {
      console.error('Error playing audio:');
      this.playNext(); // Try next item in queue
    }
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (_) {
        // Ignore errors when stopping
      }
      this.sourceNode = null;
    }
    
    // Clear queue
    this.audioQueue = [];
    this.isPlaying = false;
  }

  pause(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
      this.emit('paused');
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
      this.emit('resumed');
    }
  }

  destroy(): void {
    this.stop();
    this.stopAnalyzer();
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
} 