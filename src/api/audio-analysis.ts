import express from 'express';
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import aubiojs from 'aubiojs';
import path from 'path';

const router = Router();
const upload = multer({ 
  dest: '/tmp/parseq-uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WAV, MP3 and OGG files are allowed.'));
    }
  }
});

interface AudioAnalysisResponse {
  bpm: number;
  confidence: number;
  onsets: number[];
  pitches: Array<{ time: number; frequency: number }>;
}

async function runTempoAnalysis(audioBuffer: AudioBuffer): Promise<{ bpm: number; confidence: number }> {
  const bufferSize = 4096;
  const hopSize = 256;
  const aubio = await aubiojs();
  const tempo = new aubio.Tempo(bufferSize, hopSize, audioBuffer.sampleRate);
  
  let totalBpm = 0;
  let totalConfidence = 0;
  let count = 0;
  
  const channelData = audioBuffer.getChannelData(0);
  let startPos = 0;
  
  while (startPos + hopSize <= channelData.length) {
    const endPos = startPos + hopSize;
    const retval = tempo.do(channelData.subarray(startPos, endPos));
    const bpm = tempo.getBpm();
    // Apply the same fudge factor as in analysisWorker-tempo.ts
    const fudgedBpm = bpm * (1 - (bpm / 95 / 100) * (hopSize / 512));
    const confidence = tempo.getConfidence();
    
    if (retval) {
      totalBpm += fudgedBpm;
      totalConfidence += confidence;
      count++;
    }
    startPos += hopSize;
  }
  
  return {
    bpm: totalBpm / count,
    confidence: totalConfidence / count
  };
}

async function analyzeOnsets(audioBuffer: AudioBuffer, method: string = "default", threshold: number = 1.1, silence: number = -70): Promise<number[]> {
  const onsets: number[] = [];
  const bufferSize = 4096;
  const hopSize = 256;
  
  const aubio = await aubiojs();
  const onsetDetector = new aubio.Onset(
    bufferSize,
    hopSize,
    audioBuffer.sampleRate
  );
  
  onsetDetector.setThreshold(threshold);
  onsetDetector.setSilence(silence);
  
  const channelData = audioBuffer.getChannelData(0);
  let startPos = 0;
  
  while (startPos + hopSize <= channelData.length) {
    const endPos = startPos + hopSize;
    const retval = onsetDetector.do(channelData.subarray(startPos, endPos));
    if (retval) {
      const onsetTime = startPos / audioBuffer.sampleRate;
      onsets.push(onsetTime);
    }
    startPos += hopSize;
  }
  
  return onsets;
}

async function analyzePitch(audioBuffer: AudioBuffer): Promise<Array<{ time: number; frequency: number }>> {
  const pitches: Array<{ time: number; frequency: number }> = [];
  const bufferSize = 4096;
  const hopSize = 256;
  
  const aubio = await aubiojs();
  const pitchDetector = new aubio.Pitch(
    "default",
    bufferSize,
    hopSize,
    audioBuffer.sampleRate
  );
  
  const channelData = audioBuffer.getChannelData(0);
  let startPos = 0;
  
  while (startPos + hopSize <= channelData.length) {
    const endPos = startPos + hopSize;
    const frequency = pitchDetector.do(channelData.subarray(startPos, endPos));
    if (frequency !== 0) { // Filter out silence/noise
      pitches.push({
        time: startPos / audioBuffer.sampleRate,
        frequency: frequency
      });
    }
    startPos += hopSize;
  }
  
  return pitches;
}

router.post('/analyze', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioContext = new AudioContext();
    const fileBuffer = await fs.promises.readFile(req.file.path);
    const arrayBuffer = new Uint8Array(fileBuffer).buffer;
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const method = req.body?.method || "default";
    const threshold = parseFloat(req.body?.threshold || "1.1");
    const silence = parseFloat(req.body?.silence || "-70");

    const [tempoResult, onsets, pitches] = await Promise.all([
      runTempoAnalysis(audioBuffer),
      analyzeOnsets(audioBuffer, method, threshold, silence),
      analyzePitch(audioBuffer)
    ]);

    // Clean up temp file
    await fs.promises.unlink(req.file.path);

    const response: AudioAnalysisResponse = {
      bpm: tempoResult.bpm,
      confidence: tempoResult.confidence,
      onsets,
      pitches
    };

    res.json(response);
  } catch (error) {
    console.error('Error analyzing audio:', error);
    res.status(500).json({ error: 'Failed to analyze audio' });
  }
});

router.post('/analyze-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'No audio URL provided' });
    }

    // Download the file
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    // Save to temp file
    const tempPath = path.join('/tmp/parseq-uploads', `${Date.now()}.wav`);
    await fs.promises.writeFile(tempPath, Buffer.from(buffer));

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(buffer);

    const method = req.body?.method || "default";
    const threshold = parseFloat(req.body?.threshold || "1.1");
    const silence = parseFloat(req.body?.silence || "-70");

    const [tempoResult, onsets, pitches] = await Promise.all([
      runTempoAnalysis(audioBuffer),
      analyzeOnsets(audioBuffer, method, threshold, silence),
      analyzePitch(audioBuffer)
    ]);

    // Clean up temp file
    await fs.promises.unlink(tempPath);

    const result: AudioAnalysisResponse = {
      bpm: tempoResult.bpm,
      confidence: tempoResult.confidence,
      onsets,
      pitches
    };

    res.json(result);
  } catch (error) {
    console.error('Error analyzing audio from URL:', error);
    res.status(500).json({ error: 'Failed to analyze audio from URL' });
  }
});

export default router;
