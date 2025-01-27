// Mock aubiojs
const mockAubiojs = {
  Tempo: jest.fn().mockImplementation(() => ({
    do: jest.fn().mockReturnValue(true),
    getBpm: jest.fn().mockReturnValue(120),
    getConfidence: jest.fn().mockReturnValue(0.8)
  })),
  Onset: jest.fn().mockImplementation(() => ({
    do: jest.fn().mockReturnValue(true),
    setThreshold: jest.fn(),
    setSilence: jest.fn()
  })),
  Pitch: jest.fn().mockImplementation(() => ({
    do: jest.fn().mockReturnValue(440)
  }))
};

jest.mock('aubiojs', () => mockAubiojs);

// Mock AudioContext and related Web Audio API interfaces
class MockAudioBuffer {
  private sampleRate: number;
  private length: number;
  private numberOfChannels: number;
  private data: Float32Array;

  constructor(options: { length: number; numberOfChannels: number; sampleRate: number }) {
    this.length = options.length;
    this.numberOfChannels = options.numberOfChannels;
    this.sampleRate = options.sampleRate;
    this.data = new Float32Array(this.length);
  }

  getChannelData(channel: number): Float32Array {
    if (channel >= this.numberOfChannels) {
      throw new Error('Channel index out of bounds');
    }
    return this.data;
  }

  get duration(): number {
    return this.length / this.sampleRate;
  }
}

class MockAudioContext {
  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new MockAudioBuffer({
      length: 44100,
      numberOfChannels: 2,
      sampleRate: 44100
    }) as unknown as AudioBuffer;
  }
}

// Mock the global AudioContext and AudioBuffer
global.AudioContext = MockAudioContext as any;
global.AudioBuffer = MockAudioBuffer as any;

// Mock the fetch API for URL-based audio analysis
global.fetch = jest.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(44100 * 4)), // 1 second of stereo audio
    ok: true,
    status: 200
  } as Response)
);
