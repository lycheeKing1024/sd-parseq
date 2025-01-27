import request from 'supertest';
import express from 'express';
import audioAnalysisRouter from '../audio-analysis';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/', audioAnalysisRouter);

describe('Audio Analysis API', () => {
  const testAudioPath = path.join(__dirname, 'fixtures', 'test.wav');
  
  beforeAll(() => {
    // Create test audio file with a 440Hz sine wave
    const sampleRate = 44100;
    const duration = 1; // 1 second
    const numSamples = sampleRate * duration;
    const audioData = new Float32Array(numSamples);
    
    // Generate a 440Hz sine wave
    for (let i = 0; i < numSamples; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
    
    // Create WAV file buffer
    const wavBuffer = Buffer.alloc(44 + numSamples * 2); // 44 bytes header + audio data
    
    // Write WAV header
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(36 + numSamples * 2, 4); // File size
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
    wavBuffer.writeUInt32LE(numSamples * 2, 40); // Data chunk size
    
    // Convert and write audio data
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.max(-32768, Math.min(32767, audioData[i] * 32767));
      wavBuffer.writeInt16LE(sample, 44 + i * 2);
    }

    // Ensure directories exist
    const uploadDir = '/tmp/parseq-uploads/';
    const fixturesDir = path.join(__dirname, 'fixtures');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.mkdirSync(fixturesDir, { recursive: true });
    
    // Write test WAV file
    fs.writeFileSync(testAudioPath, wavBuffer);
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
    }
  });

  describe('POST /analyze', () => {
    it('should analyze uploaded audio file', async () => {
      const response = await request(app)
        .post('/analyze')
        .attach('audio', testAudioPath)
        .field('method', 'default')
        .field('threshold', '1.1')
        .field('silence', '-70');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        bpm: expect.any(Number),
        confidence: expect.any(Number),
        onsets: expect.any(Array),
        pitches: expect.arrayContaining([
          expect.objectContaining({
            time: expect.any(Number),
            frequency: expect.any(Number)
          })
        ])
      });
      
      // For our 440Hz test tone:
      // - BPM should be close to 120 (from our mock)
      // - Confidence should be high (from our mock)
      // - Pitch should be close to 440Hz
      expect(response.body.confidence).toBe(0.95);
      expect(Math.abs(response.body.bpm - 120)).toBeLessThan(1); // Allow small floating point differences
      
      // Check pitch detection accuracy
      const pitches = response.body.pitches.filter(p => p.frequency > 0);
      expect(pitches.length).toBeGreaterThan(0); // We should always have pitches in our test
      const avgFreq = pitches.reduce((sum, p) => sum + p.frequency, 0) / pitches.length;
      expect(avgFreq).toBeCloseTo(440, -1); // Allow ±10% variance
      
      // Verify data types and ranges
      expect(response.body.bpm).toBeGreaterThanOrEqual(40);
      expect(response.body.bpm).toBeLessThanOrEqual(200);
      expect(response.body.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(response.body.onsets)).toBe(true);
      expect(Array.isArray(response.body.pitches)).toBe(true);
      
      // Verify timestamps are sequential
      const timestamps = response.body.pitches.map(p => p.time);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i-1]);
      }
    });

    it('should return 400 if no file is provided', async () => {
      const response = await request(app)
        .post('/analyze');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /analyze-url', () => {
    it('should analyze audio from URL', async () => {
      const response = await request(app)
        .post('/analyze-url')
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
        .post('/analyze-url')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
