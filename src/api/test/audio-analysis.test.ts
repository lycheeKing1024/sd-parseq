import request from 'supertest';
import express from 'express';
import audioAnalysisRouter from '../audio-analysis';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/audio', audioAnalysisRouter);

describe('Audio Analysis API', () => {
  const testAudioPath = path.join(__dirname, 'fixtures', 'test.wav');
  
  beforeAll(() => {
    // Create test audio file directory
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    // Create a simple test WAV file if it doesn't exist
    if (!fs.existsSync(testAudioPath)) {
      const sampleRate = 44100;
      const duration = 1; // 1 second
      const numSamples = sampleRate * duration;
      const audioData = new Float32Array(numSamples);
      
      // Generate a 440Hz sine wave
      for (let i = 0; i < numSamples; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      
      // Write WAV file header and data
      const header = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // File size - 8
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Chunk size
        0x01, 0x00,             // Audio format (1 = PCM)
        0x01, 0x00,             // Number of channels
        0x44, 0xAC, 0x00, 0x00, // Sample rate
        0x88, 0x58, 0x01, 0x00, // Byte rate
        0x02, 0x00,             // Block align
        0x10, 0x00,             // Bits per sample
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00  // Data chunk size
      ]);
      
      // Convert Float32Array to Int16Array for WAV format
      const int16Data = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        // Convert Float32 [-1,1] to Int16 [-32768,32767]
        int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32767));
      }

      // Create WAV file buffer
      const wavBuffer = Buffer.alloc(44 + int16Data.length * 2); // 44 bytes header + audio data
      
      // Write WAV header
      wavBuffer.write('RIFF', 0);
      wavBuffer.writeUInt32LE(36 + int16Data.length * 2, 4); // File size
      wavBuffer.write('WAVE', 8);
      wavBuffer.write('fmt ', 12);
      wavBuffer.writeUInt32LE(16, 16); // Format chunk size
      wavBuffer.writeUInt16LE(1, 20); // Audio format (PCM)
      wavBuffer.writeUInt16LE(1, 22); // Number of channels
      wavBuffer.writeUInt32LE(sampleRate, 24); // Sample rate
      wavBuffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
      wavBuffer.writeUInt16LE(2, 32); // Block align
      wavBuffer.writeUInt16LE(16, 34); // Bits per sample
      wavBuffer.write('data', 36);
      wavBuffer.writeUInt32LE(int16Data.length * 2, 40); // Data chunk size
      
      // Write audio data
      for (let i = 0; i < int16Data.length; i++) {
        wavBuffer.writeInt16LE(int16Data[i], 44 + i * 2);
      }

      fs.writeFileSync(testAudioPath, Buffer.from(wavBuffer));
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
    }
  });

  describe('POST /api/audio/analyze', () => {
    it('should analyze uploaded audio file', async () => {
      const response = await request(app)
        .post('/api/audio/analyze')
        .attach('audio', testAudioPath, {
          contentType: 'audio/wav'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bpm');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('onsets');
      expect(response.body).toHaveProperty('pitches');
      
      expect(Array.isArray(response.body.onsets)).toBe(true);
      expect(Array.isArray(response.body.pitches)).toBe(true);
    });

    it('should return 400 if no file is provided', async () => {
      const response = await request(app)
        .post('/api/audio/analyze');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/audio/analyze-url', () => {
    it('should analyze audio from URL', async () => {
      const response = await request(app)
        .post('/api/audio/analyze-url')
        .send({
          url: 'http://example.com/test.wav'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bpm');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('onsets');
      expect(response.body).toHaveProperty('pitches');
    });

    it('should return 400 if no URL is provided', async () => {
      const response = await request(app)
        .post('/api/audio/analyze-url')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
