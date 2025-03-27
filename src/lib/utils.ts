export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function blobToJSON(blob: Blob): Promise<any> {
  const text = await blob.text();
  return JSON.parse(text);
}

type AudioContextOptions = {
  id?: string;
  sampleRate?: number;
};

export async function audioContext({
  id = "default",
  sampleRate = 48000,
}: AudioContextOptions = {}): Promise<AudioContext> {
  let context: AudioContext;
  if (window.AudioContext) {
    context = new window.AudioContext({ sampleRate });
  } else if ((window as any).webkitAudioContext) {
    context = new (window as any).webkitAudioContext({ sampleRate });
  } else {
    throw new Error("AudioContext not supported in this browser");
  }

  // Make sure the context is running (autoplay policy might suspend it)
  if (context.state === "suspended") {
    await context.resume();
  }

  return context;
} 