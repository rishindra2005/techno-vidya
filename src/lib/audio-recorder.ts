import { audioContext } from "./utils";
import EventEmitter from "eventemitter3";
import { createWorketFromSrc } from "./audioworklet-registry";

// Simplified AudioRecording worklet implementation
const AudioRecordingWorklet = `
class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024; // 64ms buffer at 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const samples = input[0];
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.bufferIndex] = samples[i];
      this.bufferIndex++;

      if (this.bufferIndex >= this.bufferSize) {
        // Convert to Int16
        const int16Buffer = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          int16Buffer[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
        }

        // Send the buffer to the main thread
        this.port.postMessage({
          data: {
            int16arrayBuffer: int16Buffer.buffer
          }
        }, [int16Buffer.buffer]);

        // Reset buffer
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor('audio-recorder-worklet', AudioRecorderProcessor);
`;

// Volume meter worklet
const VolMeterWorklet = `
class VolumeMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.volume = 0;
    this.updateIntervalInMS = 100;
    this.nextUpdateFrame = this.updateIntervalInMS;
    this.intervalInFrames = this.updateIntervalInMS / 1000 * sampleRate;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    // Calculate the squared-sum.
    let sum = 0;
    for (let i = 0; i < input[0].length; i++) {
      sum += input[0][i] * input[0][i];
    }

    // Calculate the RMS and update the volume.
    const rms = Math.sqrt(sum / input[0].length);
    this.volume = Math.max(rms, this.volume * 0.95);

    this.nextUpdateFrame -= input[0].length;
    if (this.nextUpdateFrame < 0) {
      this.nextUpdateFrame += this.intervalInFrames;
      this.port.postMessage({ volume: this.volume });
    }

    return true;
  }
}

registerProcessor('vu-meter', VolumeMeterProcessor);
`;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder extends EventEmitter {
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 16000) {
    super();
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    this.starting = new Promise(async (resolve, reject) => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = await audioContext({ sampleRate: this.sampleRate });
        this.source = this.audioContext.createMediaStreamSource(this.stream);

        const workletName = "audio-recorder-worklet";
        const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

        await this.audioContext.audioWorklet.addModule(src);
        this.recordingWorklet = new AudioWorkletNode(
          this.audioContext,
          workletName,
        );

        this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
          // worklet processes recording floats and messages converted buffer
          const arrayBuffer = ev.data.data.int16arrayBuffer;

          if (arrayBuffer) {
            const arrayBufferString = arrayBufferToBase64(arrayBuffer);
            this.emit("data", arrayBufferString);
          }
        };
        this.source.connect(this.recordingWorklet);

        // vu meter worklet
        const vuWorkletName = "vu-meter";
        await this.audioContext.audioWorklet.addModule(
          createWorketFromSrc(vuWorkletName, VolMeterWorklet),
        );
        this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
        this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
          this.emit("volume", ev.data.volume);
        };

        this.source.connect(this.vuWorklet);
        this.recording = true;
        resolve();
      } catch (error) {
        reject(error);
      }
      this.starting = null;
    });
    
    return this.starting;
  }

  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
      this.recording = false;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
} 