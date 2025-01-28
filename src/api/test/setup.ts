import { jest } from '@jest/globals';

// Constants for audio analysis
// Audio analysis constants
const BUFFER_SIZE = 4096; // Used for WAV file generation and aubio processing
const HOP_SIZE = 256;     // Standard hop size for overlap-add processing
const SAMPLE_RATE = 44100; // CD-quality audio sample rate

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
    // Generate a 440Hz sine wave for testing
    this.data = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      this.data[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate);
    }
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
      length: SAMPLE_RATE, // 1 second of audio
      numberOfChannels: 1,
      sampleRate: SAMPLE_RATE
    }) as unknown as AudioBuffer;
  }
}

// Mock the global AudioContext and AudioBuffer
global.AudioContext = MockAudioContext as any;
global.AudioBuffer = MockAudioBuffer as any;

// Mock aubiojs module with realistic behavior
jest.mock('aubiojs', () => ({
  __esModule: true,
  default: () => Promise.resolve({
    Tempo: jest.fn().mockImplementation(() => {
      let currentTime = 0;
      return {
        do: jest.fn().mockImplementation((buffer: Float32Array) => {
          currentTime += buffer.length / SAMPLE_RATE;
          // Simulate finding a beat every 0.5 seconds (120 BPM)
          return currentTime % 0.5 < HOP_SIZE / SAMPLE_RATE;
        }),
        getBpm: jest.fn().mockReturnValue(120),
        getConfidence: jest.fn().mockReturnValue(0.95)
      };
    }),
    Onset: jest.fn().mockImplementation(() => {
      let currentTime = 0;
      return {
        do: jest.fn().mockImplementation((buffer: Float32Array) => {
          currentTime += buffer.length / SAMPLE_RATE;
          // Simulate finding an onset every 0.25 seconds
          return currentTime % 0.25 < HOP_SIZE / SAMPLE_RATE;
        }),
        setThreshold: jest.fn(),
        setSilence: jest.fn()
      };
    }),
    Pitch: jest.fn().mockImplementation(() => ({
      do: jest.fn().mockImplementation((buffer: Float32Array) => {
        // Return 440Hz for our test sine wave
        return 440;
      })
    }))
  })
}));

// Mock multer middleware with proper file handling
const mockMulter = jest.fn().mockImplementation(() => ({
  single: jest.fn().mockImplementation((fieldName: string) => (req: any, res: any, next: any) => {
    const fs = require('fs');
    const uploadDir = '/tmp/parseq-uploads';
    fs.mkdirSync(uploadDir, { recursive: true });

    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const testFile = '/tmp/parseq-uploads/test.wav';
      
      // Create a test WAV file with actual audio data
      const numSamples = SAMPLE_RATE; // 1 second
      const headerSize = 44;
      const dataSize = numSamples * 2; // 16-bit samples
      const fileSize = headerSize + dataSize;
      
      const buffer = Buffer.alloc(fileSize);
      
      // WAV header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(fileSize - 8, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20);
      buffer.writeUInt16LE(1, 22);
      buffer.writeUInt32LE(SAMPLE_RATE, 24);
      buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(dataSize, 40);
      
      // Write 440Hz sine wave data
      for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin(2 * Math.PI * 440 * i / SAMPLE_RATE) * 32767;
        buffer.writeInt16LE(Math.floor(sample), headerSize + i * 2);
      }
      
      fs.writeFileSync(testFile, buffer);

      req.file = {
        fieldname: fieldName,
        originalname: 'test.wav',
        encoding: '7bit',
        mimetype: 'audio/wav',
        destination: uploadDir,
        filename: 'test.wav',
        path: testFile,
        size: fileSize
      };
    }
    next();
  })
}));

mockMulter.diskStorage = jest.fn().mockImplementation(() => ({
  destination: (req: any, file: any, cb: any) => cb(null, '/tmp/parseq-uploads'),
  filename: (req: any, file: any, cb: any) => cb(null, file.originalname)
}));

jest.mock('multer', () => mockMulter);

// Mock fs module with proper file handling
const mockFs = {
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn().mockImplementation((path) => {
      if (path.includes('test.wav')) {
        // Return the actual WAV file buffer
        const numSamples = SAMPLE_RATE;
        const buffer = Buffer.alloc(44 + numSamples * 2);
        // WAV header (same as above)
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + numSamples * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);
        buffer.writeUInt16LE(1, 20);
        buffer.writeUInt16LE(1, 22);
        buffer.writeUInt32LE(SAMPLE_RATE, 24);
        buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
        buffer.writeUInt16LE(2, 32);
        buffer.writeUInt16LE(16, 34);
        buffer.write('data', 36);
        buffer.writeUInt32LE(numSamples * 2, 40);
        // Audio data
        for (let i = 0; i < numSamples; i++) {
          const sample = Math.sin(2 * Math.PI * 440 * i / SAMPLE_RATE) * 32767;
          buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
        }
        return Promise.resolve(buffer);
      }
      return Promise.resolve(Buffer.from('test'));
    }),
    unlink: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
};

jest.mock('fs', () => mockFs);
