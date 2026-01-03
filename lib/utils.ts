import FFT from "fft.js";

export function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

// Configuration for CAM++ (Standard Kaldi/WeSpeaker setup)
const SAMPLE_RATE = 16000;
const FRAME_LENGTH = 0.025; // 25ms
const FRAME_STEP = 0.01; // 10ms
const N_FFT = 512;
const N_MELS = 80;
const PRE_EMPHASIS = 0.97;

export function computeFbank(waveform: Float32Array): Float32Array {
  // 1. Pre-emphasis
  const signal = new Float32Array(waveform.length);
  signal[0] = waveform[0];
  for (let i = 1; i < waveform.length; i++) {
    signal[i] = waveform[i] - PRE_EMPHASIS * waveform[i - 1];
  }

  // 2. Framing
  const frameLen = Math.floor(FRAME_LENGTH * SAMPLE_RATE); // 400
  const frameStep = Math.floor(FRAME_STEP * SAMPLE_RATE); // 160
  const numFrames = Math.floor((signal.length - frameLen) / frameStep) + 1;

  if (numFrames <= 0) return new Float32Array(0);

  // 3. Windowing (Povey/Kaldi uses Hanning)
  const window = new Float32Array(frameLen);
  for (let i = 0; i < frameLen; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frameLen - 1));
  }

  // 4. FFT Setup
  const f = new FFT(N_FFT);
  const fftOut = f.createComplexArray();
  const magnitudes = new Float32Array(N_FFT / 2 + 1);

  // 5. Mel Filterbank Construction (Simplified 80-bin)
  // In a real app, you might compute this once and cache it.
  const melFilters = createMelFilterbank(SAMPLE_RATE, N_FFT, N_MELS);

  // Output Buffer: [Batch=1, Frames, 80] flattened
  const features = new Float32Array(numFrames * N_MELS);

  for (let i = 0; i < numFrames; i++) {
    const start = i * frameStep;
    const frame = new Float32Array(N_FFT).fill(0); // Pad with zeros

    // Apply Window
    for (let j = 0; j < frameLen; j++) {
      frame[j] = signal[start + j] * window[j];
    }

    // Compute FFT
    f.toComplexArray(frame, fftOut);
    f.transform(fftOut, fftOut);

    // Compute Power Spectrum
    for (let j = 0; j <= N_FFT / 2; j++) {
      const re = fftOut[2 * j];
      const im = fftOut[2 * j + 1];
      magnitudes[j] = re * re + im * im; // Power
    }

    // Apply Mel Filters & Log
    for (let j = 0; j < N_MELS; j++) {
      let energy = 0;
      for (let k = 0; k < magnitudes.length; k++) {
        energy += magnitudes[k] * melFilters[j][k];
      }
      // Log energy with floor (Kaldi style)
      features[i * N_MELS + j] = Math.log(Math.max(energy, 1.1920929e-7));
    }
  }

  // Mean Normalization (CMS) - Important for CAM++
  // Compute mean per dimension
  for (let j = 0; j < N_MELS; j++) {
    let sum = 0;
    for (let i = 0; i < numFrames; i++) sum += features[i * N_MELS + j];
    const mean = sum / numFrames;
    for (let i = 0; i < numFrames; i++) features[i * N_MELS + j] -= mean;
  }

  return features;
}

// --- Helper: Create Mel Filterbank Matrix ---
function createMelFilterbank(sampleRate: number, nFft: number, nMels: number) {
  const fMin = 20;
  const fMax = sampleRate / 2;
  const melMin = 1125 * Math.log(1 + fMin / 700);
  const melMax = 1125 * Math.log(1 + fMax / 700);
  const melPoints = new Float32Array(nMels + 2);

  for (let i = 0; i < nMels + 2; i++) {
    melPoints[i] = melMin + (i * (melMax - melMin)) / (nMels + 1);
  }

  const hzPoints = melPoints.map((m) => 700 * (Math.exp(m / 1125) - 1));
  const binPoints = hzPoints.map((h) =>
    Math.floor(((N_FFT + 1) * h) / sampleRate),
  );

  const filters = Array(nMels)
    .fill(0)
    .map(() => new Float32Array(nFft / 2 + 1).fill(0));

  for (let i = 1; i <= nMels; i++) {
    const start = binPoints[i - 1];
    const center = binPoints[i];
    const end = binPoints[i + 1];

    for (let j = start; j < center; j++) {
      filters[i - 1][j] = (j - start) / (center - start);
    }
    for (let j = center; j < end; j++) {
      filters[i - 1][j] = (end - j) / (end - center);
    }
  }
  return filters;
}
