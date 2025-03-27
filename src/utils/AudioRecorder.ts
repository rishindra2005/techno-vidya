import EventEmitter from 'eventemitter3';

interface AudioRecorderOptions {
  sampleRate?: number;
  maxSeconds?: number;
  mimeType?: string;
}

interface AudioRecordingData {
  blob: Blob;
  arrayBuffer: ArrayBuffer;
  mimeType: string;
  duration: number;
}

export class AudioRecorder extends EventEmitter {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private maxSeconds: number;
  private mimeType: string;
  private analyzerFrameId: number | null = null;
  private dataArray: Uint8Array | null = null;
  private microphoneVolume: number = 0;
  private recordingTimeout: NodeJS.Timeout | null = null;

  constructor(options: AudioRecorderOptions = {}) {
    super();
    this.maxSeconds = options.maxSeconds || 15;
    this.mimeType = options.mimeType || 'audio/webm';
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Clean up the stream right away, we'll request it again when recording
      this.releaseStream(stream);
      
      return true;
    } catch (error) {
      console.error('Error requesting audio permission:', error);
      return false;
    }
  }

  async start(): Promise<boolean> {
    if (this.isRecording) return true;
    
    try {
      // Request audio stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      // Create audio context
      // Handle Safari's webkitAudioContext properly
      const AudioContextClass = window.AudioContext || 
                               (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Create analyzer for volume metering
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Create source from stream
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      
      // Create buffer for analyzer
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Start volume analysis
      this.startVolumeAnalysis();
      
      // Determine supported mimeType
      const mimeOptions = [
        this.mimeType,
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeOptions) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported media type found');
      }
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType,
      });
      
      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        // Create final blob
        const blob = new Blob(this.chunks, { type: selectedMimeType });
        const arrayBuffer = await blob.arrayBuffer();
        
        this.emit('recorded', {
          blob,
          arrayBuffer,
          mimeType: selectedMimeType,
          duration: (Date.now() - this.recordingStartTime) / 1000, // Duration in seconds
        } as AudioRecordingData);
        
        // Clear chunks for next recording
        this.chunks = [];
        this.isRecording = false;
        
        // Stop volume analysis
        this.stopVolumeAnalysis();
      };
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.emit('started');
      
      // Set timeout for max recording duration
      this.recordingTimeout = setTimeout(() => {
        this.stop();
      }, this.maxSeconds * 1000);
      
      return true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      this.cleanup();
      return false;
    }
  }

  stop(): void {
    if (!this.isRecording) return;
    
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    this.stopVolumeAnalysis();
    this.releaseStream(this.stream);
    this.stream = null;
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.mediaRecorder = null;
  }

  private releaseStream(stream: MediaStream | null): void {
    if (!stream) return;
    
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
  }

  private startVolumeAnalysis(): void {
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
      
      this.microphoneVolume = volume;
      this.emit('volume', volume);
      
      this.analyzerFrameId = requestAnimationFrame(analyzeFrame);
    };
    
    this.analyzerFrameId = requestAnimationFrame(analyzeFrame);
  }

  private stopVolumeAnalysis(): void {
    if (this.analyzerFrameId !== null) {
      cancelAnimationFrame(this.analyzerFrameId);
      this.analyzerFrameId = null;
    }
  }

  getVolume(): number {
    return this.microphoneVolume;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  setMaxDuration(seconds: number): void {
    this.maxSeconds = Math.max(1, seconds);
  }

  async convertToBase64(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1]; // Remove the data URL prefix
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  }
} 