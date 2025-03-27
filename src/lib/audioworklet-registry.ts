export const registeredWorklets = new Map<
  AudioContext,
  {
    [key: string]: {
      node?: AudioWorkletNode;
      handlers: ((d: any) => void)[];
    };
  }
>();

export function createWorketFromSrc(workletName: string, src: string): string {
  const dataUrl = URL.createObjectURL(
    new Blob([src], { type: "application/javascript" })
  );
  return dataUrl;
} 