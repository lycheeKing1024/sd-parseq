import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import audioAnalysisRouter from '../audio-analysis';
import fs from 'fs';
import path from 'path';

const app = express();
app.use('/api', audioAnalysisRouter);

describe('Audio Analysis API', () => {
  const testAudioPath = path.join(__dirname, 'test.wav');
  
  beforeAll(async () => {
    // Create a simple test WAV file using Web Audio API
    const sampleRate = 44100;
    const duration = 2; // 2 seconds
    const numSamples = sampleRate * duration;
    const audioData = new Float32Array(numSamples);
    
    // Generate a 440Hz sine wave
    for (let i = 0; i < numSamples; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
    
    // Create WAV file header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples * 2, true); // Chunk size
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // "fmt " sub-chunk
    view.setUint32(12, 0x666D7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, 1, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples * 2, true); // Subchunk2Size
    
    // Convert audio data to 16-bit PCM
    const pcmData = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      pcmData[i] = Math.floor(audioData[i] * 32767);
    }
    
    // Write WAV file
    const buffer = Buffer.concat([
      Buffer.from(header),
      Buffer.from(pcmData.buffer)
    ]);
    fs.writeFileSync(testAudioPath, buffer);
  });
  
  test('POST /api/analyze should analyze uploaded audio file', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach('audio', testAudioPath)
      .expect(200);
      
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
    
    // Since we generated a 440Hz tone, we should see frequencies around 440Hz
    const avgFreq = response.body.pitches.reduce((sum, p) => sum + p.frequency, 0) / response.body.pitches.length;
    expect(avgFreq).toBeGreaterThan(400);
    expect(avgFreq).toBeLessThan(480);
  });
  
  test('POST /api/analyze-url should analyze audio from URL', async () => {
    // Convert local file to data URL for testing
    const audioBuffer = fs.readFileSync(testAudioPath);
    const dataUrl = `data:audio/wav;base64,${audioBuffer.toString('base64')}`;
    
    const response = await request(app)
      .post('/api/analyze-url')
      .send({ url: dataUrl })
      .expect(200);
      
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
  });
  
  test('POST /api/analyze should reject invalid file types', async () => {
    // Create a fake MP4 file
    const fakeMP4Path = path.join(__dirname, 'fake.mp4');
    fs.writeFileSync(fakeMP4Path, Buffer.from('Not a real MP4 file'));
    
    await request(app)
      .post('/api/analyze')
      .attach('audio', fakeMP4Path)
      .expect(400);
      
    fs.unlinkSync(fakeMP4Path);
  });
  
  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
    }
  });
});
