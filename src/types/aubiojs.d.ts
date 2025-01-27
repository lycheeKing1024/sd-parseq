declare module 'aubiojs' {
  interface Aubio {
    Tempo: {
      new(bufferSize: number, hopSize: number, sampleRate: number): {
        do(buffer: Float32Array): boolean;
        getBpm(): number;
        getConfidence(): number;
      };
    };
    Onset: {
      new(bufferSize: number, hopSize: number, sampleRate: number): {
        do(buffer: Float32Array): boolean;
        setThreshold(threshold: number): void;
        setSilence(silence: number): void;
      };
    };
    Pitch: {
      new(method: string, bufferSize: number, hopSize: number, sampleRate: number): {
        do(buffer: Float32Array): number;
      };
    };
  }

  function aubiojs(): Promise<Aubio>;
  export default aubiojs;
}
