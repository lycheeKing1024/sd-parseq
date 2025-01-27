declare module 'aubiojs' {
  export class Tempo {
    constructor(bufferSize: number, hopSize: number, sampleRate: number);
    do(buffer: Float32Array): boolean;
    getBpm(): number;
    getConfidence(): number;
  }

  export class Onset {
    constructor(method: string, bufferSize: number, hopSize: number, sampleRate: number);
    do(buffer: Float32Array): boolean;
    setThreshold(threshold: number): void;
    setSilence(silence: number): void;
  }

  export class Pitch {
    constructor(method: string, bufferSize: number, hopSize: number, sampleRate: number);
    do(buffer: Float32Array): number;
  }
}
